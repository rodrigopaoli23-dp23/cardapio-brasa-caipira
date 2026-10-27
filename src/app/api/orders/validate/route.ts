import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_PRODUCTS } from '@/data/initialCatalog'
import {
  buildStructuredWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  ClientOrderItemInput,
  createOrderIdempotent,
  validateAndCalculateOrderTotals,
  validateCustomerCheckoutData,
} from '@/lib/checkoutAndCart'
import { ExtendedProduct, OrderModality, OrderRecord } from '@/types/phase3.types'
import { reaisToCents } from '@/lib/money'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const clientItems: ClientOrderItemInput[] = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.itens)
      ? body.itens
      : []

    const catalog: ExtendedProduct[] =
      Array.isArray(body?.catalog) && body.catalog.length > 0
        ? body.catalog
        : (INITIAL_PRODUCTS as ExtendedProduct[])

    const modalidade: OrderModality = body?.modalidade || 'retirada'

    // 1. Validação dos dados do cliente conforme a modalidade
    const customerValidation = validateCustomerCheckoutData({
      clienteNome: body?.clienteNome,
      clienteTelefone: body?.clienteTelefone,
      modalidade,
      enderecoEntrega: body?.enderecoEntrega,
      rua: body?.rua,
      numero: body?.numero,
      bairro: body?.bairro,
      complemento: body?.complemento,
      referencia: body?.referencia,
      numeroMesa: body?.numeroMesa,
      observacoesCliente: body?.observacoesCliente,
    })

    // 2. Determinação segura da taxa de entrega em centavos
    const taxaEntregaCents =
      body?.taxaEntregaCents !== undefined
        ? Math.max(0, Math.round(Number(body.taxaEntregaCents) || 0))
        : body?.taxaEntregaPadraoReais !== undefined
        ? Math.max(0, reaisToCents(Number(body.taxaEntregaPadraoReais) || 0))
        : 500

    // 3. Validação financeira server-side e verificação de preços adulterados ou itens sem preço aprovado
    const rejectOnPriceTamper = body?.rejectOnPriceTamper !== false
    const totalsValidation = validateAndCalculateOrderTotals(
      clientItems,
      catalog,
      {
        modalidade,
        taxaEntregaCents,
        rejectOnPriceTamper,
      }
    )

    if (!customerValidation.valid || !totalsValidation.valid) {
      return NextResponse.json(
        {
          valid: false,
          errors: [
            ...customerValidation.errors,
            ...totalsValidation.errors,
          ],
          fieldErrors: customerValidation.fieldErrors,
          priceTampered: totalsValidation.priceTampered,
          tamperDetails: totalsValidation.tamperDetails,
          recalculatedTotals: {
            subtotalCents: totalsValidation.subtotalCents,
            taxaEntregaCents: totalsValidation.taxaEntregaCents,
            totalCents: totalsValidation.totalCents,
          },
        },
        { status: 400 }
      )
    }

    const sanitizedCustomer = customerValidation.sanitized!
    const existingOrders: OrderRecord[] = Array.isArray(body?.existingOrders)
      ? body.existingOrders
      : []

    // 4. Criação idempotente do pedido com status inicial 'aguardando_confirmacao'
    const { order, deduplicated } = createOrderIdempotent({
      clienteNome: sanitizedCustomer.clienteNome,
      clienteTelefone: sanitizedCustomer.clienteTelefone,
      modalidade: sanitizedCustomer.modalidade,
      enderecoEntrega: sanitizedCustomer.enderecoEntrega,
      numeroMesa: sanitizedCustomer.numeroMesa,
      observacoesCliente: sanitizedCustomer.observacoesCliente,
      itens: totalsValidation.items,
      subtotalCents: totalsValidation.subtotalCents,
      taxaEntregaCents: totalsValidation.taxaEntregaCents,
      totalCents: totalsValidation.totalCents,
      existingOrders,
      persistToStorage: false,
    })

    const whatsappNumber = body?.telefoneWhatsapp || '5519998107666'
    const whatsappMessage = buildStructuredWhatsAppOrderMessage(order)
    const whatsappUrl = buildWhatsAppOrderUrl(whatsappNumber, order)

    return NextResponse.json(
      {
        valid: true,
        deduplicated,
        priceTampered: totalsValidation.priceTampered,
        order,
        numeroPedido: order.numeroPedido,
        status: order.status,
        whatsappMessage,
        whatsappUrl,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        valid: false,
        errors: ['Payload de pedido inválido ou malformado.'],
      },
      { status: 400 }
    )
  }
}
