import { describe, it, expect, beforeEach } from 'vitest'
import {
  ALL_ORDER_STATUSES,
  ORDERS_STORAGE_KEY,
  calculateSalesDashboardMetrics,
  filterOrders,
  generateOrdersXlsxBuffer,
  isConfirmedRevenueStatus,
  isPendingOrderStatus,
  loadOrders,
  saveOrders,
  updateOrderStatus,
} from '@/lib/ordersAndReports'
import { OrderLifecycleStatus, OrderRecord } from '@/types/phase3.types'

function createMockOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: overrides.id || 'ord-1',
    numeroPedido: overrides.numeroPedido || '#BC-1001',
    createdAt: overrides.createdAt || '2026-10-26T20:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-10-26T20:00:00.000Z',
    clienteNome: overrides.clienteNome || 'João da Silva',
    clienteTelefone: overrides.clienteTelefone || '19998107666',
    modalidade: overrides.modalidade || 'delivery',
    enderecoEntrega: overrides.enderecoEntrega || {
      rua: 'Rua Dr. Querubino Soeiro',
      numero: '97',
      bairro: 'Bela Vista',
    },
    itens: overrides.itens || [
      {
        id: 'item-1',
        codigo: 'BC-026',
        produto: 'Churrasco Grego no Pão Francês',
        quantidade: 2,
        precoUnitarioCents: 2500,
        adicionais: [{ codigo: 'BC-037', nome: 'Queijo Prato', precoCents: 400 }],
        subtotalItemCents: 5800,
      },
    ],
    subtotalCents: overrides.subtotalCents ?? 5800,
    taxaEntregaCents: overrides.taxaEntregaCents ?? 500,
    totalCents: overrides.totalCents ?? 6300,
    status: overrides.status || 'aguardando_confirmacao',
    observacoesCliente: overrides.observacoesCliente || 'Sem cebola',
  }
}

describe('Módulo de Pedidos, Indicadores Financeiros e Exportação Excel (.xlsx)', () => {
  const referenceDate = new Date('2026-10-26T21:00:00.000Z')

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ORDERS_STORAGE_KEY)
    }
  })

  it('separa estritamente faturamento confirmado de pedidos apenas iniciados (aguardando_confirmacao) ou cancelados', () => {
    const orders: OrderRecord[] = [
      // Apenas iniciados — NÃO podem somar no faturamento realizado nem no ticket médio
      createMockOrder({
        id: 'pendente-1',
        numeroPedido: '#BC-1001',
        status: 'checkout_iniciado',
        totalCents: 4500,
        createdAt: '2026-10-26T19:00:00.000Z',
      }),
      createMockOrder({
        id: 'pendente-2',
        numeroPedido: '#BC-1002',
        status: 'aguardando_confirmacao',
        totalCents: 8000,
        createdAt: '2026-10-26T19:30:00.000Z',
      }),
      // Cancelado — NÃO pode somar no faturamento realizado
      createMockOrder({
        id: 'cancelado-1',
        numeroPedido: '#BC-1003',
        status: 'cancelado',
        totalCents: 9900,
        createdAt: '2026-10-26T19:45:00.000Z',
      }),
      // Confirmados / Concluídos — DEVEM somar no faturamento realizado
      createMockOrder({
        id: 'conf-hoje',
        numeroPedido: '#BC-1004',
        status: 'confirmado',
        totalCents: 5000,
        createdAt: '2026-10-26T20:00:00.000Z',
      }),
      createMockOrder({
        id: 'concl-semana',
        numeroPedido: '#BC-1005',
        status: 'concluido',
        totalCents: 7000,
        createdAt: '2026-10-23T20:00:00.000Z', // 3 dias atrás (mesma semana e mês)
      }),
      createMockOrder({
        id: 'prep-mes',
        numeroPedido: '#BC-1006',
        status: 'em_preparacao',
        totalCents: 6000,
        createdAt: '2026-10-05T20:00:00.000Z', // mesmo mês, fora dos últimos 7 dias
      }),
      createMockOrder({
        id: 'pronto-ano',
        numeroPedido: '#BC-1007',
        status: 'pronto',
        totalCents: 10000,
        createdAt: '2026-03-15T20:00:00.000Z', // mesmo ano, outro mês
      }),
    ]

    const metrics = calculateSalesDashboardMetrics(orders, referenceDate)

    expect(metrics.totalPedidosCount).toBe(7)
    expect(metrics.pedidosPendentesCount).toBe(2)
    expect(metrics.pedidosCanceladosCount).toBe(1)
    expect(metrics.pedidosConfirmadosConcluidosCount).toBe(4)

    // Valor pendente (4500 + 8000 = 12500) separado do faturamento confirmado
    expect(metrics.valorPendenteNaoConfirmadoCents).toBe(12500)

    // Vendas confirmadas por janela temporal
    expect(metrics.vendasDiaCents).toBe(5000)
    expect(metrics.vendasSemanaCents).toBe(5000 + 7000) // 12000
    expect(metrics.vendasMesCents).toBe(5000 + 7000 + 6000) // 18000
    expect(metrics.vendasAnoCents).toBe(5000 + 7000 + 6000 + 10000) // 28000
    expect(metrics.faturamentoConfirmadoTotalCents).toBe(28000)

    // Ticket médio calculado exclusivamente sobre os 4 pedidos confirmados (28000 / 4 = 7000)
    expect(metrics.ticketMedioCents).toBe(7000)
  })

  it('retorna faturamento zero e ticket médio zero quando só existem pedidos aguardando confirmação', () => {
    const onlyUnconfirmed: OrderRecord[] = [
      createMockOrder({ id: 'u-1', status: 'aguardando_confirmacao', totalCents: 6500 }),
      createMockOrder({ id: 'u-2', status: 'checkout_iniciado', totalCents: 3500 }),
    ]

    const metrics = calculateSalesDashboardMetrics(onlyUnconfirmed, referenceDate)

    expect(metrics.vendasDiaCents).toBe(0)
    expect(metrics.vendasSemanaCents).toBe(0)
    expect(metrics.vendasMesCents).toBe(0)
    expect(metrics.vendasAnoCents).toBe(0)
    expect(metrics.faturamentoConfirmadoTotalCents).toBe(0)
    expect(metrics.ticketMedioCents).toBe(0)
    expect(metrics.pedidosPendentesCount).toBe(2)
    expect(metrics.valorPendenteNaoConfirmadoCents).toBe(10000)
  })

  it('permite atualizar manualmente o status pelos 7 estados do ciclo de vida do pedido', () => {
    expect(ALL_ORDER_STATUSES).toHaveLength(7)

    let currentOrders: OrderRecord[] = [
      createMockOrder({ id: 'lifecycle-1', status: 'checkout_iniciado', totalCents: 5400 }),
    ]

    const transitions: OrderLifecycleStatus[] = [
      'checkout_iniciado',
      'aguardando_confirmacao',
      'confirmado',
      'em_preparacao',
      'pronto',
      'concluido',
      'cancelado',
    ]

    for (const nextStatus of transitions) {
      currentOrders = updateOrderStatus(currentOrders, 'lifecycle-1', nextStatus)
      expect(currentOrders[0].status).toBe(nextStatus)

      if (['confirmado', 'em_preparacao', 'pronto', 'concluido'].includes(nextStatus)) {
        expect(isConfirmedRevenueStatus(currentOrders[0].status)).toBe(true)
        expect(isPendingOrderStatus(currentOrders[0].status)).toBe(false)
      } else if (['checkout_iniciado', 'aguardando_confirmacao'].includes(nextStatus)) {
        expect(isConfirmedRevenueStatus(currentOrders[0].status)).toBe(false)
        expect(isPendingOrderStatus(currentOrders[0].status)).toBe(true)
      } else {
        expect(isConfirmedRevenueStatus(currentOrders[0].status)).toBe(false)
        expect(isPendingOrderStatus(currentOrders[0].status)).toBe(false)
      }
    }

    // Verifica persistência se localStorage estiver disponível
    if (typeof window !== 'undefined' && window.localStorage) {
      saveOrders(currentOrders)
      const loaded = loadOrders()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].status).toBe('cancelado')
    }
  })

  it('filtra pedidos por período, status e busca textual', () => {
    const orders: OrderRecord[] = [
      createMockOrder({
        id: 'f-1',
        numeroPedido: '#BC-2001',
        clienteNome: 'Maria Oliveira',
        status: 'confirmado',
        createdAt: '2026-10-26T18:30:00.000Z',
      }),
      createMockOrder({
        id: 'f-2',
        numeroPedido: '#BC-2002',
        clienteNome: 'Carlos Souza',
        status: 'aguardando_confirmacao',
        createdAt: '2026-10-22T18:30:00.000Z',
      }),
      createMockOrder({
        id: 'f-3',
        numeroPedido: '#BC-2003',
        clienteNome: 'Fernanda Lima',
        status: 'concluido',
        createdAt: '2026-02-10T18:30:00.000Z',
      }),
    ]

    const todayOnly = filterOrders(orders, {
      period: 'today',
      status: 'all',
      referenceDate,
    })
    expect(todayOnly).toHaveLength(1)
    expect(todayOnly[0].numeroPedido).toBe('#BC-2001')

    const weekOnly = filterOrders(orders, {
      period: 'week',
      status: 'all',
      referenceDate,
    })
    expect(weekOnly).toHaveLength(2)

    const yearConfirmed = filterOrders(orders, {
      period: 'year',
      status: 'concluido',
      referenceDate,
    })
    expect(yearConfirmed).toHaveLength(1)
    expect(yearConfirmed[0].clienteNome).toBe('Fernanda Lima')

    const searchByClient = filterOrders(orders, {
      period: 'all',
      status: 'all',
      search: 'carlos',
      referenceDate,
    })
    expect(searchByClient).toHaveLength(1)
    expect(searchByClient[0].numeroPedido).toBe('#BC-2002')
  })

  it('gera binário Excel (.xlsx) válido com assinatura PKZIP e estrutura OpenXML completa', () => {
    const sampleOrders: OrderRecord[] = [
      createMockOrder({
        id: 'xlsx-1',
        numeroPedido: '#BC-3001',
        clienteNome: 'Roberto Caipira',
        clienteTelefone: '19998107666',
        status: 'concluido',
        totalCents: 6300,
        observacoesCliente: 'Caprichar na farofa',
      }),
    ]

    const xlsxBuffer = generateOrdersXlsxBuffer(sampleOrders)

    expect(xlsxBuffer).toBeInstanceOf(Uint8Array)
    expect(xlsxBuffer.byteLength).toBeGreaterThan(500)

    // Assinatura ZIP "PK\x03\x04" nos 4 primeiros bytes
    expect(xlsxBuffer[0]).toBe(0x50) // 'P'
    expect(xlsxBuffer[1]).toBe(0x4b) // 'K'
    expect(xlsxBuffer[2]).toBe(0x03)
    expect(xlsxBuffer[3]).toBe(0x04)

    // Como o container ZIP utiliza método STORED para máxima portabilidade,
    // podemos inspecionar os artefatos OpenXML diretamente no fluxo binário decodificado
    const decodedText = new TextDecoder().decode(xlsxBuffer)
    expect(decodedText).toContain('[Content_Types].xml')
    expect(decodedText).toContain('xl/workbook.xml')
    expect(decodedText).toContain('xl/worksheets/sheet1.xml')
    expect(decodedText).toContain('Número do Pedido')
    expect(decodedText).toContain('#BC-3001')
    expect(decodedText).toContain('Roberto Caipira')
    expect(decodedText).toContain('Entregue ou concluído')
    expect(decodedText).toContain('Caprichar na farofa')
  })
})
