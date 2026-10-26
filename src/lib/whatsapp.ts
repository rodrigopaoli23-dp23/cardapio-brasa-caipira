/**
 * BRASA CAIPIRA — Módulo de Integração WhatsApp
 * Telefone comercial oficial: (19) 99810-7666 -> 5519998107666
 * 
 * Regra de Negócio Obrigatória:
 * A abertura do WhatsApp NÃO representa pedido confirmado.
 * O pedido é registrado no sistema como 'awaiting_whatsapp_dispatch' e
 * só passa para 'received_confirmed' quando o estabelecimento responder
 * confirmando o recebimento da mensagem.
 */

import { Order } from '@/types/database.types'
import { formatCentsToBRL } from '@/lib/money'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5519998107666'

/**
 * Monta o texto formatado do pedido para envio ao WhatsApp da casa.
 */
export function generateWhatsAppOrderMessage(order: Order): string {
  const isDelivery = order.delivery.type === 'delivery'
  const deliveryTypeLabel = isDelivery ? 'Entrega em Domicílio' : 'Retirada no Balcão'

  const lines: string[] = []

  lines.push('🔥 *PEDIDO BRASA CAIPIRA*')
  lines.push(`*Código:* ${order.order_code}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`👤 *Cliente:* ${order.customer.name.trim()}`)
  lines.push(`📱 *Telefone:* ${order.customer.phone.trim()}`)
  lines.push(`📍 *Modalidade:* ${deliveryTypeLabel}`)

  if (isDelivery) {
    const d = order.delivery
    lines.push(`🏠 *Endereço:* ${d.street ?? ''}, ${d.number ?? 'S/N'}`)
    if (d.complement) lines.push(`🏢 *Complemento:* ${d.complement}`)
    lines.push(`🏘️ *Bairro:* ${d.neighborhood_name ?? 'Leme/SP'}`)
    if (d.reference) lines.push(`📌 *Referência:* ${d.reference}`)
  } else {
    lines.push('🏪 *Retirada:* Rua dos Crisântemos, 350 — Jd. Nova Leme (Em frente ao Mercado do Angu)')
  }

  lines.push('')
  lines.push('🛒 *ITENS DO PEDIDO:*')

  order.items.forEach((item, index) => {
    const itemTotal = formatCentsToBRL(item.item_total_cents)
    lines.push(`${index + 1}. *${item.quantity}x ${item.product_name}* (${itemTotal})`)

    if (item.variant_name) {
      lines.push(`   • Variação: ${item.variant_name}`)
    }

    if (item.selected_options && item.selected_options.length > 0) {
      item.selected_options.forEach((opt) => {
        const addPrice =
          opt.additional_price_cents > 0
            ? ` (+${formatCentsToBRL(opt.additional_price_cents)})`
            : ''
        lines.push(`   • ${opt.group_name}: ${opt.item_name}${addPrice}`)
      })
    }

    if (item.notes && item.notes.trim() !== '') {
      lines.push(`   • Obs: _${item.notes.trim()}_`)
    }
  })

  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`Subtotal: ${formatCentsToBRL(order.subtotal_cents)}`)

  if (isDelivery) {
    lines.push(`Taxa de Entrega: ${formatCentsToBRL(order.delivery_fee_cents)}`)
  }

  if (order.discount_cents > 0) {
    lines.push(`Desconto: -${formatCentsToBRL(order.discount_cents)}`)
  }

  lines.push(`*TOTAL: ${formatCentsToBRL(order.total_cents)}*`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━')

  // Informações de Pagamento
  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    dinheiro: 'Dinheiro',
  }

  const paymentText = paymentLabels[order.payment.method] ?? order.payment.method
  lines.push(`💳 *Forma de Pagamento:* ${paymentText}`)

  if (order.payment.method === 'dinheiro' && order.payment.change_for_cents) {
    lines.push(`💵 *Troco para:* ${formatCentsToBRL(order.payment.change_for_cents)}`)
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('_Por favor, aguarde a confirmação de recebimento deste pedido pelo estabelecimento._')

  return lines.join('\n')
}

/**
 * Constrói o link oficial do wa.me para redirecionamento.
 */
export function buildWhatsAppLink(order: Order, phone: string = WHATSAPP_NUMBER): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const message = generateWhatsAppOrderMessage(order)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}
