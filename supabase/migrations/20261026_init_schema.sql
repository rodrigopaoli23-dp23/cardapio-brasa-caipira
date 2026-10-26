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

