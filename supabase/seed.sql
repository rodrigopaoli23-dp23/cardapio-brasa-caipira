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
