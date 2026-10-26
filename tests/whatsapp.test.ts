import { describe, it, expect } from 'vitest'
import {
  generateWhatsAppOrderMessage,
  buildWhatsAppLink,
} from '../src/lib/whatsapp'
import { Order } from '../src/types/database.types'

const mockOrderDelivery: Order = {
  id: 'ord-123',
  order_code: '#BC-1045',
  customer: {
    name: 'Lucas Meirelles',
    phone: '(19) 99876-5432',
  },
  delivery: {
    type: 'delivery',
    neighborhood_name: 'Jd. Nova Leme',
    street: 'Rua das Hortênsias',
    number: '142',
    complement: 'Apto 12',
    reference: 'Próximo ao Mercado do Angu',
    delivery_fee_cents: 500,
  },
  payment: {
    method: 'pix',
  },
  items: [
    {
      id: 'item-1',
      product_id: 'prod-015',
      product_code: 'BC-015',
      product_name: 'X-Espeto Especial',
      product_unit: 'lanche',
      unit_price_cents: 2800,
      quantity: 1,
      selected_options: [
        {
          group_id: 'grp-1',
          group_name: 'Espeto',
          item_id: 'opt-1',
          item_name: 'Fraldinha Extra Grill',
          additional_price_cents: 0,
        },
        {
          group_id: 'grp-2',
          group_name: 'Adicionais',
          item_id: 'opt-2',
          item_name: 'Doritos',
          additional_price_cents: 0,
        },
      ],
      notes: 'Pouco molho especial',
      item_total_cents: 2800,
    },
    {
      id: 'item-2',
      product_id: 'prod-028',
      product_code: 'BC-028',
      product_name: 'Coca-Cola lata 350ml',
      product_unit: 'lata',
      unit_price_cents: 600,
      quantity: 2,
      selected_options: [],
      item_total_cents: 1200,
    },
  ],
  subtotal_cents: 4000,
  delivery_fee_cents: 500,
  discount_cents: 0,
  total_cents: 4500,
  status: 'awaiting_whatsapp_dispatch',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('Módulo de Integração WhatsApp (Brasa Caipira)', () => {
  it('deve gerar texto da mensagem com estrutura limpa e todos os detalhes do pedido', () => {
    const message = generateWhatsAppOrderMessage(mockOrderDelivery)

    expect(message).toContain('*PEDIDO BRASA CAIPIRA*')
    expect(message).toContain('#BC-1045')
    expect(message).toContain('Lucas Meirelles')
    expect(message).toContain('Jd. Nova Leme')
    expect(message).toContain('Rua das Hortênsias, 142')
    expect(message).toContain('1x X-Espeto Especial')
    expect(message).toContain('Pouco molho especial')
    expect(message).toContain('2x Coca-Cola lata 350ml')
    expect(message).toContain('Subtotal: R$\xa040,00')
    expect(message).toContain('Taxa de Entrega: R$\xa05,00')
    expect(message).toContain('*TOTAL: R$\xa045,00*')
    expect(message).toContain('PIX')
  })

  it('deve gerar o link wa.me correto com o telefone comercial (19) 99810-7666', () => {
    const link = buildWhatsAppLink(mockOrderDelivery, '5519998107666')

    expect(link.startsWith('https://wa.me/5519998107666?text=')).toBe(true)
    // Verifica se os caracteres especiais foram codificados corretamente
    expect(link).toContain('%23BC-1045') // #BC-1045
    expect(link).not.toContain('\n') // quebras de linha devem estar codificadas (%0A)
  })

  it('deve formatar adequadamente pedido na modalidade Retirada no Balcão', () => {
    const mockOrderTakeout: Order = {
      ...mockOrderDelivery,
      delivery: {
        type: 'takeout',
        delivery_fee_cents: 0,
      },
      total_cents: 4000,
    }

    const message = generateWhatsAppOrderMessage(mockOrderTakeout)
    expect(message).toContain('Retirada no Balcão')
    expect(message).toContain('Rua dos Crisântemos, 350')
    expect(message).not.toContain('Taxa de Entrega:')
  })
})
