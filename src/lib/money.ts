/**
 * BRASA CAIPIRA — Módulo Financeiro
 * Manipulação segura de valores monetários utilizando centavos inteiros (integers)
 * para prevenir erros de arredondamento inerentes ao ponto flutuante (IEEE 754).
 */

/**
 * Converte valor em centavos para string formatada em Real (BRL).
 * Exemplo: 2800 -> "R$ 28,00"
 */
export function formatCentsToBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'Preço a consultar'
  }
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Converte valor em reais (float/decimal) para centavos inteiros.
 * Exemplo: 28.5 -> 2850
 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Calcula o valor total de uma linha de item do pedido em centavos.
 * total = (preço_base + soma_dos_adicionais) * quantidade
 */
export function calculateItemTotalCents(
  basePriceCents: number,
  additionalOptionsCents: number[],
  quantity: number
): number {
  if (quantity <= 0) return 0
  const optionsTotal = additionalOptionsCents.reduce((acc, curr) => acc + curr, 0)
  const singleItemCents = Math.max(0, basePriceCents + optionsTotal)
  return singleItemCents * quantity
}

/**
 * Recalcula o total do pedido com segurança no servidor.
 * total = subtotal + taxa_entrega - desconto
 */
export function calculateOrderTotals(
  itemsTotalsCents: number[],
  deliveryFeeCents: number,
  discountCents: number = 0
): {
  subtotalCents: number
  deliveryFeeCents: number
  discountCents: number
  totalCents: number
} {
  const subtotalCents = itemsTotalsCents.reduce((acc, curr) => acc + curr, 0)
  const safeDeliveryFee = Math.max(0, deliveryFeeCents)
  const safeDiscount = Math.max(0, Math.min(discountCents, subtotalCents))
  const totalCents = Math.max(0, subtotalCents + safeDeliveryFee - safeDiscount)

  return {
    subtotalCents,
    deliveryFeeCents: safeDeliveryFee,
    discountCents: safeDiscount,
    totalCents,
  }
}
