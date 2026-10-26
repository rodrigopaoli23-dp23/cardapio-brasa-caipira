import { describe, it, expect } from 'vitest'
import {
  formatCentsToBRL,
  reaisToCents,
  calculateItemTotalCents,
  calculateOrderTotals,
} from '../src/lib/money'

describe('Módulo Financeiro — Brasa Caipira (Cálculos em Centavos)', () => {
  it('deve formatar centavos inteiros em BRL corretamente', () => {
    expect(formatCentsToBRL(2800)).toBe('R$\xa028,00')
    expect(formatCentsToBRL(850)).toBe('R$\xa08,50')
    expect(formatCentsToBRL(0)).toBe('R$\xa00,00')
    expect(formatCentsToBRL(null)).toBe('Preço a consultar')
  })

  it('deve converter valores em reais float para centavos inteiros sem perda de precisão', () => {
    expect(reaisToCents(28.0)).toBe(2800)
    expect(reaisToCents(8.5)).toBe(850)
    expect(reaisToCents(39.9)).toBe(3990)
  })

  it('deve calcular corretamente o total de um item com múltiplos adicionais', () => {
    // Ex: X-Espeto Especial (base R$ 25,00) + Doritos (R$ 3,00) + Picles (R$ 2,00) = R$ 30,00 cada. Qtd 2 = R$ 60,00
    const basePrice = 2500
    const additionals = [300, 200]
    const quantity = 2

    const itemTotal = calculateItemTotalCents(basePrice, additionals, quantity)
    expect(itemTotal).toBe(6000)
  })

  it('deve retornar 0 se a quantidade for zero ou negativa', () => {
    expect(calculateItemTotalCents(2500, [300], 0)).toBe(0)
    expect(calculateItemTotalCents(2500, [300], -1)).toBe(0)
  })

  it('deve calcular os totais do pedido no servidor com taxa de entrega e desconto', () => {
    const itemsTotals = [6000, 1200] // R$ 60,00 + R$ 12,00 = Subtotal R$ 72,00
    const deliveryFee = 500 // R$ 5,00
    const discount = 200 // R$ 2,00

    const totals = calculateOrderTotals(itemsTotals, deliveryFee, discount)

    expect(totals.subtotalCents).toBe(7200)
    expect(totals.deliveryFeeCents).toBe(500)
    expect(totals.discountCents).toBe(200)
    expect(totals.totalCents).toBe(7500) // 7200 + 500 - 200 = 7500 (R$ 75,00)
  })

  it('não deve permitir que o desconto torne o total negativo', () => {
    const itemsTotals = [2000] // R$ 20,00
    const deliveryFee = 0
    const discount = 5000 // R$ 50,00 (maior que o subtotal)

    const totals = calculateOrderTotals(itemsTotals, deliveryFee, discount)
    expect(totals.totalCents).toBe(0)
  })
})
