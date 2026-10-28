-- ==============================================================================
-- BRASA CAIPIRA â€” SCHEMA COMPLETO E IDEMPOTENTE DO BANCO DE DADOS (SUPABASE)
-- Fuso HorÃ¡rio Oficial: America/Sao_Paulo
-- Moeda: Valores monetÃ¡rios em centavos (INTEGER)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS COM PROTEÃ‡ÃƒO CONTRA DUPLICIDADE
DO $$ BEGIN
    CREATE TYPE product_type_enum AS ENUM ('commercial', 'addon', 'historical_recipe', 'future_idea');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_status_enum AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_status_enum AS ENUM ('in_stock', 'out_of_stock', 'pre_order_only');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_type_enum AS ENUM ('delivery', 'takeout');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM (
        'checkout_started',
        'awaiting_whatsapp_dispatch',
        'received_confirmed',
        'in_preparation',
        'ready_for_pickup_or_delivery',
        'completed',
        'canceled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    ingredients TEXT,
    product_type product_type_enum NOT NULL DEFAULT 'commercial',
    base_price_cents INTEGER CHECK (base_price_cents IS NULL OR base_price_cents >= 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'unidade',
    image_url TEXT,
    status product_status_enum NOT NULL DEFAULT 'draft',
    availability_status availability_status_enum NOT NULL DEFAULT 'in_stock',
    available_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    is_time_restricted BOOLEAN NOT NULL DEFAULT true,
    special_notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE VARIAÃ‡Ã•ES DIRETAS
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    availability_status availability_status_enum NOT NULL DEFAULT 'in_stock',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE FOTOS DO PRODUTO (SUPABASE STORAGE)
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    alt_text TEXT,
    width INT,
    height INT,
    file_size_bytes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CONFIGURAÃ‡Ã•ES DA LOJA E SINCRONIZAÃ‡ÃƒO GERAL
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(100) NOT NULL DEFAULT 'BRASA CAIPIRA',
    slogan VARCHAR(150) NOT NULL DEFAULT 'O verdadeiro sabor da brasa.',
    whatsapp_number VARCHAR(20) NOT NULL DEFAULT '5519998107666',
    address TEXT NOT NULL DEFAULT 'Rua dos Crisantemos, 350 â€” Jardim Nova Leme â€” Leme/SP',
    reference TEXT NOT NULL DEFAULT 'Em frente ao Mercado do Angu',
    instagram VARCHAR(50) NOT NULL DEFAULT '@brasa.caipira',
    is_store_open BOOLEAN NOT NULL DEFAULT true,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    order_type VARCHAR(20) NOT NULL DEFAULT 'delivery',
    neighborhood_name VARCHAR(100),
    street VARCHAR(150),
    number VARCHAR(20),
    complement VARCHAR(50),
    reference TEXT,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'pix',
    change_for_cents INTEGER,
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'aguardando_confirmacao',
    items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. POLÃTICAS DE ACESSO (RLS PERMISSIVAS PARA OPERAÃ‡ÃƒO DO APP)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao_Total_Categorias" ON categories;
CREATE POLICY "Permissao_Total_Categorias" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao_Total_Produtos" ON products;
CREATE POLICY "Permissao_Total_Produtos" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao_Total_Variacoes" ON product_variants;
CREATE POLICY "Permissao_Total_Variacoes" ON product_variants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao_Total_Fotos" ON product_images;
CREATE POLICY "Permissao_Total_Fotos" ON product_images FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao_Total_Configuracoes" ON store_settings;
CREATE POLICY "Permissao_Total_Configuracoes" ON store_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao_Total_Pedidos" ON orders;
CREATE POLICY "Permissao_Total_Pedidos" ON orders FOR ALL USING (true) WITH CHECK (true);

-- 9. CONFIGURAÃ‡ÃƒO DO BUCKET DE FOTOS (product-images - atÃ© 10MB para fotos de cÃ¢mera)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];

DROP POLICY IF EXISTS "Storage_Leitura_Publica" ON storage.objects;
CREATE POLICY "Storage_Leitura_Publica" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Storage_Upload_Publico" ON storage.objects;
CREATE POLICY "Storage_Upload_Publico" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Storage_Atualizacao_Publica" ON storage.objects;
CREATE POLICY "Storage_Atualizacao_Publica" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Storage_Exclusao_Publica" ON storage.objects;
CREATE POLICY "Storage_Exclusao_Publica" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
-- ==============================================================================
-- BRASA CAIPIRA â€” SEED INICIAL IDEMPOTENTE DO CATÃLOGO COMPLETO (87 REGISTROS)
-- PreservaÃ§Ã£o integral dos cÃ³digos originais (BC-001 a BC-087)
-- NENHUM PRODUTO Ã‰ PUBLICADO AUTOMATICAMENTE (status = 'draft')
-- ==============================================================================

-- 1. InserÃ§Ã£o das 17 Categorias
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-01', 'Espetinhos', 'espetinhos', true, 1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-02', 'Espetinhos especiais', 'espetinhos-especiais', true, 2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-03', 'X-Espeto', 'x-espeto', true, 3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-04', 'Salgados', 'salgados', true, 4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-05', 'Doces', 'doces', true, 5) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-06', 'Bebidas', 'bebidas', true, 6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-07', 'Bebidas alcoÃ³licas', 'bebidas-alcoolicas', true, 7) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-08', 'PorÃ§Ãµes quentes', 'porces-quentes', true, 8) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-09', 'PorÃ§Ãµes frias', 'porces-frias', true, 9) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-10', 'Assados', 'assados', true, 10) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-11', 'Massas', 'massas', true, 11) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-12', 'Pizzas', 'pizzas', true, 12) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-13', 'Churrasco Grego â€“ SÃ¡bado', 'churrasco-grego---sbado', true, 13) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-14', 'Churrasco Grego â€“ Quinta', 'churrasco-grego---quinta', true, 14) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-15', 'Grego â€“ receitas histÃ³ricas', 'grego---receitas-historicas', true, 15) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-16', 'Acompanhamentos e adicionais', 'acompanhamentos-e-adicionais', true, 16) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-17', 'Ideias futuras â€“ nÃ£o publicar', 'ideias-futuras---nao-publicar', true, 17) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 2. InserÃ§Ã£o dos 87 Itens Originais do InventÃ¡rio

INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-001',
    'Espetinho bovino',
    'Espetinho preparado na brasa',
    'Carne bovina',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    1
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-002',
    'Espetinho de linguiÃ§a',
    'Espetinho preparado na brasa',
    'LinguiÃ§a; confirmar tipo',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    2
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-003',
    'Espetinho de coraÃ§Ã£o',
    'Espetinho preparado na brasa',
    'CoraÃ§Ã£o de frango',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    3
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-004',
    'Espetinho de queijo coalho',
    'Espetinho preparado na brasa',
    'Queijo coalho',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    4
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-005',
    'Kafta com queijo',
    'Espetinho preparado na brasa',
    'Kafta recheada com queijo',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    5
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-006',
    'Kafta com queijo e bacon',
    'Espetinho preparado na brasa',
    'Kafta; queijo; bacon',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    6
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-007',
    'MedalhÃ£o de frango',
    'Espetinho preparado na brasa',
    'Frango envolto em bacon; confirmar montagem',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    7
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-008',
    'MedalhÃ£o de quiabo',
    'Espetinho preparado na brasa',
    'Quiabo; confirmar montagem',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    8
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-009',
    'Espetinho suÃ­no',
    'Espetinho preparado na brasa',
    'Carne suÃ­na',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    9
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-010',
    'Espetinho de fraldinha Extra Grill',
    'Espetinho preparado na brasa',
    'Fraldinha Extra Grill',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    10
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-011',
    'Espetinho de bacon defumado',
    'Espetinho preparado na brasa',
    'Bacon defumado; confirmar apresentaÃ§Ã£o',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico / conferir ativo. Obs:',
    11
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-02'),
    'BC-012',
    'Espeto Cremoso',
    'Espeto com montagem cremosa e complementos',
    'Espetinho-base; requeijÃ£o gratinado; pimenta biquinho; picles de pepino; geleia de pimenta biquinho; molhos',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Montagem especial; base e valor dos adicionais configurÃ¡veis',
    12
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-03'),
    'BC-013',
    'X-Espeto Simples',
    'Lanche de espetinho com vinagrete',
    'Espetinho; pÃ£o; vinagrete',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    13
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-03'),
    'BC-014',
    'X-Espeto Salada',
    'VersÃ£o com folhas e picles',
    'Espetinho; pÃ£o; vinagrete; rÃºcula ou alface; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    14
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-03'),
    'BC-015',
    'X-Espeto Especial',
    'VersÃ£o especial crocante',
    'Espetinho; pÃ£o; vinagrete; rÃºcula; picles; Doritos',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    15
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-04'),
    'BC-016',
    'Empada de frango',
    'Empada individual',
    'Massa de empada; recheio de frango',
    'commercial',
    800,
    'unidade',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PreÃ§o histÃ³rico R$ 8,00; confirmar preÃ§o atual',
    16
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-04'),
    'BC-017',
    'Empada de palmito',
    'Empada individual',
    'Massa de empada; palmito',
    'commercial',
    800,
    'unidade',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PreÃ§o histÃ³rico R$ 8,00; confirmar preÃ§o atual',
    17
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-04'),
    'BC-018',
    'Empada de berinjela',
    'Empada individual',
    'Massa de empada; berinjela',
    'commercial',
    800,
    'unidade',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PreÃ§o histÃ³rico R$ 8,00; confirmar preÃ§o atual',
    18
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-04'),
    'BC-019',
    'Empada de abobrinha',
    'Empada individual',
    'Massa de empada; abobrinha',
    'commercial',
    800,
    'unidade',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PreÃ§o histÃ³rico R$ 8,00; confirmar preÃ§o atual',
    19
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-05'),
    'BC-020',
    'Brasa Brigadeiro com morango',
    'Sobremesa artesanal',
    'Brigadeiro; morango',
    'commercial',
    NULL,
    'unidade',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    20
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-05'),
    'BC-021',
    'Torta de maracujÃ¡',
    'Sobremesa artesanal',
    'Torta / tortinha de mousse de maracujÃ¡',
    'commercial',
    NULL,
    'unidade',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    21
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-022',
    'Coca-Cola 1 litro',
    'Bebida gelada; tamanho conforme nome',
    'Coca-Cola 1 litro',
    'commercial',
    NULL,
    '1 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    22
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-023',
    'Coca-Cola 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'Coca-Cola 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    23
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-024',
    'GuaranÃ¡ Cruzeiro 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'GuaranÃ¡ Cruzeiro 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    24
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-025',
    'Galeguinha 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'Galeguinha 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    25
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-026',
    'GuaranÃ¡ Antarctica 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'GuaranÃ¡ Antarctica 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    26
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-027',
    'Sprite 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'Sprite 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    27
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-028',
    'Coca-Cola lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Coca-Cola lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    28
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-029',
    'Coca-Cola Zero lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Coca-Cola Zero lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    29
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-030',
    'Fanta lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Fanta lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    30
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-031',
    'GuaranÃ¡ Antarctica lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'GuaranÃ¡ Antarctica lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    31
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-032',
    'GuaranÃ¡ Zero lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'GuaranÃ¡ Zero lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    32
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-033',
    'Sprite lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Sprite lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    33
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-034',
    'Ãgua sem gÃ¡s',
    'Bebida gelada; tamanho conforme nome',
    'Ãgua sem gÃ¡s',
    'commercial',
    NULL,
    'garrafinha',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    34
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-06'),
    'BC-035',
    'Ãgua com gÃ¡s',
    'Bebida gelada; tamanho conforme nome',
    'Ãgua com gÃ¡s',
    'commercial',
    NULL,
    'garrafinha',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    35
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-036',
    'Cerveja Antarctica 600 ml',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Antarctica 600 ml',
    'commercial',
    NULL,
    '600 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    36
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-037',
    'Cerveja Heineken 600 ml',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Heineken 600 ml',
    'commercial',
    NULL,
    '600 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    37
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-038',
    'Cerveja Michelob lata 350 ml',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Michelob lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    38
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-039',
    'Cerveja Antarctica lata 350 ml',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Antarctica lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    39
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-040',
    'Cerveja Heineken lata',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Heineken lata',
    'commercial',
    NULL,
    'Confirmar volume',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    40
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-07'),
    'BC-041',
    'Cerveja Heineken Zero lata',
    'Cerveja; venda conforme legislaÃ§Ã£o',
    'Cerveja Heineken Zero lata',
    'commercial',
    NULL,
    'Confirmar volume',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoÃ³lico antes de classificar',
    41
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-08'),
    'BC-042',
    'Batata frita 350 g',
    'PorÃ§Ã£o de batatas fritas',
    'Batata; Ã³leo; sal',
    'commercial',
    NULL,
    '350 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Informado em 26/10/2026. Obs:',
    42
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-08'),
    'BC-043',
    'Batata frita 300 g',
    'PorÃ§Ã£o de batatas fritas',
    'Batata; Ã³leo; sal',
    'commercial',
    NULL,
    '300 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico; conferir se substituÃ­da pela de 350 g. Obs:',
    43
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-044',
    'Amendoim 100 g',
    'Petisco / porÃ§Ã£o fria',
    'Amendoim',
    'commercial',
    NULL,
    '100 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    44
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-045',
    'TÃ¡bua de frios',
    'Petisco / porÃ§Ã£o fria',
    'Salame; azeitona; pimenta biquinho; muÃ§arela; presunto; cebolinha em conserva',
    'commercial',
    NULL,
    'tÃ¡bua',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    45
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-046',
    'Salame 150 g',
    'Petisco / porÃ§Ã£o fria',
    'Salame fatiado',
    'commercial',
    NULL,
    '150 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    46
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-047',
    'Salame 250 g',
    'Petisco / porÃ§Ã£o fria',
    'Salame fatiado',
    'commercial',
    NULL,
    '250 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    47
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-048',
    'Salame Pamplona',
    'Petisco / porÃ§Ã£o fria',
    'Salame Pamplona',
    'commercial',
    NULL,
    'unidade / embalagem',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    48
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-049',
    'Salame Seara',
    'Petisco / porÃ§Ã£o fria',
    'Salame Seara',
    'commercial',
    NULL,
    'unidade / embalagem',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    49
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-050',
    'Azeitonas',
    'Petisco / porÃ§Ã£o fria',
    'Azeitonas',
    'commercial',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    50
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-09'),
    'BC-051',
    'Cebolinha em conserva',
    'Petisco / porÃ§Ã£o fria',
    'Cebolinha em conserva',
    'commercial',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Salames Pamplona/Seara tambÃ©m citados para balcÃ£o; verificar embalagem',
    51
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-10'),
    'BC-052',
    'Frango assado com batata e farofa especial',
    'Frango assado acompanhado de batatas assadas e farofa especial',
    'Frango; batata assada; farofa especial',
    'commercial',
    NULL,
    'combo',
    'draft',
    'in_stock',
    '["sunday"]'::jsonb,
    '10:00:00',
    '14:00:00',
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PromoÃ§Ãµes histÃ³ricas R$ 39,90 e R$ 45,90; nÃ£o assumir preÃ§o atual',
    52
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-10'),
    'BC-053',
    'Combo FamÃ­lia',
    'RefeiÃ§Ã£o familiar completa',
    'Frango assado; batata assada; farofa especial; batata frita; creme de milho; arroz caipira',
    'commercial',
    NULL,
    'combo',
    'draft',
    'in_stock',
    '["sunday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    53
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-10'),
    'BC-054',
    'Coxa e sobrecoxa assada',
    'Item citado em catÃ¡logo histÃ³rico',
    'Coxa e sobrecoxa de frango',
    'commercial',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '["sunday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Citado em histÃ³rico; confirmar venda. Obs:',
    54
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-11'),
    'BC-055',
    'Talharim Ã  bolonhesa',
    'Massa preparada para venda',
    'Talharim; molho Ã  bolonhesa',
    'commercial',
    NULL,
    'pote / porÃ§Ã£o',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha tÃ©cnica',
    55
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-11'),
    'BC-056',
    'Lasanha Ã  bolonhesa',
    'Massa preparada para venda',
    'Massa de lasanha; presunto; muÃ§arela; molho Ã  bolonhesa; creme de leite',
    'commercial',
    NULL,
    'pote / porÃ§Ã£o',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha tÃ©cnica',
    56
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-11'),
    'BC-057',
    'Conchiglione de frango com catupiry',
    'Massa preparada para venda',
    'Conchiglione; frango; catupiry',
    'commercial',
    NULL,
    'pote / porÃ§Ã£o',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha tÃ©cnica',
    57
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-12'),
    'BC-058',
    'Pizza muÃ§arela',
    'Pizza estilo padaria, massa mÃ©dia prÃ©-assada',
    'Massa mÃ©dia prÃ©-assada; molho de tomate; muÃ§arela',
    'commercial',
    NULL,
    'pizza mÃ©dia',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PrÃ©-assar massa com molho, conforme planejamento',
    58
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-12'),
    'BC-059',
    'Pizza frango com catupiry',
    'Pizza estilo padaria, massa mÃ©dia prÃ©-assada',
    'Massa mÃ©dia prÃ©-assada; molho de tomate; frango; catupiry',
    'commercial',
    NULL,
    'pizza mÃ©dia',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PrÃ©-assar massa com molho, conforme planejamento',
    59
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-12'),
    'BC-060',
    'Pizza portuguesa',
    'Pizza estilo padaria, massa mÃ©dia prÃ©-assada',
    'Massa mÃ©dia prÃ©-assada; molho de tomate; cobertura portuguesa (ingredientes exatos a confirmar)',
    'commercial',
    NULL,
    'pizza mÃ©dia',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: PrÃ©-assar massa com molho, conforme planejamento',
    60
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-061',
    'PorÃ§Ã£o de churrasco grego',
    'PorÃ§Ã£o de carne do espeto grego com batata frita',
    'Fraldinha Extra Grill com bacon defumado Pamplona; batata frita',
    'commercial',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    61
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-062',
    'Lanche Grego Simples',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pÃ£o baguete pequeno; vinagrete; molho especial; maionese',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    62
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-063',
    'Lanche Grego Salada',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pÃ£o baguete pequeno; vinagrete; molho especial; maionese; rÃºcula',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    63
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-064',
    'Lanche Grego Especial',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pÃ£o baguete pequeno; vinagrete; molho especial; maionese; rÃºcula; Doritos; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    64
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-065',
    'PorÃ§Ã£o de churrasco grego',
    'PorÃ§Ã£o de carne do espeto grego com batata frita',
    'Carne variÃ¡vel definida semanalmente; batata frita',
    'commercial',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs:',
    65
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-066',
    'Lanche Grego Simples',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Carne variÃ¡vel definida semanalmente; pÃ£o baguete pequeno; vinagrete; molho especial; maionese',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    66
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-067',
    'Lanche Grego Salada',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Carne variÃ¡vel definida semanalmente; pÃ£o baguete pequeno; vinagrete; molho especial; maionese; rÃºcula',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    67
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-068',
    'Lanche Grego Especial',
    'Lanche no pÃ£o com carne do churrasco grego',
    'Carne variÃ¡vel definida semanalmente; pÃ£o baguete pequeno; vinagrete; molho especial; maionese; rÃºcula; Doritos; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico confirmado. Obs: Conforme composiÃ§Ã£o informada em 26/10',
    68
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-069',
    'Churrasco grego suÃ­no com bacon e pimentÃµes',
    'Receita ou ediÃ§Ã£o de espeto grego',
    'Lombo; copa-lombo; bacon defumado Pamplona; cebola; pimentÃµes verde, vermelho e amarelo',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico de ediÃ§Ã£o semanal. Obs: NÃ£o publicar como produto independente sem confirmar disponibilidade',
    69
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-070',
    'Churrasco grego cupim com abacaxi ao mel',
    'Receita ou ediÃ§Ã£o de espeto grego',
    'Cupim; manteiga; pÃ¡prica defumada; alho; abacaxi ao mel',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Teste / ediÃ§Ã£o especial. Obs: NÃ£o publicar como produto independente sem confirmar disponibilidade',
    70
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-071',
    'Churrasco grego bovino tradicional',
    'Receita ou ediÃ§Ã£o de espeto grego',
    'Carne bovina; composiÃ§Ã£o variÃ¡vel',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: HistÃ³rico. Obs: NÃ£o publicar como produto independente sem confirmar disponibilidade',
    71
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-072',
    'Churrasco grego suÃ­no com paleta / copa-lombo',
    'Receita ou ediÃ§Ã£o de espeto grego',
    'Paleta ou copa-lombo; bacon; cebola; pimentÃµes',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Planejamento / teste. Obs: NÃ£o publicar como produto independente sem confirmar disponibilidade',
    72
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-073',
    'Arroz caipira',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Arroz caipira',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    73
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-074',
    'Creme de milho',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Milho; creme (receita a confirmar)',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    74
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-075',
    'Farofa especial',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Farofa da casa',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    75
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-076',
    'Batata assada',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Batatas assadas',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    76
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-077',
    'Vinagrete',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Tomate; cebola e temperos (confirmar receita)',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    77
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-078',
    'Molho especial',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Molho da casa',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    78
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-16'),
    'BC-079',
    'Maionese',
    'Acompanhamento; opÃ§Ã£o de venda separada a confirmar',
    'Maionese',
    'addon',
    NULL,
    'porÃ§Ã£o',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: Componente confirmado; venda avulsa nÃ£o confirmada. Obs:',
    79
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-080',
    'Escondidinho',
    'Produto apenas sugerido anteriormente',
    'Recheio a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    80
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-081',
    'Batata recheada Brasa Especial',
    'Produto apenas sugerido anteriormente',
    'Recheio a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    81
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-082',
    'Mini lasanha',
    'Produto apenas sugerido anteriormente',
    'Molho e recheio a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    82
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-083',
    'EmpadÃ£o',
    'Produto apenas sugerido anteriormente',
    'Recheio a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    83
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-084',
    'Arroz de forno',
    'Produto apenas sugerido anteriormente',
    'Ingredientes a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    84
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-085',
    'SanduÃ­che de frango',
    'Produto apenas sugerido anteriormente',
    'Ingredientes a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    85
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-086',
    'Kafta gratinada',
    'Produto apenas sugerido anteriormente',
    'Kafta; cobertura a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    86
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;


INSERT INTO products (
    category_id, code, name, description, ingredients, 
    product_type, base_price_cents, unit, status, availability_status, 
    available_days, start_time, end_time, is_time_restricted, special_notes, sort_order
) VALUES (
    (SELECT id FROM categories WHERE code = 'CAT-01'),
    'BC-087',
    'Frango cremoso',
    'Produto apenas sugerido anteriormente',
    'Frango; creme a definir',
    'future_idea',
    NULL,
    'unidade',
    'archived',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'EvidÃªncia: SugestÃ£o nÃ£o confirmada. Obs:',
    87
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    ingredients = EXCLUDED.ingredients,
    product_type = EXCLUDED.product_type,
    unit = EXCLUDED.unit,
    available_days = EXCLUDED.available_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    special_notes = EXCLUDED.special_notes;
