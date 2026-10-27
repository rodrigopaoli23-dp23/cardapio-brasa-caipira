'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Search,
  Filter,
  ShoppingBag,
  Phone,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { OrderLifecycleStatus, OrderRecord } from '@/types/phase3.types'
import { formatCentsToBRL } from '@/lib/money'
import {
  ALL_ORDER_STATUSES,
  ORDER_MODALITY_LABELS,
  ORDER_STATUS_LABELS,
  OrderPeriodFilter,
  calculateSalesDashboardMetrics,
  downloadOrdersExcel,
  filterOrders,
  formatOrderLocation,
  isConfirmedRevenueStatus,
  isPendingOrderStatus,
  loadOrders,
  updateOrderStatus,
} from '@/lib/ordersAndReports'

export interface OrdersAndSalesTabProps {
  orders?: OrderRecord[]
  onOrdersChange?: (updated: OrderRecord[]) => void
}

const PERIOD_OPTIONS: { value: OrderPeriodFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana (7d)' },
  { value: 'month', label: 'Mês Atual' },
  { value: 'year', label: 'Ano Atual' },
  { value: 'all', label: 'Todos' },
]

function getStatusBadgeClasses(status: OrderLifecycleStatus): string {
  switch (status) {
    case 'checkout_iniciado':
      return 'bg-stone-100 text-stone-700 border-stone-300'
    case 'aguardando_confirmacao':
      return 'bg-[#f59e0b]/15 text-amber-800 border-[#f59e0b]/40'
    case 'confirmado':
      return 'bg-[#15803d]/15 text-[#15803d] border-[#15803d]/30'
    case 'em_preparacao':
      return 'bg-amber-100 text-amber-900 border-amber-300'
    case 'pronto':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    case 'concluido':
      return 'bg-[#15803d] text-white border-[#15803d]'
    case 'cancelado':
      return 'bg-[#c21e1e]/10 text-[#c21e1e] border-[#c21e1e]/30'
    default:
      return 'bg-stone-100 text-stone-700 border-stone-300'
  }
}

export default function OrdersAndSalesTab({
  orders: externalOrders,
  onOrdersChange,
}: OrdersAndSalesTabProps) {
  const [internalOrders, setInternalOrders] = useState<OrderRecord[]>([])
  const [periodFilter, setPeriodFilter] = useState<OrderPeriodFilter>('all')
  const [statusFilter, setStatusFilter] = useState<OrderLifecycleStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (externalOrders === undefined) {
      setInternalOrders(loadOrders())
    }
  }, [externalOrders])

  const activeOrders = externalOrders !== undefined ? externalOrders : internalOrders

  const handleRefreshFromStorage = () => {
    const fresh = loadOrders()
    setInternalOrders(fresh)
    if (onOrdersChange) {
      onOrdersChange(fresh)
    }
  }

  const handleStatusUpdate = (orderId: string, newStatus: OrderLifecycleStatus) => {
    const updated = updateOrderStatus(activeOrders, orderId, newStatus)
    setInternalOrders(updated)
    if (onOrdersChange) {
      onOrdersChange(updated)
    }
  }

  const metrics = useMemo(
    () => calculateSalesDashboardMetrics(activeOrders),
    [activeOrders]
  )

  const filteredOrders = useMemo(
    () =>
      filterOrders(activeOrders, {
        period: periodFilter,
        status: statusFilter,
        search: searchQuery,
      }),
    [activeOrders, periodFilter, statusFilter, searchQuery]
  )

  const handleExportExcel = () => {
    downloadOrdersExcel(filteredOrders)
    setExportFeedback(
      `Planilha .xlsx gerada com ${filteredOrders.length} pedido(s) filtrado(s)!`
    )
    setTimeout(() => setExportFeedback(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Aviso de Regra Financeira Estrita */}
      <div className="bg-[#fdfbf7] border-l-4 border-[#f59e0b] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-stone-700">
            <strong className="text-stone-900">Separação Financeira Estrita:</strong>{' '}
            Pedidos enviados pelo WhatsApp entram como{' '}
            <span className="font-semibold text-amber-800">Aguardando confirmação</span> e{' '}
            <strong>não somam no faturamento realizado</strong> até que você altere o status para{' '}
            <span className="font-semibold text-[#15803d]">Confirmado</span>,{' '}
            <span className="font-semibold text-[#15803d]">Em preparação</span>,{' '}
            <span className="font-semibold text-[#15803d]">Pronto</span> ou{' '}
            <span className="font-semibold text-[#15803d]">Entregue/Concluído</span>.
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefreshFromStorage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 shrink-0 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar Lista
        </button>
      </div>

      {/* Cards de Indicadores Financeiros (Faturamento Confirmado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Vendas do Dia (Hoje)
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#15803d]/10 text-[#15803d] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-[#15803d]">
            {formatCentsToBRL(metrics.vendasDiaCents)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Somente pedidos confirmados hoje
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Vendas da Semana (7d)
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#15803d]/10 text-[#15803d] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900">
            {formatCentsToBRL(metrics.vendasSemanaCents)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Últimos 7 dias confirmados
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Vendas do Mês
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f59e0b]/15 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900">
            {formatCentsToBRL(metrics.vendasMesCents)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Ano atual: <strong>{formatCentsToBRL(metrics.vendasAnoCents)}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Ticket Médio Confirmado
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#c21e1e]/10 text-[#c21e1e] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-[#c21e1e]">
            {formatCentsToBRL(metrics.ticketMedioCents)}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            Base: {metrics.pedidosConfirmadosConcluidosCount} pedido(s) confirmado(s)
          </p>
        </div>
      </div>

      {/* Segunda Linha de Cards: Contadores Operacionais e Pendentes vs Realizado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#15803d]/5 border border-[#15803d]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#15803d] uppercase">
              Confirmados / Concluídos
            </p>
            <p className="text-xl font-black text-stone-900 mt-0.5">
              {metrics.pedidosConfirmadosConcluidosCount} pedido(s)
            </p>
            <p className="text-xs text-stone-600 mt-0.5">
              Total realizado: <strong>{formatCentsToBRL(metrics.faturamentoConfirmadoTotalCents)}</strong>
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-[#15803d]" />
        </div>

        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-900 uppercase">
              Aguardando Confirmação (Não Faturado)
            </p>
            <p className="text-xl font-black text-amber-950 mt-0.5">
              {metrics.pedidosPendentesCount} pedido(s)
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Valor pendente: <strong>{formatCentsToBRL(metrics.valorPendenteNaoConfirmadoCents)}</strong>
            </p>
          </div>
          <Clock className="w-8 h-8 text-amber-700" />
        </div>

        <div className="bg-[#c21e1e]/5 border border-[#c21e1e]/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#c21e1e] uppercase">
              Pedidos Cancelados
            </p>
            <p className="text-xl font-black text-stone-900 mt-0.5">
              {metrics.pedidosCanceladosCount} pedido(s)
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Total de registros: {metrics.totalPedidosCount}
            </p>
          </div>
          <XCircle className="w-8 h-8 text-[#c21e1e]" />
        </div>
      </div>

      {/* Barra de Filtros + Exportação Excel (.xlsx) */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-500 uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Período:
            </span>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriodFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  periodFilter === opt.value
                    ? 'bg-[#c21e1e] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Botão Exportar Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#15803d] hover:bg-green-800 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <Download className="w-4 h-4" />
            Exportar Excel (.xlsx) ({filteredOrders.length})
          </button>
        </div>

        {exportFeedback && (
          <div className="bg-[#15803d]/10 border border-[#15803d]/30 text-[#15803d] px-3 py-2 rounded-lg text-xs font-bold">
            {exportFeedback}
          </div>
        )}

        {/* Filtro de Status e Busca Textual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por número (#BC-1001), cliente, telefone ou produto..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:border-[#c21e1e]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="order-status-filter"
              className="text-xs font-bold text-stone-600 uppercase shrink-0"
            >
              Status:
            </label>
            <select
              id="order-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderLifecycleStatus | 'all')
              }
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white font-medium text-stone-800 focus:outline-none focus:border-[#c21e1e]"
            >
              <option value="all">Todos os status ({activeOrders.length})</option>
              {ALL_ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {ORDER_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista Detalhada de Pedidos */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">
              Nenhum pedido encontrado para os filtros selecionados
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Quando clientes enviarem pedidos pelo cardápio digital ou quando você alterar os filtros de período/status, os registros aparecerão aqui.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isConfirmed = isConfirmedRevenueStatus(order.status)
            const isPending = isPendingOrderStatus(order.status)

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:border-stone-300 transition space-y-4"
              >
                {/* Cabeçalho do Pedido */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg bg-stone-900 text-[#f59e0b] font-black text-sm">
                      {order.numeroPedido}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClasses(
                        order.status
                      )}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    {isConfirmed && (
                      <span className="text-[11px] font-bold text-[#15803d] bg-[#15803d]/10 px-2 py-0.5 rounded">
                        Faturamento Contabilizado
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[11px] font-bold text-amber-800 bg-[#f59e0b]/20 px-2 py-0.5 rounded">
                        Não Contabilizado no Faturamento
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-stone-500 font-medium">
                    Registrado em:{' '}
                    <strong className="text-stone-700">
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                {/* Dados do Cliente e Modalidade */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-[#fdfbf7] p-3.5 rounded-xl border border-stone-200/80">
                    <p className="text-[11px] font-bold uppercase text-stone-400 mb-1">
                      Cliente & Contato
                    </p>
                    <p className="font-bold text-stone-900">{order.clienteNome}</p>
                    <p className="text-xs text-stone-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3.5 h-3.5 text-[#15803d]" />
                      {order.clienteTelefone}
                    </p>
                  </div>

                  <div className="bg-[#fdfbf7] p-3.5 rounded-xl border border-stone-200/80">
                    <p className="text-[11px] font-bold uppercase text-stone-400 mb-1">
                      Modalidade & Local
                    </p>
                    <p className="font-bold text-stone-900">
                      {ORDER_MODALITY_LABELS[order.modalidade] || order.modalidade}
                    </p>
                    <p className="text-xs text-stone-600 flex items-start gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#c21e1e] shrink-0 mt-0.5" />
                      <span>{formatOrderLocation(order)}</span>
                    </p>
                  </div>

                  <div className="bg-[#fdfbf7] p-3.5 rounded-xl border border-stone-200/80">
                    <p className="text-[11px] font-bold uppercase text-stone-400 mb-1">
                      Resumo Financeiro
                    </p>
                    <div className="text-xs text-stone-600 space-y-0.5">
                      <p>Subtotal: {formatCentsToBRL(order.subtotalCents)}</p>
                      <p>Taxa Entrega: {formatCentsToBRL(order.taxaEntregaCents)}</p>
                      <p className="text-sm font-black text-[#c21e1e] pt-0.5">
                        Total: {formatCentsToBRL(order.totalCents)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de Itens do Pedido */}
                <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/60">
                  <p className="text-xs font-bold uppercase text-stone-500 mb-2">
                    Itens do Pedido ({order.itens.length})
                  </p>
                  <ul className="divide-y divide-stone-200/60 text-xs sm:text-sm">
                    {order.itens.map((item) => (
                      <li
                        key={item.id}
                        className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div>
                          <span className="font-black text-[#c21e1e] mr-1.5">
                            {item.quantidade}x
                          </span>
                          <span className="font-bold text-stone-900">
                            {item.produto}
                          </span>
                          {item.varianteNome && (
                            <span className="ml-1.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-semibold">
                              {item.varianteNome}
                            </span>
                          )}
                          {item.adicionais && item.adicionais.length > 0 && (
                            <p className="text-xs text-stone-600 mt-0.5">
                              + Adicionais:{' '}
                              {item.adicionais
                                .map(
                                  (ad) =>
                                    `${ad.nome} (${formatCentsToBRL(ad.precoCents)})`
                                )
                                .join(', ')}
                            </p>
                          )}
                          {item.observacao && (
                            <p className="text-xs italic text-stone-500 mt-0.5">
                              Obs. do item: {item.observacao}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-stone-800 shrink-0">
                          {formatCentsToBRL(item.subtotalItemCents)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {order.observacoesCliente && (
                    <div className="mt-3 pt-2 border-t border-stone-200 text-xs text-amber-900 bg-amber-50/80 px-3 py-2 rounded-lg">
                      <strong>Observações do Cliente:</strong> {order.observacoesCliente}
                    </div>
                  )}
                </div>

                {/* Controle Manual de Status pelo Administrador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(order.id, 'confirmado')}
                        className="px-3 py-1.5 rounded-lg bg-[#15803d] hover:bg-green-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Confirmar Pedido Agora
                      </button>
                    )}
                    {order.status !== 'concluido' && order.status !== 'cancelado' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(order.id, 'concluido')}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Marcar como Concluído
                      </button>
                    )}
                    {order.status !== 'cancelado' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(order.id, 'cancelado')}
                        className="px-3 py-1.5 rounded-lg border border-[#c21e1e]/40 text-[#c21e1e] hover:bg-[#c21e1e]/10 text-xs font-bold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`status-select-${order.id}`}
                      className="text-xs font-bold text-stone-600 uppercase shrink-0"
                    >
                      Alterar Status:
                    </label>
                    <select
                      id={`status-select-${order.id}`}
                      value={order.status}
                      onChange={(e) =>
                        handleStatusUpdate(
                          order.id,
                          e.target.value as OrderLifecycleStatus
                        )
                      }
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-white text-stone-900 focus:outline-none focus:border-[#c21e1e]"
                    >
                      {ALL_ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
