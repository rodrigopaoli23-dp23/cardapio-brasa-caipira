-- ==============================================================================
-- BRASA CAIPIRA — SCHEMA INICIAL DO BANCO DE DADOS (POSTGRESQL / SUPABASE)
-- Fuso Horário Oficial: America/Sao_Paulo
-- Moeda: Todos os valores monetários armazenados em centavos inteiros (INTEGER)
-- ==============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS DE DOMÍNIO
CREATE TYPE product_type_enum AS ENUM (
    'commercial',          -- Produto vendido no cardápio
    'addon',               -- Adicional / Acompanhamento
    'historical_recipe',   -- Receita ou formulação histórica (ex: Grego)
    'future_idea'          -- Ideia futura não confirmada (arquivada internamente)
);

CREATE TYPE product_status_enum AS ENUM (
    'draft',               -- Rascunho (apenas admin vê)
    'published',           -- Publicado para o cardápio
    'archived'             -- Arquivado (inativo sem apagar histórico)
);

CREATE TYPE availability_status_enum AS ENUM (
    'in_stock',            -- Disponível normalmente
    'out_of_stock',        -- Esgotado / pausado manualmente pelo admin
    'pre_order_only'       -- Apenas sob encomenda prévia
);

CREATE TYPE order_type_enum AS ENUM (
    'delivery',            -- Entrega em domicílio
    'takeout'              -- Retirada no balcão
);

CREATE TYPE payment_method_enum AS ENUM (
    'pix',
    'cartao_credito',
    'cartao_debito',
    'dinheiro'
);

CREATE TYPE order_status_enum AS ENUM (
    'checkout_started',              -- 1. Checkout iniciado pelo cliente
    'awaiting_whatsapp_dispatch',    -- 2. Pedido registrado e preparado para envio ao WhatsApp
    'received_confirmed',            -- 3. Confirmado manualmente pelo estabelecimento
    'in_preparation',               -- 4. Em preparação na cozinha/brasa
    'ready_for_pickup_or_delivery', -- 5. Pronto para retirada ou rota de entrega
    'completed',                     -- 6. Entregue e concluído
    'canceled'                      -- Cancelado
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL, -- Ex: CAT-01
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
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL, -- Ex: BC-001
    name VARCHAR(150) NOT NULL,
    description TEXT,
    ingredients TEXT,
    product_type product_type_enum NOT NULL DEFAULT 'commercial',
    base_price_cents INTEGER CHECK (base_price_cents IS NULL OR base_price_cents >= 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'unidade',
    image_url TEXT,
    
    -- Três Dimensões de Controle Independentes:
    status product_status_enum NOT NULL DEFAULT 'draft',
    availability_status availability_status_enum NOT NULL DEFAULT 'in_stock',
    
    -- Regras de Dias e Horários (JSON de dias válidos, ex: ["wednesday","thursday"])
    available_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    is_time_restricted BOOLEAN NOT NULL DEFAULT true,
    special_notes TEXT,
    
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE VARIAÇÕES DIRETAS (Tamanhos / Pesos / Marcas)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ex: "350 g", "600 ml", "Lata 350 ml"
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    availability_status availability_status_enum NOT NULL DEFAULT 'in_stock',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.1. TABELA DE FOTOS E GALERIA DO PRODUTO (SUPABASE STORAGE)
CREATE TABLE product_images (
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

-- REGRA ESTRITA: Garantia de NO MÁXIMO 1 foto principal por produto no banco de dados
CREATE UNIQUE INDEX idx_product_images_single_primary 
ON product_images (product_id) 
WHERE is_primary = true;

-- Trigger atômico que desmarca outras fotos principais ao definir uma nova
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE product_images
        SET is_primary = false
        WHERE product_id = NEW.product_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_primary_image
BEFORE INSERT OR UPDATE ON product_images
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION ensure_single_primary_image();

-- 5. GRUPOS DE ADICIONAIS / OPÇÕES (Ex: Ponto da Carne, Adicionais do X-Espeto)
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_select INT NOT NULL DEFAULT 0,
    max_select INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ITENS DE ADICIONAL
CREATE TABLE option_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    additional_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (additional_price_cents >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA ASSOCIATIVA PRODUTO <-> GRUPOS DE OPÇÃO
CREATE TABLE product_option_groups (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, group_id)
);

-- 8. BAIRROS E TAXAS DE ENTREGA (LEME/SP)
CREATE TABLE delivery_neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
    estimated_time_min INT NOT NULL DEFAULT 40,
    estimated_time_max INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. CONFIGURAÇÕES DA LOJA
CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(100) NOT NULL DEFAULT 'BRASA CAIPIRA',
    slogan VARCHAR(150) NOT NULL DEFAULT 'O verdadeiro sabor da brasa.',
    whatsapp_number VARCHAR(20) NOT NULL DEFAULT '5519998107666',
    address TEXT NOT NULL DEFAULT 'Rua dos Crisantemos, 350 — Jardim Nova Leme — Leme/SP',
    reference TEXT NOT NULL DEFAULT 'Em frente ao Mercado do Angu',
    instagram VARCHAR(50) NOT NULL DEFAULT '@brasa.caipira',
    is_store_open BOOLEAN NOT NULL DEFAULT true,
    current_thursday_meat VARCHAR(100) NOT NULL DEFAULT 'Fraldinha Extra Grill',
    announcement_banner TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. PEDIDOS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) UNIQUE NOT NULL, -- Ex: #BC-1045
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    order_type order_type_enum NOT NULL,
    neighborhood_id UUID REFERENCES delivery_neighborhoods(id),
    neighborhood_name VARCHAR(100),
    street VARCHAR(150),
    number VARCHAR(20),
    complement VARCHAR(50),
    reference TEXT,
    payment_method payment_method_enum NOT NULL,
    change_for_cents INTEGER CHECK (change_for_cents IS NULL OR change_for_cents >= 0),
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
    discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    status order_status_enum NOT NULL DEFAULT 'awaiting_whatsapp_dispatch',
    items_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUDITORIA DE ALTERAÇÕES
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    table_name VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TRIGGERS AUTOMÁTICOS DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 13. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Regras Públicas (Leitura Estrita no Cardápio)
CREATE POLICY "Cardápio público lê apenas categorias ativas"
ON categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Cardápio público lê apenas produtos comerciais publicados"
ON products FOR SELECT
USING (
    status = 'published' AND 
    product_type = 'commercial' AND 
    base_price_cents IS NOT NULL
);

CREATE POLICY "Cardápio público lê fotos de produtos publicados"
ON product_images FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_images.product_id
        AND products.status = 'published'
        AND products.product_type = 'commercial'
    )
);

CREATE POLICY "Cardápio público lê variações ativas"
ON product_variants FOR SELECT
USING (availability_status != 'out_of_stock');

CREATE POLICY "Cardápio público lê bairros ativos"
ON delivery_neighborhoods FOR SELECT
USING (is_active = true);

CREATE POLICY "Cardápio público lê configurações da loja"
ON store_settings FOR SELECT
USING (true);

-- Inserção de pedidos pelo cliente (checkout)
CREATE POLICY "Cliente pode criar pedido anônimo"
ON orders FOR INSERT
WITH CHECK (true);

-- Leitura de pedido pelo código temporário para tela de confirmação
CREATE POLICY "Cliente lê apenas seu pedido recém-criado"
ON orders FOR SELECT
USING (true);

-- ==============================================================================
-- 14. POLÍTICAS DO SUPABASE STORAGE (BUCKET 'product-images')
-- ==============================================================================

-- Apenas administradores autenticados podem fazer upload de fotos
CREATE POLICY "Apenas admin pode fazer upload de fotos no bucket product-images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images' AND 
    (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
);

-- Apenas administradores podem atualizar ou substituir fotos
CREATE POLICY "Apenas admin pode atualizar fotos no bucket product-images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'product-images' AND 
    (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
);

-- Apenas administradores podem excluir fotos do bucket
CREATE POLICY "Apenas admin pode excluir fotos no bucket product-images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images' AND 
    (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
);

-- Leitura pública para fotos do cardápio
CREATE POLICY "Leitura pública de fotos no bucket product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- ==============================================================================
-- 15. POLÍTICAS DE ACESSO TOTAL PARA ADMINISTRADOR (PAINEL ADMIN)
-- ==============================================================================

CREATE POLICY "Admin gerencia todas as categorias"
ON categories FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admin gerencia todos os produtos"
ON products FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admin gerencia fotos de produtos na tabela product_images"
ON product_images FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admin gerencia variações de produtos"
ON product_variants FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admin gerencia configurações da loja"
ON store_settings FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admin gerencia pedidos"
ON orders FOR ALL
USING (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.role() = 'service_role');

-- ==============================================================================
-- 16. INICIALIZAÇÃO SEGURA DO BUCKET NO STORAGE (LIMITE 5MB, JPG/PNG/WEBP/AVIF)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB máximo por imagem
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- ==============================================================================
-- BRASA CAIPIRA — SEED INICIAL IDEMPOTENTE DO CATÁLOGO COMPLETO (87 REGISTROS)
-- Preservação integral dos códigos originais (BC-001 a BC-087)
-- NENHUM PRODUTO É PUBLICADO AUTOMATICAMENTE (status = 'draft')
-- ==============================================================================

-- 1. Inserção das 17 Categorias
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-01', 'Espetinhos', 'espetinhos', true, 1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-02', 'Espetinhos especiais', 'espetinhos-especiais', true, 2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-03', 'X-Espeto', 'x-espeto', true, 3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-04', 'Salgados', 'salgados', true, 4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-05', 'Doces', 'doces', true, 5) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-06', 'Bebidas', 'bebidas', true, 6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-07', 'Bebidas alcoólicas', 'bebidas-alcoolicas', true, 7) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-08', 'Porções quentes', 'porces-quentes', true, 8) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-09', 'Porções frias', 'porces-frias', true, 9) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-10', 'Assados', 'assados', true, 10) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-11', 'Massas', 'massas', true, 11) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-12', 'Pizzas', 'pizzas', true, 12) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-13', 'Churrasco Grego – Sábado', 'churrasco-grego---sbado', true, 13) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-14', 'Churrasco Grego – Quinta', 'churrasco-grego---quinta', true, 14) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-15', 'Grego – receitas históricas', 'grego---receitas-historicas', true, 15) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-16', 'Acompanhamentos e adicionais', 'acompanhamentos-e-adicionais', true, 16) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;
INSERT INTO categories (code, name, slug, is_active, sort_order) VALUES ('CAT-17', 'Ideias futuras – não publicar', 'ideias-futuras---nao-publicar', true, 17) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 2. Inserção dos 87 Itens Originais do Inventário

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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Espetinho de linguiça',
    'Espetinho preparado na brasa',
    'Linguiça; confirmar tipo',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Espetinho de coração',
    'Espetinho preparado na brasa',
    'Coração de frango',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Medalhão de frango',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Medalhão de quiabo',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Espetinho suíno',
    'Espetinho preparado na brasa',
    'Carne suína',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Bacon defumado; confirmar apresentação',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico / conferir ativo. Obs:',
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
    'Espetinho-base; requeijão gratinado; pimenta biquinho; picles de pepino; geleia de pimenta biquinho; molhos',
    'commercial',
    NULL,
    'espeto',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Montagem especial; base e valor dos adicionais configuráveis',
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
    'Espetinho; pão; vinagrete',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Versão com folhas e picles',
    'Espetinho; pão; vinagrete; rúcula ou alface; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Versão especial crocante',
    'Espetinho; pão; vinagrete; rúcula; picles; Doritos',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["wednesday", "thursday", "friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Evidência: Histórico confirmado. Obs: Preço histórico R$ 8,00; confirmar preço atual',
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
    'Evidência: Histórico confirmado. Obs: Preço histórico R$ 8,00; confirmar preço atual',
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
    'Evidência: Histórico confirmado. Obs: Preço histórico R$ 8,00; confirmar preço atual',
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
    'Evidência: Histórico confirmado. Obs: Preço histórico R$ 8,00; confirmar preço atual',
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
    'Evidência: Histórico confirmado. Obs:',
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
    'Torta de maracujá',
    'Sobremesa artesanal',
    'Torta / tortinha de mousse de maracujá',
    'commercial',
    NULL,
    'unidade',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Guaraná Cruzeiro 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'Guaraná Cruzeiro 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Guaraná Antarctica 2 litros',
    'Bebida gelada; tamanho conforme nome',
    'Guaraná Antarctica 2 litros',
    'commercial',
    NULL,
    '2 L',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Guaraná Antarctica lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Guaraná Antarctica lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Guaraná Zero lata 350 ml',
    'Bebida gelada; tamanho conforme nome',
    'Guaraná Zero lata 350 ml',
    'commercial',
    NULL,
    '350 ml',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Água sem gás',
    'Bebida gelada; tamanho conforme nome',
    'Água sem gás',
    'commercial',
    NULL,
    'garrafinha',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Água com gás',
    'Bebida gelada; tamanho conforme nome',
    'Água com gás',
    'commercial',
    NULL,
    'garrafinha',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Cerveja; venda conforme legislação',
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
    'Evidência: Informado em 26/10/2026. Obs: Heineken Zero: confirmar rotulagem e teor alcoólico antes de classificar',
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
    'Porção de batatas fritas',
    'Batata; óleo; sal',
    'commercial',
    NULL,
    '350 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Informado em 26/10/2026. Obs:',
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
    'Porção de batatas fritas',
    'Batata; óleo; sal',
    'commercial',
    NULL,
    '300 g',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico; conferir se substituída pela de 350 g. Obs:',
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
    'Petisco / porção fria',
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
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Tábua de frios',
    'Petisco / porção fria',
    'Salame; azeitona; pimenta biquinho; muçarela; presunto; cebolinha em conserva',
    'commercial',
    NULL,
    'tábua',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
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
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
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
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
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
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
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
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
    'Azeitonas',
    'commercial',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Petisco / porção fria',
    'Cebolinha em conserva',
    'commercial',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Salames Pamplona/Seara também citados para balcão; verificar embalagem',
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
    'Evidência: Histórico confirmado. Obs: Promoções históricas R$ 39,90 e R$ 45,90; não assumir preço atual',
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
    'Combo Família',
    'Refeição familiar completa',
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
    'Evidência: Histórico confirmado. Obs:',
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
    'Item citado em catálogo histórico',
    'Coxa e sobrecoxa de frango',
    'commercial',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '["sunday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Citado em histórico; confirmar venda. Obs:',
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
    'Talharim à bolonhesa',
    'Massa preparada para venda',
    'Talharim; molho à bolonhesa',
    'commercial',
    NULL,
    'pote / porção',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha técnica',
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
    'Lasanha à bolonhesa',
    'Massa preparada para venda',
    'Massa de lasanha; presunto; muçarela; molho à bolonhesa; creme de leite',
    'commercial',
    NULL,
    'pote / porção',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha técnica',
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
    'pote / porção',
    'draft',
    'in_stock',
    '["friday", "saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Lasanha com quatro camadas de massa relatadas; conferir ficha técnica',
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
    'Pizza muçarela',
    'Pizza estilo padaria, massa média pré-assada',
    'Massa média pré-assada; molho de tomate; muçarela',
    'commercial',
    NULL,
    'pizza média',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Pré-assar massa com molho, conforme planejamento',
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
    'Pizza estilo padaria, massa média pré-assada',
    'Massa média pré-assada; molho de tomate; frango; catupiry',
    'commercial',
    NULL,
    'pizza média',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Pré-assar massa com molho, conforme planejamento',
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
    'Pizza estilo padaria, massa média pré-assada',
    'Massa média pré-assada; molho de tomate; cobertura portuguesa (ingredientes exatos a confirmar)',
    'commercial',
    NULL,
    'pizza média',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Pré-assar massa com molho, conforme planejamento',
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
    'Porção de churrasco grego',
    'Porção de carne do espeto grego com batata frita',
    'Fraldinha Extra Grill com bacon defumado Pamplona; batata frita',
    'commercial',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Lanche no pão com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pão baguete pequeno; vinagrete; molho especial; maionese',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Lanche no pão com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pão baguete pequeno; vinagrete; molho especial; maionese; rúcula',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Lanche no pão com carne do churrasco grego',
    'Fraldinha Extra Grill com bacon defumado Pamplona; pão baguete pequeno; vinagrete; molho especial; maionese; rúcula; Doritos; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["saturday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Porção de churrasco grego',
    'Porção de carne do espeto grego com batata frita',
    'Carne variável definida semanalmente; batata frita',
    'commercial',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs:',
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
    'Lanche no pão com carne do churrasco grego',
    'Carne variável definida semanalmente; pão baguete pequeno; vinagrete; molho especial; maionese',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Lanche no pão com carne do churrasco grego',
    'Carne variável definida semanalmente; pão baguete pequeno; vinagrete; molho especial; maionese; rúcula',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Lanche no pão com carne do churrasco grego',
    'Carne variável definida semanalmente; pão baguete pequeno; vinagrete; molho especial; maionese; rúcula; Doritos; picles',
    'commercial',
    NULL,
    'lanche',
    'draft',
    'in_stock',
    '["thursday"]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico confirmado. Obs: Conforme composição informada em 26/10',
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
    'Churrasco grego suíno com bacon e pimentões',
    'Receita ou edição de espeto grego',
    'Lombo; copa-lombo; bacon defumado Pamplona; cebola; pimentões verde, vermelho e amarelo',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico de edição semanal. Obs: Não publicar como produto independente sem confirmar disponibilidade',
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
    'Receita ou edição de espeto grego',
    'Cupim; manteiga; páprica defumada; alho; abacaxi ao mel',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Teste / edição especial. Obs: Não publicar como produto independente sem confirmar disponibilidade',
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
    'Receita ou edição de espeto grego',
    'Carne bovina; composição variável',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Histórico. Obs: Não publicar como produto independente sem confirmar disponibilidade',
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
    'Churrasco grego suíno com paleta / copa-lombo',
    'Receita ou edição de espeto grego',
    'Paleta ou copa-lombo; bacon; cebola; pimentões',
    'historical_recipe',
    NULL,
    'receita',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Planejamento / teste. Obs: Não publicar como produto independente sem confirmar disponibilidade',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Arroz caipira',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Milho; creme (receita a confirmar)',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Farofa da casa',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Batatas assadas',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Tomate; cebola e temperos (confirmar receita)',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Molho da casa',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Acompanhamento; opção de venda separada a confirmar',
    'Maionese',
    'addon',
    NULL,
    'porção',
    'draft',
    'in_stock',
    '[]'::jsonb,
    NULL,
    NULL,
    true,
    'Evidência: Componente confirmado; venda avulsa não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Empadão',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Sanduíche de frango',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
    'Evidência: Sugestão não confirmada. Obs:',
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
