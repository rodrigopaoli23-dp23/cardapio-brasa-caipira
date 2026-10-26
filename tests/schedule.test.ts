import { describe, it, expect } from 'vitest'
import {
  checkProductAvailability,
  parseTimeToMinutes,
} from '../src/lib/schedule'
import { Product } from '../src/types/database.types'

const mockBaseProduct: Product = {
  id: 'prod-001',
  category_id: 'cat-001',
  code: 'BC-001',
  name: 'Espetinho Bovino',
  description: 'Espetinho na brasa',
  ingredients: 'Carne bovina selecionada',
  product_type: 'commercial',
  base_price_cents: 1200,
  unit: 'espeto',
  status: 'published',
  availability_status: 'in_stock',
  schedule: {
    available_days: ['wednesday', 'thursday', 'friday', 'saturday'],
    start_time: '18:00',
    end_time: '23:00',
    is_time_restricted: true,
  },
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('Módulo de Horários e Disponibilidade (Brasa Caipira)', () => {
  it('converte string de hora para minutos corretamente', () => {
    expect(parseTimeToMinutes('18:00')).toBe(1080)
    expect(parseTimeToMinutes('23:30')).toBe(1410)
    expect(parseTimeToMinutes(null)).toBeNull()
  })

  it('REGRA OBRIGATÓRIA: produto sem dias configurados NÃO deve estar disponível', () => {
    const productWithoutSchedule: Product = {
      ...mockBaseProduct,
      schedule: {
        available_days: [],
        start_time: null,
        end_time: null,
        is_time_restricted: false,
      },
    }

    const result = checkProductAvailability(productWithoutSchedule)
    expect(result.isAvailable).toBe(false)
    expect(result.badgeText).toBe('Horário sob consulta')
  })

  it('produto em rascunho (draft) jamais deve estar disponível no cardápio', () => {
    const draftProduct: Product = {
      ...mockBaseProduct,
      status: 'draft',
    }

    const result = checkProductAvailability(draftProduct)
    expect(result.isAvailable).toBe(false)
    expect(result.badgeText).toBe('Não publicado')
  })

  it('produto sem preço definido não deve estar disponível para venda direta', () => {
    const unpricedProduct: Product = {
      ...mockBaseProduct,
      base_price_cents: null,
    }

    const result = checkProductAvailability(unpricedProduct)
    expect(result.isAvailable).toBe(false)
    expect(result.badgeText).toBe('Preço a confirmar')
  })

  it('produto marcado como esgotado (out_of_stock) deve exibir badge correspondente', () => {
    const outOfStockProduct: Product = {
      ...mockBaseProduct,
      availability_status: 'out_of_stock',
    }

    const result = checkProductAvailability(outOfStockProduct)
    expect(result.isAvailable).toBe(false)
    expect(result.badgeText).toBe('Esgotado hoje')
  })

  it('itens de receita histórica ou ideias futuras não devem ser vendidos diretamente', () => {
    const historicalRecipe: Product = {
      ...mockBaseProduct,
      product_type: 'historical_recipe',
    }

    const result = checkProductAvailability(historicalRecipe)
    expect(result.isAvailable).toBe(false)
    expect(result.badgeText).toBe('Não comercializável')
  })

  it('Frango assado de domingo: deve estar disponível apenas no domingo na janela correta', () => {
    const frangoAssado: Product = {
      ...mockBaseProduct,
      code: 'BC-052',
      name: 'Frango Assado com Batata',
      schedule: {
        available_days: ['sunday'],
        start_time: '10:00',
        end_time: '14:00',
        is_time_restricted: true,
      },
    }

    // Simulando Domingo às 11:30 (horário de Brasília)
    const sundayMorning = new Date('2026-11-01T14:30:00Z') // 11:30 em UTC-3
    const resultAvailable = checkProductAvailability(frangoAssado, sundayMorning)
    expect(resultAvailable.isAvailable).toBe(true)

    // Simulando Terça-feira às 19:00
    const tuesdayEvening = new Date('2026-11-03T22:00:00Z') // 19:00 em UTC-3
    const resultBlocked = checkProductAvailability(frangoAssado, tuesdayEvening)
    expect(resultBlocked.isAvailable).toBe(false)
    expect(resultBlocked.badgeText).toContain('Domingo')
  })
})
