/**
 * BRASA CAIPIRA — Carrinho, Modalidades, Validação Financeira Server-Side e Checkout (Fase 3)
 *
 * REGRAS CRÍTICAS DE NEGÓCIO:
 * 1. Bloqueio estrito de compra para produtos com `preco === null`, `preco <= 0`,
 *    status `'paused' | 'archived' | 'unp_draft'` ou `observacoes` contendo `'ESGOTADO'`.
 * 2. Recálculo integral de preços no servidor em centavos inteiros (`money.ts`),
 *    rejeitando/corrigindo qualquer preço adulterado no navegador.
 * 3. Validação obrigatória de dados do cliente conforme a modalidade (`delivery`, `mesa`, `retirada`).
 * 4. Registro idempotente do pedido com status inicial `'aguardando_confirmacao'`
 *    (abrir o WhatsApp não equivale a pedido confirmado).
 */

import {
  ExtendedProduct,
  InitialProduct,
  OrderItemSnapshot,
  OrderModality,
  OrderRecord,
  ProductAddonOption,
} from '@/types/phase3.types'
import {
  calculateItemTotalCents,
  calculateOrderTotals,
  formatCentsToBRL,
  reaisToCents,
} from '@/lib/money'

export const ORDERS_STORAGE_KEY = 'brasa_caipira_orders_v1'
export const CART_STORAGE_KEY = 'brasa_caipira_cart_v1'

export const OFFICIAL_ADDON_CODES = [
  'BC-073',
  'BC-074',
  'BC-075',
  'BC-076',
  'BC-077',
  'BC-078',
  'BC-079',
] as const

export const MODALITY_LABELS: Record<OrderModality, string> = {
  delivery: 'Delivery (Entrega)',
  mesa: 'Consumo no Estabelecimento (Mesa)',
  retirada: 'Retirada no Balcão',
}

/**
 * Verifica estritamente se um produto pode ser comprado no cardápio público.
 * Retorna `false` se:
 * - `preco === null || preco <= 0`
 * - `observacoes?.includes('ESGOTADO')` (case-insensitive)
 * - `status === 'paused' | 'archived' | 'unp_draft'`
 * - não for um item comercial (`isCommercial === false` ou `classification !== 'commercial'`)
 */
export function canProductBePurchased(
  product: ExtendedProduct | InitialProduct | null | undefined
): boolean {
  if (!product) return false

  if (product.preco === null || product.preco === undefined) {
    return false
  }

  const numericPrice = Number(product.preco)
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return false
  }

  if (product.observacoes && product.observacoes.toUpperCase().includes('ESGOTADO')) {
    return false
  }

  if ('status' in product && product.status) {
    if (
      product.status === 'paused' ||
      product.status === 'archived' ||
      product.status === 'unp_draft'
    ) {
      return false
    }
  }

  if (product.isCommercial === false) {
    return false
  }

  if (product.classification && product.classification !== 'commercial') {
    return false
  }

  return true
}

/**
 * Verifica se uma categoria ou produto comporta seleção de adicionais/acompanhamentos (BC-073 a BC-079).
 */
export function isProductEligibleForAddons(product: ExtendedProduct): boolean {
  if (product.adicionaisDisponiveis && product.adicionaisDisponiveis.length > 0) {
    return true
  }
  const cat = (product.categoria || '').toLowerCase()
  if (
    cat.includes('bebida') ||
    cat.includes('doce') ||
    cat.includes('salgado')
  ) {
    return false
  }
  return true
}

/**
 * Obtém a lista de adicionais (BC-073 a BC-079 ou configurados no produto) disponíveis com preço válido (> 0).
 */
export function getAvailableAddonsForProduct(
  product: ExtendedProduct,
  catalog: ExtendedProduct[]
): ProductAddonOption[] {
  const result: ProductAddonOption[] = []
  const seenCodes = new Set<string>()

  if (product.adicionaisDisponiveis && product.adicionaisDisponiveis.length > 0) {
    for (const addon of product.adicionaisDisponiveis) {
      if (addon.preco !== null && addon.preco !== undefined && Number(addon.preco) > 0) {
        const code = addon.codigo.trim().toUpperCase()
        seenCodes.add(code)
        result.push({
          codigo: code,
          nome: addon.nome.trim(),
          preco: Number(addon.preco),
        })
      }
    }
  }

  if (isProductEligibleForAddons(product)) {
    for (const item of catalog) {
      const code = item.codigo.trim().toUpperCase()
      const isOfficialAddon =
        (OFFICIAL_ADDON_CODES as readonly string[]).includes(code) ||
        item.classification === 'addon'

      if (
        isOfficialAddon &&
        !seenCodes.has(code) &&
        item.preco !== null &&
        item.preco !== undefined &&
        Number(item.preco) > 0 &&
        !item.observacoes?.toUpperCase().includes('ESGOTADO') &&
        item.status !== 'paused' &&
        item.status !== 'archived'
      ) {
        seenCodes.add(code)
        result.push({
          codigo: code,
          nome: item.produto.trim(),
          preco: Number(item.preco),
        })
      }
    }
  }

  return result
}

/**
 * Gera um identificador determinístico para a linha do carrinho, agrupando
 * itens idênticos (mesmo código, variante, adicionais e observação).
 */
export function buildCartItemId(
  codigo: string,
  varianteNome?: string,
  adicionais?: { codigo: string }[],
  observacao?: string
): string {
  const cleanCode = codigo.trim().toUpperCase()
  const cleanVariant = (varianteNome || '').trim().toLowerCase()
  const cleanAddons = (adicionais || [])
    .map((a) => a.codigo.trim().toUpperCase())
    .sort()
    .join(',')
  const cleanObs = (observacao || '').trim().toLowerCase()

  return `${cleanCode}::v=${cleanVariant}::a=${cleanAddons}::o=${cleanObs}`
}

export interface CreateCartItemParams {
  product: ExtendedProduct
  quantidade?: number
  varianteNome?: string
  adicionais?: {
    codigo: string
    nome: string
    precoCents: number
  }[]
  observacao?: string
}

/**
 * Cria um snapshot de item de pedido (`OrderItemSnapshot`) a partir de um produto válido.
 * Retorna `null` caso o produto não possa ser comprado (`!canProductBePurchased`).
 */
export function createCartItemSnapshot(
  params: CreateCartItemParams
): OrderItemSnapshot | null {
  const {
    product,
    quantidade = 1,
    varianteNome,
    adicionais = [],
    observacao,
  } = params

  if (!canProductBePurchased(product)) {
    return null
  }

  const safeQty = Math.max(1, Math.floor(Number(quantidade) || 1))

  // Determina o preço unitário: se houver variante correspondente com preço > 0, usa o preço da variante
  let unitPriceReais = Number(product.preco)
  let resolvedVariantName = varianteNome?.trim() || undefined

  if (resolvedVariantName && product.variantes && product.variantes.length > 0) {
    const matchedVariant = product.variantes.find(
      (v) => v.nome.trim().toLowerCase() === resolvedVariantName!.toLowerCase()
    )
    if (matchedVariant && Number(matchedVariant.preco) > 0) {
      unitPriceReais = Number(matchedVariant.preco)
      resolvedVariantName = matchedVariant.nome.trim()
    }
  }

  const precoUnitarioCents = reaisToCents(unitPriceReais)
  const sanitizedAddons = adicionais
    .filter((a) => a && a.codigo && a.nome && Number(a.precoCents) >= 0)
    .map((a) => ({
      codigo: a.codigo.trim().toUpperCase(),
      nome: a.nome.trim(),
      precoCents: Math.round(Number(a.precoCents)),
    }))

  const addonCentsList = sanitizedAddons.map((a) => a.precoCents)
  const subtotalItemCents = calculateItemTotalCents(
    precoUnitarioCents,
    addonCentsList,
    safeQty
  )

  const id = buildCartItemId(
    product.codigo,
    resolvedVariantName,
    sanitizedAddons,
    observacao
  )

  return {
    id,
    codigo: product.codigo.trim().toUpperCase(),
    produto: product.produto.trim(),
    quantidade: safeQty,
    precoUnitarioCents,
    ...(resolvedVariantName ? { varianteNome: resolvedVariantName } : {}),
    adicionais: sanitizedAddons,
    subtotalItemCents,
    ...(observacao?.trim() ? { observacao: observacao.trim() } : {}),
  }
}

/**
 * Adiciona um `OrderItemSnapshot` ao carrinho ou incrementa a quantidade se já existir configuração idêntica.
 */
export function addItemToCart(
  cart: OrderItemSnapshot[],
  newItem: OrderItemSnapshot
): OrderItemSnapshot[] {
  if (!newItem || newItem.precoUnitarioCents <= 0 || newItem.quantidade <= 0) {
    return cart
  }

  const existingIndex = cart.findIndex((item) => item.id === newItem.id)
  if (existingIndex === -1) {
    return [...cart, newItem]
  }

  const existing = cart[existingIndex]
  const nextQty = existing.quantidade + newItem.quantidade
  const addonCents = existing.adicionais.map((a) => a.precoCents)
  const updatedItem: OrderItemSnapshot = {
    ...existing,
    quantidade: nextQty,
    subtotalItemCents: calculateItemTotalCents(
      existing.precoUnitarioCents,
      addonCents,
      nextQty
    ),
  }

  const nextCart = [...cart]
  nextCart[existingIndex] = updatedItem
  return nextCart
}

/**
 * Altera a quantidade de um item do carrinho (`delta` positivo ou negativo).
 * Remove o item caso a nova quantidade seja `<= 0`.
 */
export function updateCartItemQuantity(
  cart: OrderItemSnapshot[],
  itemId: string,
  delta: number
): OrderItemSnapshot[] {
  return cart
    .map((item) => {
      if (item.id !== itemId) return item
      const nextQty = item.quantidade + delta
      if (nextQty <= 0) return null
      const addonCents = item.adicionais.map((a) => a.precoCents)
      return {
        ...item,
        quantidade: nextQty,
        subtotalItemCents: calculateItemTotalCents(
          item.precoUnitarioCents,
          addonCents,
          nextQty
        ),
      }
    })
    .filter((item): item is OrderItemSnapshot => item !== null)
}

/**
 * Remove um item do carrinho pelo seu `id`.
 */
export function removeCartItem(
  cart: OrderItemSnapshot[],
  itemId: string
): OrderItemSnapshot[] {
  return cart.filter((item) => item.id !== itemId)
}

/**
 * Carrega os itens do carrinho persistidos no `localStorage`.
 */
export function loadCartFromStorage(): OrderItemSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as OrderItemSnapshot[]
  } catch {
    return []
  }
}

/**
 * Persiste os itens do carrinho no `localStorage`.
 */
export function saveCartToStorage(cart: OrderItemSnapshot[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Ignora falhas de quota em ambientes restritos
  }
}

export interface CustomerCheckoutInput {
  clienteNome?: string
  clienteTelefone?: string
  modalidade: OrderModality
  enderecoEntrega?: {
    rua?: string
    numero?: string
    bairro?: string
    complemento?: string
    referencia?: string
  }
  // Campos planos também aceitos por conveniência
  rua?: string
  numero?: string
  bairro?: string
  complemento?: string
  referencia?: string
  numeroMesa?: string
  observacoesCliente?: string
}

export interface CustomerCheckoutValidationResult {
  valid: boolean
  isValid: boolean
  errors: string[]
  fieldErrors: Record<string, string>
  sanitized?: {
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
    observacoesCliente?: string
  }
}

/**
 * Valida os dados de identificação do cliente de acordo com a modalidade selecionada:
 * - `delivery`: exige `clienteNome`, `clienteTelefone`, `rua`, `numero`, `bairro` (`complemento` e `referencia` opcionais).
 * - `mesa`: exige `clienteNome`, `clienteTelefone`, `numeroMesa`.
 * - `retirada`: exige `clienteNome`, `clienteTelefone`.
 */
export function validateCustomerCheckoutData(
  input: CustomerCheckoutInput
): CustomerCheckoutValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  const nome = (input?.clienteNome || '').trim()
  const telefoneRaw = (input?.clienteTelefone || '').trim()
  const telefoneDigits = telefoneRaw.replace(/\D/g, '')
  const modalidade = input?.modalidade

  if (!nome || nome.length < 2) {
    const msg = 'Informe o nome do cliente.'
    errors.push(msg)
    fieldErrors.clienteNome = msg
  }

  if (!telefoneRaw || telefoneDigits.length < 8) {
    const msg = 'Informe um telefone/WhatsApp válido para contato.'
    errors.push(msg)
    fieldErrors.clienteTelefone = msg
  }

  if (
    modalidade !== 'delivery' &&
    modalidade !== 'mesa' &&
    modalidade !== 'retirada'
  ) {
    const msg = 'Selecione uma modalidade de atendimento válida (delivery, mesa ou retirada).'
    errors.push(msg)
    fieldErrors.modalidade = msg
  }

  const rua = (input?.enderecoEntrega?.rua ?? input?.rua ?? '').trim()
  const numero = (input?.enderecoEntrega?.numero ?? input?.numero ?? '').trim()
  const bairro = (input?.enderecoEntrega?.bairro ?? input?.bairro ?? '').trim()
  const complemento = (
    input?.enderecoEntrega?.complemento ??
    input?.complemento ??
    ''
  ).trim()
  const referencia = (
    input?.enderecoEntrega?.referencia ??
    input?.referencia ??
    ''
  ).trim()
  const numeroMesa = (input?.numeroMesa ?? '').trim()
  const observacoesCliente = (input?.observacoesCliente ?? '').trim()

  if (modalidade === 'delivery') {
    if (!rua) {
      const msg = 'Informe a rua/logradouro para entrega (Delivery).'
      errors.push(msg)
      fieldErrors.rua = msg
    }
    if (!numero) {
      const msg = 'Informe o número do endereço para entrega (Delivery).'
      errors.push(msg)
      fieldErrors.numero = msg
    }
    if (!bairro) {
      const msg = 'Informe o bairro para entrega (Delivery).'
      errors.push(msg)
      fieldErrors.bairro = msg
    }
  } else if (modalidade === 'mesa') {
    if (!numeroMesa) {
      const msg = 'Informe o número ou identificação da mesa para consumo no local.'
      errors.push(msg)
      fieldErrors.numeroMesa = msg
    }
  }

  const valid = errors.length === 0

  if (!valid) {
    return {
      valid: false,
      isValid: false,
      errors,
      fieldErrors,
    }
  }

  return {
    valid: true,
    isValid: true,
    errors: [],
    fieldErrors: {},
    sanitized: {
      clienteNome: nome,
      clienteTelefone: telefoneRaw,
      modalidade,
      ...(modalidade === 'delivery'
        ? {
            enderecoEntrega: {
              rua,
              numero,
              bairro,
              ...(complemento ? { complemento } : {}),
              ...(referencia ? { referencia } : {}),
            },
          }
        : {}),
      ...(modalidade === 'mesa' ? { numeroMesa } : {}),
      ...(observacoesCliente ? { observacoesCliente } : {}),
    },
  }
}

export interface ClientOrderAddonInput {
  codigo: string
  nome?: string
  precoCents?: number
  preco?: number
}

export interface ClientOrderItemInput {
  id?: string
  codigo: string
  produto?: string
  quantidade: number
  precoUnitarioCents?: number
  preco?: number
  varianteNome?: string
  adicionais?: ClientOrderAddonInput[]
  subtotalItemCents?: number
  observacao?: string
}

export interface ValidateOrderTotalsOptions {
  modalidade?: OrderModality
  taxaEntregaCents?: number
  taxaEntregaReais?: number
  rejectOnPriceTamper?: boolean
}

export interface ValidatedOrderTotalsResult {
  valid: boolean
  isValid: boolean
  priceTampered: boolean
  tamperDetails: string[]
  errors: string[]
  items: OrderItemSnapshot[]
  subtotalCents: number
  taxaEntregaCents: number
  totalCents: number
}

/**
 * Validação financeira server-side (`validateAndCalculateOrderTotals`):
 * - Recebe os itens enviados pelo navegador e o catálogo oficial de produtos.
 * - Recalcula todos os preços unitários e de adicionais a partir do catálogo oficial em centavos inteiros.
 * - Ignora e detecta preços manipulados pelo navegador (`priceTampered = true`).
 * - Bloqueia produtos inexistentes, pausados, esgotados ou sem preço aprovado (`preco === null || preco <= 0`).
 * - Aplica `taxaEntregaCents` somente quando `modalidade === 'delivery'`.
 */
export function validateAndCalculateOrderTotals(
  clientItems: ClientOrderItemInput[],
  catalog: (ExtendedProduct | InitialProduct)[],
  modalidadeOrOptions: OrderModality | ValidateOrderTotalsOptions = 'retirada',
  deliveryFeeCentsOrReais: number = 0
): ValidatedOrderTotalsResult {
  let modalidade: OrderModality = 'retirada'
  let configuredDeliveryFeeCents = 0
  let rejectOnPriceTamper = false

  if (typeof modalidadeOrOptions === 'string') {
    modalidade = modalidadeOrOptions
    // Se o valor for menor que 50 (ex: 5 ou 7.50), converte de Reais para centavos;
    // se for >= 50 (ex: 500 centavos = R$ 5,00), usa diretamente como centavos inteiros.
    if (deliveryFeeCentsOrReais > 0) {
      configuredDeliveryFeeCents =
        deliveryFeeCentsOrReais < 50 && !Number.isInteger(deliveryFeeCentsOrReais * 1)
          ? reaisToCents(deliveryFeeCentsOrReais)
          : deliveryFeeCentsOrReais < 50
          ? reaisToCents(deliveryFeeCentsOrReais)
          : Math.round(deliveryFeeCentsOrReais)
    }
  } else if (modalidadeOrOptions && typeof modalidadeOrOptions === 'object') {
    modalidade = modalidadeOrOptions.modalidade ?? 'retirada'
    rejectOnPriceTamper = Boolean(modalidadeOrOptions.rejectOnPriceTamper)
    if (modalidadeOrOptions.taxaEntregaCents !== undefined) {
      configuredDeliveryFeeCents = Math.max(
        0,
        Math.round(modalidadeOrOptions.taxaEntregaCents)
      )
    } else if (modalidadeOrOptions.taxaEntregaReais !== undefined) {
      configuredDeliveryFeeCents = Math.max(
        0,
        reaisToCents(modalidadeOrOptions.taxaEntregaReais)
      )
    }
  }

  const errors: string[] = []
  const tamperDetails: string[] = []
  const validatedItems: OrderItemSnapshot[] = []

  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    return {
      valid: false,
      isValid: false,
      priceTampered: false,
      tamperDetails: [],
      errors: ['O carrinho está vazio. Adicione ao menos um produto válido.'],
      items: [],
      subtotalCents: 0,
      taxaEntregaCents: 0,
      totalCents: 0,
    }
  }

  for (const rawItem of clientItems) {
    const code = (rawItem?.codigo || '').trim().toUpperCase()
    const qty = Math.floor(Number(rawItem?.quantidade) || 0)

    if (!code) {
      errors.push('Item do pedido sem código de produto.')
      continue
    }

    if (qty <= 0) {
      errors.push(`Quantidade inválida para o produto ${code}.`)
      continue
    }

    const catalogProduct = catalog.find(
      (p) => p.codigo.trim().toUpperCase() === code
    ) as ExtendedProduct | undefined

    if (!catalogProduct) {
      errors.push(`Produto ${code} não encontrado no catálogo oficial.`)
      continue
    }

    if (!canProductBePurchased(catalogProduct)) {
      errors.push(
        `O produto "${catalogProduct.produto}" (${code}) não possui preço aprovado ou está indisponível para compra.`
      )
      continue
    }

    // Preço oficial do produto ou variante
    let officialUnitReais = Number(catalogProduct.preco)
    let officialVariantName: string | undefined = undefined

    if (rawItem.varianteNome && rawItem.varianteNome.trim()) {
      const requestedVar = rawItem.varianteNome.trim()
      if (catalogProduct.variantes && catalogProduct.variantes.length > 0) {
        const foundVariant = catalogProduct.variantes.find(
          (v) => v.nome.trim().toLowerCase() === requestedVar.toLowerCase()
        )
        if (!foundVariant || Number(foundVariant.preco) <= 0) {
          errors.push(
            `Variante "${requestedVar}" inválida ou sem preço para o produto ${code}.`
          )
          continue
        }
        officialUnitReais = Number(foundVariant.preco)
        officialVariantName = foundVariant.nome.trim()
      } else {
        officialVariantName = requestedVar
      }
    }

    const officialUnitCents = reaisToCents(officialUnitReais)

    // Detecta manipulação de preço unitário enviada pelo cliente
    if (
      rawItem.precoUnitarioCents !== undefined &&
      Math.round(Number(rawItem.precoUnitarioCents)) !== officialUnitCents
    ) {
      tamperDetails.push(
        `Preço unitário adulterado no item ${code}: enviado ${rawItem.precoUnitarioCents} centavos, oficial é ${officialUnitCents} centavos.`
      )
    }
    if (
      rawItem.preco !== undefined &&
      reaisToCents(Number(rawItem.preco)) !== officialUnitCents
    ) {
      tamperDetails.push(
        `Preço unitário em reais adulterado no item ${code}: enviado ${rawItem.preco}, oficial é ${officialUnitReais}.`
      )
    }

    // Valida e recalcula adicionais
    const officialAddons: {
      codigo: string
      nome: string
      precoCents: number
    }[] = []

    if (Array.isArray(rawItem.adicionais) && rawItem.adicionais.length > 0) {
      for (const clientAddon of rawItem.adicionais) {
        const addonCode = (clientAddon?.codigo || '').trim().toUpperCase()
        if (!addonCode) continue

        // Procura primeiro nos adicionaisDisponiveis do produto, depois no catálogo geral
        const productConfiguredAddon = catalogProduct.adicionaisDisponiveis?.find(
          (a) => a.codigo.trim().toUpperCase() === addonCode
        )
        const catalogAddonItem = catalog.find(
          (p) => p.codigo.trim().toUpperCase() === addonCode
        )

        let officialAddonName = ''
        let officialAddonCents = -1

        if (
          productConfiguredAddon &&
          productConfiguredAddon.preco !== null &&
          Number(productConfiguredAddon.preco) > 0
        ) {
          officialAddonName = productConfiguredAddon.nome.trim()
          officialAddonCents = reaisToCents(Number(productConfiguredAddon.preco))
        } else if (
          catalogAddonItem &&
          catalogAddonItem.preco !== null &&
          Number(catalogAddonItem.preco) > 0
        ) {
          officialAddonName = catalogAddonItem.produto.trim()
          officialAddonCents = reaisToCents(Number(catalogAddonItem.preco))
        }

        if (officialAddonCents < 0) {
          errors.push(
            `Adicional ${addonCode} não possui preço aprovado ou não existe no catálogo.`
          )
          continue
        }

        if (
          clientAddon.precoCents !== undefined &&
          Math.round(Number(clientAddon.precoCents)) !== officialAddonCents
        ) {
          tamperDetails.push(
            `Preço de adicional ${addonCode} adulterado: enviado ${clientAddon.precoCents} centavos, oficial é ${officialAddonCents} centavos.`
          )
        }

        officialAddons.push({
          codigo: addonCode,
          nome: officialAddonName,
          precoCents: officialAddonCents,
        })
      }
    }

    const officialSubtotalItemCents = calculateItemTotalCents(
      officialUnitCents,
      officialAddons.map((a) => a.precoCents),
      qty
    )

    if (
      rawItem.subtotalItemCents !== undefined &&
      Math.round(Number(rawItem.subtotalItemCents)) !== officialSubtotalItemCents
    ) {
      tamperDetails.push(
        `Subtotal do item ${code} adulterado: enviado ${rawItem.subtotalItemCents} centavos, oficial é ${officialSubtotalItemCents} centavos.`
      )
    }

    const cleanObs = rawItem.observacao?.trim() || undefined
    validatedItems.push({
      id:
        rawItem.id ||
        buildCartItemId(code, officialVariantName, officialAddons, cleanObs),
      codigo: code,
      produto: catalogProduct.produto.trim(),
      quantidade: qty,
      precoUnitarioCents: officialUnitCents,
      ...(officialVariantName ? { varianteNome: officialVariantName } : {}),
      adicionais: officialAddons,
      subtotalItemCents: officialSubtotalItemCents,
      ...(cleanObs ? { observacao: cleanObs } : {}),
    })
  }

  const priceTampered = tamperDetails.length > 0
  if (priceTampered && rejectOnPriceTamper) {
    errors.push(...tamperDetails)
  }

  const appliedDeliveryFeeCents =
    modalidade === 'delivery' ? Math.max(0, configuredDeliveryFeeCents) : 0

  const totals = calculateOrderTotals(
    validatedItems.map((i) => i.subtotalItemCents),
    appliedDeliveryFeeCents,
    0
  )

  const valid = errors.length === 0 && validatedItems.length > 0

  return {
    valid,
    isValid: valid,
    priceTampered,
    tamperDetails,
    errors,
    items: validatedItems,
    subtotalCents: totals.subtotalCents,
    taxaEntregaCents: totals.deliveryFeeCents,
    totalCents: totals.totalCents,
  }
}

/**
 * Gera o próximo número de pedido sequencial no padrão `#BC-XXXX` (ex: `#BC-1001`).
 */
export function generateNextOrderNumber(existingOrders: OrderRecord[] = []): string {
  let maxNumber = 1000
  for (const order of existingOrders) {
    const match = (order.numeroPedido || '').match(/#?BC-(\d+)/i)
    if (match) {
      const parsed = parseInt(match[1], 10)
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed
      }
    }
  }
  return `#BC-${maxNumber + 1}`
}

/**
 * Formata uma data ISO no fuso horário `America/Sao_Paulo` (ex: `26/10/2026 às 21:35`).
 */
export function formatOrderDateTimeSaoPaulo(isoString: string): string {
  const dt = new Date(isoString)
  if (isNaN(dt.getTime())) return isoString

  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt)

  return dateFormatted
}

/**
 * Gera a mensagem estruturada completa para envio ao WhatsApp do Brasa Caipira.
 * Inclui obrigatoriamente:
 * - Número do pedido (`#BC-XXXX`)
 * - Data e horário formatados (`America/Sao_Paulo`)
 * - Nome do cliente e Telefone
 * - Modalidade de atendimento
 * - Endereço completo (se Delivery) ou Número da mesa (se Consumo no local)
 * - Produtos, quantidades, variações, adicionais e preços individuais
 * - Subtotal, Taxa de entrega (quando aplicável) e Total geral
 * - Observações do cliente
 * - Aviso explícito de que o pedido aguarda confirmação do estabelecimento
 */
export function buildStructuredWhatsAppOrderMessage(order: OrderRecord): string {
  const lines: string[] = []
  const formattedDateTime = formatOrderDateTimeSaoPaulo(order.createdAt)
  const modalityLabel = MODALITY_LABELS[order.modalidade] || order.modalidade

  lines.push('🔥 *PEDIDO — BRASA CAIPIRA*')
  lines.push(`📋 *Pedido:* ${order.numeroPedido}`)
  lines.push(`🕒 *Data/Hora:* ${formattedDateTime}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`👤 *Cliente:* ${order.clienteNome}`)
  lines.push(`📱 *Telefone:* ${order.clienteTelefone}`)
  lines.push(`🍽️ *Modalidade:* ${modalityLabel}`)

  if (order.modalidade === 'delivery' && order.enderecoEntrega) {
    const { rua, numero, bairro, complemento, referencia } = order.enderecoEntrega
    lines.push(`📍 *Endereço de Entrega:* ${rua}, ${numero} — ${bairro}`)
    if (complemento) {
      lines.push(`🏢 *Complemento:* ${complemento}`)
    }
    if (referencia) {
      lines.push(`📌 *Referência:* ${referencia}`)
    }
  } else if (order.modalidade === 'mesa') {
    lines.push(`🪑 *Mesa:* ${order.numeroMesa || 'Não informada'}`)
  } else {
    lines.push(
      '🏪 *Local de Retirada:* Rua dos Crisântemos, 350 — Jd. Nova Leme (Em frente ao Mercado do Angu)'
    )
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('🛒 *ITENS DO PEDIDO:*')

  order.itens.forEach((item, index) => {
    const unitFormatted = formatCentsToBRL(item.precoUnitarioCents)
    const lineTotalFormatted = formatCentsToBRL(item.subtotalItemCents)
    const variantSuffix = item.varianteNome ? ` [${item.varianteNome}]` : ''

    lines.push(
      `${index + 1}. *${item.quantidade}x ${item.produto}*${variantSuffix} (${item.codigo})`
    )
    lines.push(
      `   • Unitário: ${unitFormatted} | Subtotal item: *${lineTotalFormatted}*`
    )

    if (item.adicionais && item.adicionais.length > 0) {
      for (const addon of item.adicionais) {
        lines.push(
          `   • + Adicional: ${addon.nome} (${addon.codigo}) (+${formatCentsToBRL(
            addon.precoCents
          )})`
        )
      }
    }

    if (item.observacao) {
      lines.push(`   • Obs. do item: _${item.observacao}_`)
    }
  })

  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`💰 *Subtotal:* ${formatCentsToBRL(order.subtotalCents)}`)

  if (order.modalidade === 'delivery') {
    lines.push(`🛵 *Taxa de entrega:* ${formatCentsToBRL(order.taxaEntregaCents)}`)
  } else {
    lines.push(`🛵 *Taxa de entrega:* ${formatCentsToBRL(0)} (isento)`)
  }

  lines.push(`🔥 *TOTAL GERAL: ${formatCentsToBRL(order.totalCents)}*`)

  if (order.observacoesCliente && order.observacoesCliente.trim()) {
    lines.push('━━━━━━━━━━━━━━━━━━━━━━')
    lines.push(`📝 *Observações do cliente:* ${order.observacoesCliente.trim()}`)
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(
    '⏳ *Status:* Aguardando confirmação do estabelecimento. Por favor, aguarde nossa resposta confirmando o recebimento e o tempo de preparo!'
  )

  return lines.join('\n')
}

/**
 * Gera a URL completa `https://wa.me/...` codificada com a mensagem estruturada do pedido.
 */
export function buildWhatsAppOrderUrl(
  whatsappNumber: string,
  order: OrderRecord
): string {
  const digits = (whatsappNumber || '5519998107666').replace(/\D/g, '')
  const targetPhone = digits.length >= 10 ? digits : '5519998107666'
  const message = buildStructuredWhatsAppOrderMessage(order)
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
}

/**
 * Calcula uma assinatura determinística do conteúdo do pedido para prevenção de duplicidade.
 */
function computeOrderFingerprint(params: {
  clienteNome: string
  clienteTelefone: string
  modalidade: OrderModality
  numeroMesa?: string
  enderecoEntrega?: OrderRecord['enderecoEntrega']
  itens: OrderItemSnapshot[]
  totalCents: number
}): string {
  const itemsPart = params.itens
    .map(
      (i) =>
        `${i.codigo}:${i.quantidade}:${i.varianteNome || ''}:${i.adicionais
          .map((a) => a.codigo)
          .sort()
          .join(',')}:${i.observacao || ''}`
    )
    .sort()
    .join('|')

  const locPart =
    params.modalidade === 'delivery'
      ? `${params.enderecoEntrega?.rua || ''}-${params.enderecoEntrega?.numero || ''}-${params.enderecoEntrega?.bairro || ''}`
      : params.modalidade === 'mesa'
      ? `mesa-${params.numeroMesa || ''}`
      : 'retirada'

  return [
    params.clienteNome.trim().toLowerCase(),
    params.clienteTelefone.replace(/\D/g, ''),
    params.modalidade,
    locPart.toLowerCase(),
    itemsPart,
    String(params.totalCents),
  ].join('::')
}

export interface CreateOrderIdempotentParams {
  clienteNome: string
  clienteTelefone: string
  modalidade: OrderModality
  enderecoEntrega?: OrderRecord['enderecoEntrega']
  numeroMesa?: string
  itens: OrderItemSnapshot[]
  subtotalCents: number
  taxaEntregaCents: number
  totalCents: number
  observacoesCliente?: string
  existingOrders?: OrderRecord[]
  now?: Date
  idempotencyWindowMs?: number
  persistToStorage?: boolean
}

export interface CreateOrderIdempotentResult {
  order: OrderRecord
  orders: OrderRecord[]
  deduplicated: boolean
  isDuplicate: boolean
}

/**
 * Cria o registro `OrderRecord` com status inicial `'aguardando_confirmacao'` e
 * evita duplicar o mesmo pedido caso o cliente clique repetidamente no botão de envio
 * dentro da janela de idempotência (`idempotencyWindowMs`, padrão 15 segundos).
 */
export function createOrderIdempotent(
  params: CreateOrderIdempotentParams
): CreateOrderIdempotentResult {
  const nowDate = params.now ?? new Date()
  const nowMs = nowDate.getTime()
  const nowIso = nowDate.toISOString()
  const windowMs = params.idempotencyWindowMs ?? 15000

  let currentOrders: OrderRecord[] = []
  if (params.existingOrders !== undefined) {
    currentOrders = [...params.existingOrders]
  } else if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          currentOrders = parsed as OrderRecord[]
        }
      }
    } catch {
      currentOrders = []
    }
  }

  const targetFingerprint = computeOrderFingerprint({
    clienteNome: params.clienteNome,
    clienteTelefone: params.clienteTelefone,
    modalidade: params.modalidade,
    numeroMesa: params.numeroMesa,
    enderecoEntrega: params.enderecoEntrega,
    itens: params.itens,
    totalCents: params.totalCents,
  })

  // Verifica se já existe um pedido idêntico criado recentemente
  const existingDuplicate = currentOrders.find((existing) => {
    const existingTime = new Date(existing.createdAt).getTime()
    if (isNaN(existingTime)) return false
    if (Math.abs(nowMs - existingTime) > windowMs) return false

    const existingFingerprint = computeOrderFingerprint({
      clienteNome: existing.clienteNome,
      clienteTelefone: existing.clienteTelefone,
      modalidade: existing.modalidade,
      numeroMesa: existing.numeroMesa,
      enderecoEntrega: existing.enderecoEntrega,
      itens: existing.itens,
      totalCents: existing.totalCents,
    })

    return existingFingerprint === targetFingerprint
  })

  if (existingDuplicate) {
    return {
      order: existingDuplicate,
      orders: currentOrders,
      deduplicated: true,
      isDuplicate: true,
    }
  }

  const numeroPedido = generateNextOrderNumber(currentOrders)
  const newOrder: OrderRecord = {
    id: `ord-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    numeroPedido,
    createdAt: nowIso,
    updatedAt: nowIso,
    clienteNome: params.clienteNome.trim(),
    clienteTelefone: params.clienteTelefone.trim(),
    modalidade: params.modalidade,
    ...(params.modalidade === 'delivery' && params.enderecoEntrega
      ? { enderecoEntrega: params.enderecoEntrega }
      : {}),
    ...(params.modalidade === 'mesa' && params.numeroMesa
      ? { numeroMesa: params.numeroMesa.trim() }
      : {}),
    itens: params.itens,
    subtotalCents: params.subtotalCents,
    taxaEntregaCents:
      params.modalidade === 'delivery' ? params.taxaEntregaCents : 0,
    totalCents: params.totalCents,
    ...(params.observacoesCliente?.trim()
      ? { observacoesCliente: params.observacoesCliente.trim() }
      : {}),
    status: 'aguardando_confirmacao',
    whatsappOpenedAt: nowIso,
  }

  const updatedOrders = [newOrder, ...currentOrders]

  if (params.persistToStorage !== false && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        ORDERS_STORAGE_KEY,
        JSON.stringify(updatedOrders)
      )
    } catch {
      // Ignora erro de storage em ambiente restrito
    }
  }

  return {
    order: newOrder,
    orders: updatedOrders,
    deduplicated: false,
    isDuplicate: false,
  }
}
