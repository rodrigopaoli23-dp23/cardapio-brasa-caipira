import {
  DayScheduleItem,
  GreekBBQProgram,
  StoreIdentityConfig,
  WeeklyScheduleConfig,
} from '@/types/phase3.types'
import { pushToCloud } from '@/lib/cloudSync'

export const STORE_IDENTITY_STORAGE_KEY = 'brasa_caipira_store_identity_v1'
export const WEEKLY_SCHEDULE_STORAGE_KEY = 'brasa_caipira_weekly_schedule_v1'
export const GREEK_BBQ_STORAGE_KEY = 'brasa_caipira_greek_bbq_v1'

export const DEFAULT_STORE_IDENTITY: StoreIdentityConfig = {
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
  googleMapsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Rua+dos+Crisantemos,+350,+Jardim+Nova+Leme,+Leme+-+SP',
  wazeUrl:
    'https://waze.com/ul?q=Rua%20dos%20Crisantemos%20350%20Leme%20SP&navigate=yes',
  adminEmail: 'admin@brasacaipira.com.br',
  avisoTopo: '🔥 O VERDADEIRO SABOR DA BRASA QUE REÚNE A FAMÍLIA!',
  avisoEspecial: 'Espetinhos na brasa e churrasco grego tradicional em Leme/SP!',
  modalidadesAtivas: {
    delivery: true,
    mesa: true,
    retirada: true,
  },
  taxaEntregaPadraoReais: 5.0,
}

/**
 * Valida se o endereço possui rua e cidade/UF e constrói/valida a URL do Google Maps.
 */
export function buildAndValidateGoogleMapsUrl(
  endereco: string,
  numero: string,
  bairro: string,
  cidadeEstado: string,
  customUrl?: string
): { isValid: boolean; url: string; error?: string } {
  const cleanEndereco = (endereco || '').trim()
  const cleanNumero = (numero || '').trim()
  const cleanBairro = (bairro || '').trim()
  const cleanCidade = (cidadeEstado || '').trim()
  const cleanCustomUrl = (customUrl || '').trim()

  if (!cleanEndereco || cleanEndereco.length < 3) {
    return {
      isValid: false,
      url: '',
      error: 'Informe o logradouro/rua válido da loja antes de salvar.',
    }
  }

  if (!cleanCidade || cleanCidade.length < 2) {
    return {
      isValid: false,
      url: '',
      error: 'Informe a cidade e estado (ex: Leme / SP) antes de salvar.',
    }
  }

  if (cleanCustomUrl) {
    const isGoogleMapsPattern =
      /^https?:\/\/(www\.)?(google\.com(\.br)?\/maps|maps\.google\.com(\.br)?|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
        cleanCustomUrl
      )

    if (!isGoogleMapsPattern) {
      return {
        isValid: false,
        url: cleanCustomUrl,
        error:
          'A URL personalizada não é um link válido do Google Maps (use google.com/maps ou maps.app.goo.gl).',
      }
    }

    return {
      isValid: true,
      url: cleanCustomUrl,
    }
  }

  const destinationParts = [
    cleanEndereco,
    cleanNumero,
    cleanBairro,
    cleanCidade.replace('/', '-'),
  ].filter(Boolean)

  const query = encodeURIComponent(destinationParts.join(', '))
  return {
    isValid: true,
    url: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
  }
}

/**
 * Gera automaticamente a URL de navegação do Waze a partir do endereço.
 */
export function buildWazeUrl(
  endereco: string,
  numero: string,
  cidadeEstado: string
): string {
  const parts = [
    (endereco || '').trim(),
    (numero || '').trim(),
    (cidadeEstado || '').replace('/', ' ').trim(),
  ]
    .filter(Boolean)
    .join(' ')
  return `https://waze.com/ul?q=${encodeURIComponent(parts)}&navigate=yes`
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleConfig = {
  timezone: 'America/Sao_Paulo',
  manualOverride: {
    mode: 'auto',
    expiresAt: null,
    reason: '',
  },
  excecoes: [],
  days: [
    {
      dayIndex: 0,
      dayName: 'Domingo',
      shortName: 'Dom',
      isOpen: true,
      openTime: '10:00',
      closeTime: '14:00',
      destaqueDia: 'Assados de Domingo & Frango Recheado',
      novidades: 'Costela assada, frango recheado, joelho de porco e acompanhamentos',
      observacoes: 'Atendimento especial de almoço das 10:00 às 14:00',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 1,
      dayName: 'Segunda-feira',
      shortName: 'Seg',
      isOpen: false,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Fechado — Descanso Semanal',
      novidades: '',
      observacoes: 'Não abrimos às segundas-feiras',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 2,
      dayName: 'Terça-feira',
      shortName: 'Ter',
      isOpen: false,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Fechado — Preparação da Semana',
      novidades: '',
      observacoes: 'Não abrimos às terças-feiras',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 3,
      dayName: 'Quarta-feira',
      shortName: 'Qua',
      isOpen: true,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Quarta da Brasa — Espetinhos & X-Espeto',
      novidades: 'Espetinhos assados na hora, Espeto Cremoso e lanches X-Espeto',
      observacoes: 'Aberto das 18:00 às 23:00',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 4,
      dayName: 'Quinta-feira',
      shortName: 'Qui',
      isOpen: true,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Quinta do Churrasco Grego (Carne Rotativa da Semana)',
      novidades: 'Churrasco Grego especial de quinta-feira em lanche ou porção + arroz caipira',
      observacoes: 'Aberto das 18:00 às 23:00',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 5,
      dayName: 'Sexta-feira',
      shortName: 'Sex',
      isOpen: true,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Sexta Completa — Espetinhos, Batata Recheada e Massas',
      novidades: 'Cardápio completo na brasa, porções e talharim caseiro',
      observacoes: 'Aberto das 18:00 às 23:00',
      categoriasDisponiveis: [],
    },
    {
      dayIndex: 6,
      dayName: 'Sábado',
      shortName: 'Sáb',
      isOpen: true,
      openTime: '18:00',
      closeTime: '23:00',
      destaqueDia: 'Sábado do Churrasco Grego de Fraldinha com Bacon',
      novidades: 'Fraldinha Extra Grill com bacon defumado Pamplona + linha completa de espetos',
      observacoes: 'Aberto das 18:00 às 23:00',
      categoriasDisponiveis: [],
    },
  ],
}

function parseTimeToMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '00:00').split(':')
  const hours = parseInt(hStr || '0', 10)
  const minutes = parseInt(mStr || '0', 10)
  if (isNaN(hours) || isNaN(minutes)) return 0
  return hours * 60 + minutes
}

function getSaoPauloTimeParts(referenceDate: Date, timeZone = 'America/Sao_Paulo'): {
  dayIndex: number
  hour: number
  minute: number
  dateISO: string
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(referenceDate)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const dayIndex = weekdayMap[map.weekday] ?? 0
  const rawHour = parseInt(map.hour || '0', 10)
  const hour = rawHour === 24 ? 0 : rawHour
  const minute = parseInt(map.minute || '0', 10)
  const dateISO = `${map.year}-${map.month}-${map.day}`

  return { dayIndex, hour, minute, dateISO }
}

/**
 * Avalia se a loja está aberta ou fechada considerando:
 * 1. Override manual (force_open / force_closed) caso não esteja expirado;
 * 2. Retorno automático à agenda caso expiresAt já tenha passado;
 * 3. Exceções de calendário (YYYY-MM-DD);
 * 4. Programação semanal no fuso America/Sao_Paulo.
 * Nunca exibe "Aberto" apenas porque um produto está ativo.
 */
export function evaluateStoreOpenStatus(
  schedule: WeeklyScheduleConfig,
  referenceDate?: Date
): {
  isOpen: boolean
  statusText: string
  reason: string
  currentDaySchedule: DayScheduleItem
} {
  const now = referenceDate ? new Date(referenceDate.getTime()) : new Date()
  const tz = schedule?.timezone || 'America/Sao_Paulo'
  const { dayIndex, hour, minute, dateISO } = getSaoPauloTimeParts(now, tz)

  const fallbackDay: DayScheduleItem =
    DEFAULT_WEEKLY_SCHEDULE.days.find((d) => d.dayIndex === dayIndex) ||
    DEFAULT_WEEKLY_SCHEDULE.days[0]

  const currentDaySchedule: DayScheduleItem =
    schedule?.days?.find((d) => d.dayIndex === dayIndex) || fallbackDay

  // 1. Verifica comando manual (override)
  if (
    schedule?.manualOverride &&
    (schedule.manualOverride.mode === 'force_open' ||
      schedule.manualOverride.mode === 'force_closed')
  ) {
    const expiresAtStr = schedule.manualOverride.expiresAt
    const isExpired = expiresAtStr
      ? new Date(expiresAtStr).getTime() <= now.getTime()
      : false

    if (!isExpired) {
      if (schedule.manualOverride.mode === 'force_open') {
        return {
          isOpen: true,
          statusText: 'Aberto agora (Modo Manual)',
          reason:
            schedule.manualOverride.reason ||
            'Aberto manualmente pelo administrador',
          currentDaySchedule,
        }
      }

      return {
        isOpen: false,
        statusText: 'Fechado temporariamente',
        reason:
          schedule.manualOverride.reason ||
          'Fechado manualmente pelo administrador',
        currentDaySchedule,
      }
    }
  }

  // 2. Verifica exceções por data (YYYY-MM-DD)
  const excecaoHoje = schedule?.excecoes?.find((ex) => ex.data === dateISO)
  if (excecaoHoje) {
    if (!excecaoHoje.aberto) {
      return {
        isOpen: false,
        statusText: 'Fechado hoje',
        reason: excecaoHoje.motivo || 'Fechado em data especial',
        currentDaySchedule,
      }
    }
    const currentMinutes = hour * 60 + minute
    const startMin = parseTimeToMinutes(excecaoHoje.horarioInicio)
    const endMin = parseTimeToMinutes(excecaoHoje.horarioFim)
    const isWithinException =
      currentMinutes >= startMin && currentMinutes < endMin

    return {
      isOpen: isWithinException,
      statusText: isWithinException
        ? `Aberto agora • Até ${excecaoHoje.horarioFim}`
        : `Fechado • Horário especial: ${excecaoHoje.horarioInicio} às ${excecaoHoje.horarioFim}`,
      reason:
        excecaoHoje.motivo ||
        `Horário especial (${excecaoHoje.horarioInicio} às ${excecaoHoje.horarioFim})`,
      currentDaySchedule,
    }
  }

  // 3. Avaliação automática pelo dia da semana e janela de horário em America/Sao_Paulo
  if (!currentDaySchedule.isOpen) {
    return {
      isOpen: false,
      statusText: 'Fechado hoje',
      reason:
        currentDaySchedule.observacoes ||
        `Fechado às ${currentDaySchedule.dayName.toLowerCase()}s`,
      currentDaySchedule,
    }
  }

  const currentMinutes = hour * 60 + minute
  const openMinutes = parseTimeToMinutes(currentDaySchedule.openTime)
  const closeMinutes = parseTimeToMinutes(currentDaySchedule.closeTime)

  const isWithinSchedule =
    currentMinutes >= openMinutes && currentMinutes < closeMinutes

  if (isWithinSchedule) {
    return {
      isOpen: true,
      statusText: `Aberto agora • Até ${currentDaySchedule.closeTime}`,
      reason: `Atendimento de ${currentDaySchedule.dayName} das ${currentDaySchedule.openTime} às ${currentDaySchedule.closeTime}`,
      currentDaySchedule,
    }
  }

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: `Fechado • Abre hoje às ${currentDaySchedule.openTime}`,
      reason: `Horário de ${currentDaySchedule.dayName}: ${currentDaySchedule.openTime} às ${currentDaySchedule.closeTime}`,
      currentDaySchedule,
    }
  }

  return {
    isOpen: false,
    statusText: `Fechado • Encerrado às ${currentDaySchedule.closeTime}`,
    reason: `Horário de ${currentDaySchedule.dayName} encerrado (${currentDaySchedule.openTime} às ${currentDaySchedule.closeTime})`,
    currentDaySchedule,
  }
}

/**
 * Configura ou limpa o override manual com duração temporária em minutos.
 */
export function createManualOverrideConfig(
  mode: 'auto' | 'force_open' | 'force_closed',
  durationMinutes: number | null,
  reason = '',
  referenceDate: Date = new Date()
): WeeklyScheduleConfig['manualOverride'] {
  if (mode === 'auto') {
    return {
      mode: 'auto',
      expiresAt: null,
      reason: '',
    }
  }

  const expiresAt =
    durationMinutes && durationMinutes > 0
      ? new Date(referenceDate.getTime() + durationMinutes * 60 * 1000).toISOString()
      : null

  return {
    mode,
    expiresAt,
    reason:
      reason ||
      (mode === 'force_open'
        ? 'Abertura manual temporária pelo painel'
        : 'Fechamento manual temporário pelo painel'),
  }
}

export const DEFAULT_GREEK_BBQ_PROGRAMS: GreekBBQProgram[] = [
  {
    id: 'grego-quinta',
    diaSemana: 'Quinta-feira',
    titulo: 'Churrasco Grego da Quinta — Carne Rotativa Especial',
    horario: '18:00 às 23:00',
    carnePrincipal:
      'Carne rotativa (Suína/Bovina — Lombo e Copa-Lombo com pimentões coloridos e bacon defumado Pamplona)',
    tipoCarne: 'mista',
    descricaoReceita:
      'Programação tradicional das quintas-feiras com carne rotativa preparada no espeto grego vertical: camadas suculentas de lombo e copa-lombo intercaladas com pimentões coloridos e bacon defumado Pamplona.',
    ingredientes:
      'Lombo, copa-lombo, bacon defumado Pamplona, cebola, pimentões verde, vermelho e amarelo, tempero especial da casa',
    fotoUrl: null,
    precoLanche: 22.0,
    precoPorcao: 45.0,
    status: 'published',
    opcoesLanche: [
      'Lanche Grego Simples (Pão baguete pequeno, vinagrete, molho especial e maionese)',
      'Lanche Grego Salada (Pão baguete pequeno, vinagrete, molho especial, maionese e rúcula)',
      'Lanche Grego Especial (Pão baguete pequeno, vinagrete, molho especial, maionese, rúcula, Doritos e picles)',
    ],
    opcoesPorcao: [
      'Porção de Churrasco Grego com batata frita',
      'Porção Completa com arroz caipira, vinagrete e farofa da casa',
    ],
    acompanhamentos: [
      'Arroz caipira',
      'Vinagrete',
      'Farofa da casa',
      'Batata frita',
      'Molho especial',
      'Maionese',
    ],
    produtosAssociados: ['BC-065', 'BC-066', 'BC-067', 'BC-068', 'BC-069'],
  },
  {
    id: 'grego-sabado',
    diaSemana: 'Sábado',
    titulo: 'Churrasco Grego de Sábado — Fraldinha Extra Grill',
    horario: '18:00 às 23:00',
    carnePrincipal: 'Fraldinha Extra Grill com bacon defumado',
    tipoCarne: 'bovina',
    descricaoReceita:
      'Churrasco grego padrão dos sábados preparado com Fraldinha Extra Grill selecionada e fatias generosas de bacon defumado Pamplona, assado lentamente e fatiado na hora.',
    ingredientes:
      'Fraldinha Extra Grill bovina, bacon defumado Pamplona, tempero da brasa',
    fotoUrl: null,
    precoLanche: 24.0,
    precoPorcao: 48.0,
    status: 'published',
    opcoesLanche: [
      'Lanche Grego Simples (Pão baguete pequeno, vinagrete, molho especial e maionese)',
      'Lanche Grego Salada (Pão baguete pequeno, vinagrete, molho especial, maionese e rúcula)',
      'Lanche Grego Especial (Pão baguete pequeno, vinagrete, molho especial, maionese, rúcula, Doritos e picles)',
    ],
    opcoesPorcao: [
      'Porção de Churrasco Grego de Fraldinha com batata frita',
    ],
    acompanhamentos: [
      'Batata frita',
      'Vinagrete',
      'Farofa da casa',
      'Molho especial',
      'Maionese',
    ],
    produtosAssociados: ['BC-061', 'BC-062', 'BC-063', 'BC-064', 'BC-071'],
  },
  {
    id: 'grego-costela-draft',
    diaSemana: 'Edição Especial (A definir)',
    titulo: 'Costela Bovina Fatiada — Rascunho Oficial',
    horario: '18:00 às 23:00',
    carnePrincipal:
      'Costela bovina fatiada, porcionada com mandioca na manteiga, vinagrete e picles',
    tipoCarne: 'bovina',
    descricaoReceita:
      'Costela bovina fatiada, porcionada com mandioca na manteiga, vinagrete e picles. Mantida inicialmente como rascunho sem preço ou publicação automática até liberação do administrador.',
    ingredientes:
      'Costela bovina fatiada, mandioca cozida na manteiga, vinagrete fresco da casa e picles de pepino',
    fotoUrl: null,
    precoLanche: null,
    precoPorcao: null,
    status: 'draft',
    opcoesLanche: [
      'Lanche de Costela Bovina Fatiada com vinagrete e picles',
    ],
    opcoesPorcao: [
      'Porção de Costela bovina fatiada com mandioca na manteiga, vinagrete e picles',
    ],
    acompanhamentos: [
      'Mandioca na manteiga',
      'Vinagrete',
      'Picles',
    ],
    produtosAssociados: [],
  },
]

export interface HistoricalGreekRecipePreset {
  codigo: 'BC-069' | 'BC-070' | 'BC-071' | 'BC-072'
  nome: string
  carnePrincipal: string
  tipoCarne: 'bovina' | 'suina' | 'mista'
  descricaoReceita: string
  ingredientes: string
  acompanhamentosSugeridos: string[]
}

export const HISTORICAL_GREEK_RECIPES: HistoricalGreekRecipePreset[] = [
  {
    codigo: 'BC-069',
    nome: 'Churrasco grego suíno com bacon e pimentões',
    carnePrincipal:
      'Lombo e Copa-Lombo suíno com pimentões coloridos e bacon defumado Pamplona',
    tipoCarne: 'suina',
    descricaoReceita:
      'Edição histórica de espeto grego com cortes selecionados de lombo e copa-lombo, intercalados com bacon defumado Pamplona, cebola e pimentões verde, vermelho e amarelo.',
    ingredientes:
      'Lombo; copa-lombo; bacon defumado Pamplona; cebola; pimentões verde, vermelho e amarelo',
    acompanhamentosSugeridos: ['Arroz caipira', 'Vinagrete', 'Farofa da casa'],
  },
  {
    codigo: 'BC-070',
    nome: 'Churrasco grego cupim com abacaxi ao mel',
    carnePrincipal: 'Cupim bovino na manteiga com abacaxi ao mel e páprica defumada',
    tipoCarne: 'bovina',
    descricaoReceita:
      'Receita especial de cupim macio temperado com manteiga, alho e páprica defumada, intercalado no espeto com fatias de abacaxi caramelizado ao mel.',
    ingredientes: 'Cupim; manteiga; páprica defumada; alho; abacaxi ao mel',
    acompanhamentosSugeridos: ['Arroz caipira', 'Vinagrete', 'Farofa da casa', 'Batata frita'],
  },
  {
    codigo: 'BC-071',
    nome: 'Churrasco grego bovino tradicional',
    carnePrincipal: 'Fraldinha Extra Grill com bacon defumado Pamplona',
    tipoCarne: 'bovina',
    descricaoReceita:
      'Receita clássica de churrasco grego bovino com cortes nobres e bacon defumado, assada lentamente na brasa.',
    ingredientes: 'Carne bovina (Fraldinha Extra Grill); bacon defumado; tempero da casa',
    acompanhamentosSugeridos: ['Batata frita', 'Vinagrete', 'Farofa da casa', 'Molho especial'],
  },
  {
    codigo: 'BC-072',
    nome: 'Churrasco grego suíno com paleta / copa-lombo',
    carnePrincipal: 'Paleta e Copa-Lombo suíno com bacon, cebola e pimentões',
    tipoCarne: 'suina',
    descricaoReceita:
      'Versão suculenta de churrasco grego suíno combinando paleta ou copa-lombo com bacon defumado, cebola e pimentões.',
    ingredientes: 'Paleta ou copa-lombo; bacon; cebola; pimentões',
    acompanhamentosSugeridos: ['Arroz caipira', 'Vinagrete', 'Farofa da casa'],
  },
]

/**
 * Aplica rapidamente uma receita histórica catalogada (BC-069 a BC-072) a uma programação existente
 * sem precisar recriar todo o cardápio.
 */
export function applyHistoricalRecipeToProgram(
  program: GreekBBQProgram,
  recipeCode: HistoricalGreekRecipePreset['codigo']
): GreekBBQProgram {
  const preset = HISTORICAL_GREEK_RECIPES.find((r) => r.codigo === recipeCode)
  if (!preset) return program

  const mergedProducts = Array.from(
    new Set([
      ...program.produtosAssociados.filter(
        (c) => !['BC-069', 'BC-070', 'BC-071', 'BC-072'].includes(c)
      ),
      preset.codigo,
    ])
  )

  return {
    ...program,
    carnePrincipal: preset.carnePrincipal,
    tipoCarne: preset.tipoCarne,
    descricaoReceita: preset.descricaoReceita,
    ingredientes: preset.ingredientes,
    acompanhamentos:
      program.acompanhamentos.length > 0
        ? program.acompanhamentos
        : preset.acompanhamentosSugeridos,
    produtosAssociados: mergedProducts,
  }
}

export function loadStoreIdentity(): StoreIdentityConfig {
  if (typeof window === 'undefined') return DEFAULT_STORE_IDENTITY
  try {
    const raw = window.localStorage.getItem(STORE_IDENTITY_STORAGE_KEY)
    if (!raw) return DEFAULT_STORE_IDENTITY
    const parsed = JSON.parse(raw) as Partial<StoreIdentityConfig>
    return {
      ...DEFAULT_STORE_IDENTITY,
      ...parsed,
      modalidadesAtivas: {
        ...DEFAULT_STORE_IDENTITY.modalidadesAtivas,
        ...(parsed.modalidadesAtivas || {}),
      },
    }
  } catch {
    return DEFAULT_STORE_IDENTITY
  }
}

export function saveStoreIdentity(config: StoreIdentityConfig): void {
  if (typeof window === 'undefined') return
  pushToCloud(STORE_IDENTITY_STORAGE_KEY, config, { immediate: true })
  try {
    window.localStorage.setItem(STORE_IDENTITY_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Fallback silencioso para ambientes restritos
  }
}

export function loadWeeklySchedule(): WeeklyScheduleConfig {
  if (typeof window === 'undefined') return DEFAULT_WEEKLY_SCHEDULE
  try {
    const raw = window.localStorage.getItem(WEEKLY_SCHEDULE_STORAGE_KEY)
    if (!raw) return DEFAULT_WEEKLY_SCHEDULE
    const parsed = JSON.parse(raw) as Partial<WeeklyScheduleConfig>
    return {
      ...DEFAULT_WEEKLY_SCHEDULE,
      ...parsed,
      manualOverride: {
        ...DEFAULT_WEEKLY_SCHEDULE.manualOverride,
        ...(parsed.manualOverride || {}),
      },
      days:
        Array.isArray(parsed.days) && parsed.days.length === 7
          ? parsed.days
          : DEFAULT_WEEKLY_SCHEDULE.days,
      excecoes: Array.isArray(parsed.excecoes) ? parsed.excecoes : [],
    }
  } catch {
    return DEFAULT_WEEKLY_SCHEDULE
  }
}

export function saveWeeklySchedule(schedule: WeeklyScheduleConfig): void {
  if (typeof window === 'undefined') return
  pushToCloud(WEEKLY_SCHEDULE_STORAGE_KEY, schedule, { immediate: true })
  try {
    window.localStorage.setItem(
      WEEKLY_SCHEDULE_STORAGE_KEY,
      JSON.stringify(schedule)
    )
  } catch {
    // Fallback silencioso
  }
}

export function loadGreekBBQPrograms(): GreekBBQProgram[] {
  if (typeof window === 'undefined') return DEFAULT_GREEK_BBQ_PROGRAMS
  try {
    const raw = window.localStorage.getItem(GREEK_BBQ_STORAGE_KEY)
    if (!raw) return DEFAULT_GREEK_BBQ_PROGRAMS
    const parsed = JSON.parse(raw) as GreekBBQProgram[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_GREEK_BBQ_PROGRAMS
    }
    return parsed
  } catch {
    return DEFAULT_GREEK_BBQ_PROGRAMS
  }
}

export function saveGreekBBQPrograms(programs: GreekBBQProgram[]): void {
  if (typeof window === 'undefined') return
  pushToCloud(GREEK_BBQ_STORAGE_KEY, programs, { immediate: true })
  try {
    window.localStorage.setItem(GREEK_BBQ_STORAGE_KEY, JSON.stringify(programs))
  } catch {
    // Fallback silencioso
  }
}
