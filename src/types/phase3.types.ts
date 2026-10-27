import { InitialProduct, ProductClassification } from '@/data/initialCatalog'

export interface ProductVariantOption {
  id: string
  nome: string
  preco: number // em reais (ex: 12.00)
}

export interface ProductAddonOption {
  codigo: string
  nome: string
  preco: number // em reais (ex: 4.00)
}

export type CatalogItemStatus = 'published' | 'unp_draft' | 'paused' | 'archived'

export interface ExtendedProduct extends InitialProduct {
  status?: CatalogItemStatus
  variantes?: ProductVariantOption[]
  adicionaisDisponiveis?: ProductAddonOption[]
  diasAtivos?: number[] // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  horarioInicio?: string // Ex: "18:00"
  horarioFim?: string // Ex: "23:00"
  ordemExibicao?: number
}

export interface CategoryRecord {
  id: string
  nome: string
  descricao: string
  ordem: number
  visivel: boolean
  arquivada: boolean
}

export interface StoreIdentityConfig {
  logoUrl: string
  nome: string
  slogan: string
  endereco: string
  numero: string
  bairro: string
  cidadeEstado: string
  pontoReferencia: string
  telefoneWhatsapp: string // Ex: "5519998107666"
  telefoneExibicao: string // Ex: "(19) 99810-7666"
  instagramHandle: string // Ex: "@brasa.caipira"
  instagramUrl: string // Ex: "https://instagram.com/brasa.caipira"
  googleMapsUrl: string
  wazeUrl: string
  adminEmail: string
  avisoTopo: string
  avisoEspecial: string
  modalidadesAtivas: {
    delivery: boolean
    mesa: boolean
    retirada: boolean
  }
  taxaEntregaPadraoReais: number
}

export interface DayScheduleItem {
  dayIndex: number // 0 = Domingo .. 6 = Sábado
  dayName: string
  shortName: string
  isOpen: boolean
  openTime: string // "18:00"
  closeTime: string // "23:00"
  destaqueDia: string
  novidades: string
  observacoes: string
  categoriasDisponiveis: string[] // Vazio = todas as ativas
}

export interface WeeklyScheduleConfig {
  timezone: string // "America/Sao_Paulo"
  manualOverride: {
    mode: 'auto' | 'force_open' | 'force_closed'
    expiresAt: string | null // ISO timestamp para retorno automático
    reason: string
  }
  excecoes: {
    id: string
    data: string // YYYY-MM-DD
    aberto: boolean
    horarioInicio: string
    horarioFim: string
    motivo: string
  }[]
  days: DayScheduleItem[]
}

export interface GreekBBQProgram {
  id: string
  diaSemana: string // "Quinta-feira", "Sábado", etc.
  titulo: string
  horario: string
  carnePrincipal: string
  tipoCarne: 'bovina' | 'suina' | 'mista'
  descricaoReceita: string
  ingredientes: string
  fotoUrl: string | null
  precoLanche: number | null
  precoPorcao: number | null
  status: 'published' | 'draft' | 'paused'
  opcoesLanche: string[]
  opcoesPorcao: string[]
  acompanhamentos: string[]
  produtosAssociados: string[] // Códigos BC-XXX vinculados
}

export interface CarouselSlide {
  id: string
  ordem: number
  ativo: boolean
  selo: string
  titulo: string
  descricao: string
  imagemUrl: string | null // null usa arte oficial / placeholder sem fotos falsas
  categoriaAlvo: string
}

export interface HeroBannerConfig {
  seloPadrao: string
  tituloDestaquesSemana: string
  textoDescritivoPrincipal: string
  bloco1Titulo: string
  bloco1Descricao: string
  bloco1SlideIndex: number
  bloco2Titulo: string
  bloco2Descricao: string
  bloco2SlideIndex: number
  slides: CarouselSlide[]
}

export type OrderModality = 'delivery' | 'mesa' | 'retirada'

export type OrderLifecycleStatus =
  | 'checkout_iniciado'
  | 'aguardando_confirmacao'
  | 'confirmado'
  | 'em_preparacao'
  | 'pronto'
  | 'concluido'
  | 'cancelado'

export interface OrderItemSnapshot {
  id: string
  codigo: string
  produto: string
  quantidade: number
  precoUnitarioCents: number
  varianteNome?: string
  adicionais: {
    codigo: string
    nome: string
    precoCents: number
  }[]
  subtotalItemCents: number
  observacao?: string
}

export interface OrderRecord {
  id: string
  numeroPedido: string // Ex: "#BC-1001"
  createdAt: string
  updatedAt: string
  clienteNome: string
  clienteTelefone: string
  modalidade: OrderModality
  enderecoEntrega?: {
    rua: string
    numero: string
    bairro: string
    complemento?: string
    referencia?: string
  }
  numeroMesa?: string
  itens: OrderItemSnapshot[]
  subtotalCents: number
  taxaEntregaCents: number
  totalCents: number
  observacoesCliente?: string
  status: OrderLifecycleStatus
  whatsappOpenedAt?: string
}

export { type InitialProduct, type ProductClassification }
