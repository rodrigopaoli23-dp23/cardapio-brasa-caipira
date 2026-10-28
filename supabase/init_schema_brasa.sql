-- ==============================================================================
-- BRASA CAIPIRA — SCHEMA COMPLETO E IDEMPOTENTE DO BANCO DE DADOS (SUPABASE)
-- Fuso Horário Oficial: America/Sao_Paulo
-- Moeda: Valores monetários em centavos (INTEGER)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS COM PROTEÇÃO CONTRA DUPLICIDADE
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

-- 4. TABELA DE VARIAÇÕES DIRETAS
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

-- 6. CONFIGURAÇÕES DA LOJA E SINCRONIZAÇÃO GERAL
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(100) NOT NULL DEFAULT 'BRASA CAIPIRA',
    slogan VARCHAR(150) NOT NULL DEFAULT 'O verdadeiro sabor da brasa.',
    whatsapp_number VARCHAR(20) NOT NULL DEFAULT '5519998107666',
    address TEXT NOT NULL DEFAULT 'Rua dos Crisantemos, 350 — Jardim Nova Leme — Leme/SP',
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

-- 8. POLÍTICAS DE ACESSO (RLS PERMISSIVAS PARA OPERAÇÃO DO APP)
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

-- 9. CONFIGURAÇÃO DO BUCKET DE FOTOS (product-images - até 10MB para fotos de câmera)
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
