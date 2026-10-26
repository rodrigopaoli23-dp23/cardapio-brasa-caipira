/**
 * BRASA CAIPIRA — Tipos do Banco de Dados e Domínio
 * Fuso horário oficial: America/Sao_Paulo
 * Todos os valores monetários são manipulados em centavos inteiros (cents) para precisão financeira.
 */

export type ProductType = 'commercial' | 'addon' | 'historical_recipe' | 'future_idea'

export type ProductStatus = 'draft' | 'published' | 'archived'

export type AvailabilityStatus = 'in_stock' | 'out_of_stock' | 'pre_order_only'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type OrderType = 'delivery' | 'takeout'

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'

export type OrderStatus =
  | 'checkout_started'              // 1. Checkout iniciado pelo cliente
  | 'awaiting_whatsapp_dispatch'    // 2. Pedido registrado e preparado para envio ao WhatsApp
  | 'received_confirmed'            // 3. Recebido e confirmado manualmente pelo estabelecimento
  | 'in_preparation'               // 4. Em preparação na cozinha/brasa
  | 'ready_for_pickup_or_delivery' // 5. Pronto para retirada ou saiu para entrega
  | 'completed'                     // 6. Entregue e finalizado
  | 'canceled'                      // Cancelado

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface ScheduleRule {
  available_days: DayOfWeek[]
  start_time: string | null // Formato "HH:MM"
  end_time: string | null   // Formato "HH:MM"
  is_time_restricted: boolean
  special_notes?: string | null
}

export interface Product {
  id: string
  category_id: string
  code: string // Ex: BC-001
  name: string
  description?: string | null
  ingredients?: string | null
  product_type: ProductType
  base_price_cents: number | null // Em centavos. Null = pendente de precificação
  unit: string // "espeto", "lanche", "porção", "combo", "unidade", "lata", "garrafa"
  image_url?: string | null
  
  // Três dimensões de controle independentes
  status: ProductStatus
  availability_status: AvailabilityStatus
  schedule: ScheduleRule
  
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string // Ex: "350 g", "600 ml", "Lata 350 ml"
  price_cents: number
  availability_status: AvailabilityStatus
  sort_order: number
}

export interface OptionItem {
  id: string
  group_id: string
  name: string // Ex: "Doritos", "Picles", "Vinagrete extra"
  additional_price_cents: number // Em centavos (0 se incluso)
  is_active: boolean
  sort_order: number
}

export interface OptionGroup {
  id: string
  name: string // Ex: "Ponto da Carne", "Adicionais do X-Espeto", "Carne da Quinta"
  description?: string | null
  min_select: number
  max_select: number
  is_required: boolean
  items: OptionItem[]
}

export interface DeliveryNeighborhood {
  id: string
  name: string // Ex: "Jardim Nova Leme", "Centro", "Barra Funda"
  delivery_fee_cents: number // Em centavos
  estimated_time_min: number
  estimated_time_max: number
  is_active: boolean
}

export interface StoreSettings {
  id: string
  store_name: string
  slogan: string
  whatsapp_number: string // "5519998107666"
  address: string
  reference: string
  instagram: string
  is_store_open: boolean
  current_thursday_meat: string // Carne rotativa do Churrasco Grego de quinta
  announcement_banner?: string | null
  timezone: string // "America/Sao_Paulo"
  updated_at: string
}

export interface CartItemOption {
  group_id: string
  group_name: string
  item_id: string
  item_name: string
  additional_price_cents: number
}

export interface CartItem {
  id: string // UUID temporário no carrinho
  product_id: string
  product_code: string
  product_name: string
  product_unit: string
  variant_id?: string | null
  variant_name?: string | null
  unit_price_cents: number
  quantity: number
  selected_options: CartItemOption[]
  notes?: string | null
  item_total_cents: number
}

export interface OrderCustomerInfo {
  name: string
  phone: string
}

export interface OrderDeliveryInfo {
  type: OrderType
  neighborhood_id?: string | null
  neighborhood_name?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  reference?: string | null
  delivery_fee_cents: number
}

export interface OrderPaymentInfo {
  method: PaymentMethod
  change_for_cents?: number | null // Troco para quanto em centavos
}

export interface Order {
  id: string
  order_code: string // Ex: #BC-1042
  customer: OrderCustomerInfo
  delivery: OrderDeliveryInfo
  payment: OrderPaymentInfo
  items: CartItem[]
  subtotal_cents: number
  delivery_fee_cents: number
  discount_cents: number
  total_cents: number
  status: OrderStatus
  created_at: string
  updated_at: string
}
