const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://gbaefutcpkplpggtkzxu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nMJT4dF_UqZ-hzQ46VxOOw_j6_aWMtB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('--- INICIANDO SEED NO SUPABASE CLOUD ---');

  // 1. Extrair os produtos iniciais e categorias de initialCatalog.ts
  const initialCatalogSource = fs.readFileSync('src/data/initialCatalog.ts', 'utf8');
  
  // Usar regex ou evaluate para carregar INITIAL_PRODUCTS
  // Vamos compilar um script rápido usando ts-node ou bundling simples
  console.log('1. Conectando ao Supabase...');

  // 2. Inserir Configurações da Loja
  const storeIdentity = {
    logoUrl: '/images/brand/logo-oficial.jpg',
    nome: 'BRASA CAIPIRA',
    slogan: 'O verdadeiro sabor da brasa que reúne a família!',
    endereco: 'Rua dos Crisântemos',
    numero: '350',
    bairro: 'Jd. Nova Leme',
    cidadeEstado: 'Leme / SP',
    pontoReferencia: 'Em frente ao Mercado do Angu',
    telefoneWhatsapp: '5519998107666',
    telefoneExibicao: '(19) 99810-7666',
    instagramHandle: '@brasa.caipira',
    instagramUrl: 'https://instagram.com/brasa.caipira',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Rua+dos+Crisantemos,+350,+Jardim+Nova+Leme,+Leme+-+SP',
    wazeUrl: 'https://waze.com/ul?q=Rua%20dos%20Crisantemos%20350%20Leme%20SP&navigate=yes',
    adminEmail: 'admin@brasacaipira.com.br',
    avisoTopo: '🔥 O VERDADEIRO SABOR DA BRASA QUE REÚNE A FAMÍLIA!',
    avisoEspecial: 'Espetinhos na brasa e churrasco grego tradicional em Leme/SP!',
    modalidadesAtivas: { delivery: true, mesa: true, retirada: true },
    taxaEntregaPadraoReais: 5.0
  };

  const weeklySchedule = {
    timezone: 'America/Sao_Paulo',
    manualOverride: { mode: 'auto', expiresAt: null, reason: '' },
    days: [
      { dayIndex: 0, dayName: 'Domingo', shortName: 'Dom', isOpen: true, openTime: '10:00', closeTime: '14:00', destaqueDia: 'Almoço em Família', novidades: '', observacoes: '', categoriasDisponiveis: [] },
      { dayIndex: 1, dayName: 'Segunda-feira', shortName: 'Seg', isOpen: false, openTime: '18:00', closeTime: '23:00', destaqueDia: '', novidades: '', observacoes: 'Fechado para descanso e produção', categoriasDisponiveis: [] },
      { dayIndex: 2, dayName: 'Terça-feira', shortName: 'Ter', isOpen: false, openTime: '18:00', closeTime: '23:00', destaqueDia: '', novidades: '', observacoes: 'Fechado para descanso e produção', categoriasDisponiveis: [] },
      { dayIndex: 3, dayName: 'Quarta-feira', shortName: 'Qua', isOpen: true, openTime: '18:00', closeTime: '23:00', destaqueDia: 'Noite dos Espetos', novidades: '', observacoes: '', categoriasDisponiveis: [] },
      { dayIndex: 4, dayName: 'Quinta-feira', shortName: 'Qui', isOpen: true, openTime: '18:00', closeTime: '23:00', destaqueDia: 'Churrasco Grego Tradicional', novidades: '', observacoes: '', categoriasDisponiveis: [] },
      { dayIndex: 5, dayName: 'Sexta-feira', shortName: 'Sex', isOpen: true, openTime: '18:00', closeTime: '23:30', destaqueDia: 'Sexta Caipira & Porções', novidades: '', observacoes: '', categoriasDisponiveis: [] },
      { dayIndex: 6, dayName: 'Sábado', shortName: 'Sáb', isOpen: true, openTime: '18:00', closeTime: '23:30', destaqueDia: 'Churrasco Grego & Espetos Especiais', novidades: '', observacoes: '', categoriasDisponiveis: [] }
    ],
    excecoes: []
  };

  const heroBanner = {
    seloPadrao: 'Foto & Cartaz Oficial',
    slides: [
      {
        id: 'banner-espetinhos',
        tituloDestaque: 'ESPETINHOS NA BRASA',
        subtitulo: 'Sabor caipira incomparável preparado no fogo a carvão!',
        imagemUrl: '/images/brand/banner-espetinhos.png',
        categoriaAlvo: 'Espetinhos',
        destaqueTexto: 'Mais de 20 variedades',
        ativo: true,
        ordem: 1
      },
      {
        id: 'banner-massas',
        tituloDestaque: 'MASSAS ARTESANAIS',
        subtitulo: 'Receitas de família com molhos encorpados e ingredientes frescos.',
        imagemUrl: '/images/brand/banner-massas.png',
        categoriaAlvo: 'Massas',
        destaqueTexto: 'Tradição Caipira',
        ativo: true,
        ordem: 2
      },
      {
        id: 'banner-grego',
        tituloDestaque: 'CHURRASCO GREGO OFICIAL',
        subtitulo: 'Quinta-feira carne especial e Sábado tradicional fraldinha grill!',
        imagemUrl: '/images/brand/banner-grego.png',
        categoriaAlvo: 'Churrasco Grego',
        destaqueTexto: 'Quinta e Sábado',
        ativo: true,
        ordem: 3
      }
    ]
  };

  const greekPrograms = [
    {
      id: 'grego-quinta',
      diaSemana: 'Quinta-feira',
      diaSemanaIndex: 4,
      nomeCarne: 'Carne rotativa (Suína e Bovina Especial)',
      descricaoReceita: 'Churrasco grego especial com lombo e copa-lombo suíno marinado com especiarias e pimentões.',
      ingredientes: 'Lombo, copa-lombo, pimentões coloridos, bacon defumado e tempero da casa.',
      precoLanche: 25.0,
      precoPorcao: 45.0,
      status: 'published',
      acompanhamentos: ['Arroz caipira', 'Vinagrete', 'Farofa da casa'],
      produtosAssociados: ['BC-070']
    },
    {
      id: 'grego-sabado',
      diaSemana: 'Sábado',
      diaSemanaIndex: 6,
      nomeCarne: 'Fraldinha Extra Grill',
      descricaoReceita: 'Churrasco grego clássico de sábado com fatias finas de fraldinha maturada e bacon.',
      ingredientes: 'Fraldinha bovina, bacon defumado, cebola e especiarias.',
      precoLanche: 28.0,
      precoPorcao: 50.0,
      status: 'published',
      acompanhamentos: ['Vinagrete especial', 'Picles', 'Mandioca na manteiga'],
      produtosAssociados: ['BC-069']
    },
    {
      id: 'grego-costela-draft',
      diaSemana: 'Domingo',
      diaSemanaIndex: 0,
      nomeCarne: 'Costela bovina fatiada',
      descricaoReceita: 'Costela bovina fatiada e porcionada com mandioca na manteiga, vinagrete e picles.',
      ingredientes: 'Costela bovina assada lentamente, mandioca cozida, manteiga de garrafa e vinagrete.',
      precoLanche: null,
      precoPorcao: null,
      status: 'draft',
      acompanhamentos: ['Mandioca na manteiga', 'Vinagrete', 'Picles'],
      produtosAssociados: []
    }
  ];

  console.log('2. Gravando Store Settings no Supabase...');
  const settingsRows = [
    { key: 'brasa_caipira_store_identity_v1', data: storeIdentity },
    { key: 'brasa_caipira_weekly_schedule_v1', data: weeklySchedule },
    { key: 'brasa_caipira_hero_banner_v1', data: heroBanner },
    { key: 'brasa_caipira_greek_bbq_v1', data: greekPrograms },
    { key: 'brasa_caipira_product_photos_v1', data: {} }
  ];

  for (const row of settingsRows) {
    const { error } = await supabase.from('store_settings').upsert({
      key: row.key,
      data: row.data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    if (error) console.error('Erro em store_settings:', row.key, error.message);
    else console.log('✓ Gravado com sucesso:', row.key);
  }

  console.log('--- SEED CONCLUÍDO COM SUCESSO! ---');
}

main().catch(console.error);
