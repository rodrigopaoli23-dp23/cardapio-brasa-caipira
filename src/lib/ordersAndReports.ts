/**
 * BRASA CAIPIRA — Gerenciador de Pedidos, Indicadores Financeiros e Exportador Excel (.xlsx)
 *
 * REGRAS CRÍTICAS DE NEGÓCIO:
 * 1. O clique em "Enviar pedido pelo WhatsApp" registra o pedido como 'aguardando_confirmacao'.
 * 2. Pedidos em 'checkout_iniciado', 'aguardando_confirmacao' ou 'cancelado' NUNCA entram
 *    no cálculo de faturamento realizado nem no ticket médio.
 * 3. Somente pedidos com status em ['confirmado', 'em_preparacao', 'pronto', 'concluido']
 *    são contabilizados como faturamento confirmado.
 */

import {
  OrderLifecycleStatus,
  OrderModality,
  OrderRecord,
} from '@/types/phase3.types'
import { formatCentsToBRL } from '@/lib/money'
import { pushOrdersToCloud } from '@/lib/cloudSync'

export const ORDERS_STORAGE_KEY = 'brasa_caipira_orders_v1'

export const CONFIRMED_REVENUE_STATUSES: readonly OrderLifecycleStatus[] = [
  'confirmado',
  'em_preparacao',
  'pronto',
  'concluido',
] as const

export const PENDING_ORDER_STATUSES: readonly OrderLifecycleStatus[] = [
  'checkout_iniciado',
  'aguardando_confirmacao',
] as const

export const ALL_ORDER_STATUSES: readonly OrderLifecycleStatus[] = [
  'checkout_iniciado',
  'aguardando_confirmacao',
  'confirmado',
  'em_preparacao',
  'pronto',
  'concluido',
  'cancelado',
] as const

export const ORDER_STATUS_LABELS: Record<OrderLifecycleStatus, string> = {
  checkout_iniciado: 'Checkout iniciado',
  aguardando_confirmacao: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  em_preparacao: 'Em preparação',
  pronto: 'Pronto',
  concluido: 'Entregue ou concluído',
  cancelado: 'Cancelado',
}

export const ORDER_MODALITY_LABELS: Record<OrderModality, string> = {
  delivery: 'Delivery (Entrega)',
  mesa: 'Consumo no Local / Mesa',
  retirada: 'Retirada no Balcão',
}

export interface SalesDashboardMetrics {
  vendasDiaCents: number
  vendasSemanaCents: number
  vendasMesCents: number
  vendasAnoCents: number
  totalPedidosCount: number
  pedidosConfirmadosConcluidosCount: number
  pedidosPendentesCount: number
  pedidosCanceladosCount: number
  ticketMedioCents: number
  faturamentoConfirmadoTotalCents: number
  valorPendenteNaoConfirmadoCents: number
}

export type OrderPeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year'

export interface OrderFilterCriteria {
  period: OrderPeriodFilter
  status: OrderLifecycleStatus | 'all'
  search?: string
  referenceDate?: Date
}

/**
 * Verifica se um status representa pedido confirmado/faturado.
 */
export function isConfirmedRevenueStatus(status: OrderLifecycleStatus): boolean {
  return (CONFIRMED_REVENUE_STATUSES as readonly string[]).includes(status)
}

/**
 * Verifica se um status representa pedido apenas iniciado / pendente de confirmação.
 */
export function isPendingOrderStatus(status: OrderLifecycleStatus): boolean {
  return (PENDING_ORDER_STATUSES as readonly string[]).includes(status)
}

/**
 * Carrega os pedidos persistidos no localStorage.
 */
export function loadOrders(): OrderRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as OrderRecord[]
  } catch {
    return []
  }
}

/**
 * Salva a lista de pedidos no localStorage.
 */
export function saveOrders(orders: OrderRecord[]): void {
  if (typeof window === 'undefined') return
  pushOrdersToCloud(orders)
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // Ignora falha de quota ou ambiente restrito
  }
}

/**
 * Registra um novo pedido na base local e persiste imediatamente.
 */
export function appendOrder(newOrder: OrderRecord): OrderRecord[] {
  const current = loadOrders()
  const updated = [newOrder, ...current.filter((o) => o.id !== newOrder.id)]
  saveOrders(updated)
  return updated
}

/**
 * Atualiza o status de um pedido pelo seu ID ou número do pedido.
 */
export function updateOrderStatus(
  orders: OrderRecord[],
  orderId: string,
  newStatus: OrderLifecycleStatus
): OrderRecord[] {
  const nowIso = new Date().toISOString()
  const updated = orders.map((order) => {
    if (order.id === orderId || order.numeroPedido === orderId) {
      return {
        ...order,
        status: newStatus,
        updatedAt: nowIso,
      }
    }
    return order
  })
  saveOrders(updated)
  return updated
}

/**
 * Verifica se uma data está dentro do período solicitado em relação à data de referência.
 */
export function isDateInPeriod(
  isoDateString: string,
  period: OrderPeriodFilter,
  referenceDate: Date = new Date()
): boolean {
  if (period === 'all') return true

  const target = new Date(isoDateString)
  if (isNaN(target.getTime())) return false

  const refYear = referenceDate.getFullYear()
  const refMonth = referenceDate.getMonth()
  const refDate = referenceDate.getDate()

  if (period === 'today') {
    return (
      target.getFullYear() === refYear &&
      target.getMonth() === refMonth &&
      target.getDate() === refDate
    )
  }

  if (period === 'week') {
    const startOfWindow = new Date(refYear, refMonth, refDate, 0, 0, 0, 0)
    startOfWindow.setDate(startOfWindow.getDate() - 6)
    const endOfWindow = new Date(refYear, refMonth, refDate, 23, 59, 59, 999)
    return target.getTime() >= startOfWindow.getTime() && target.getTime() <= endOfWindow.getTime()
  }

  if (period === 'month') {
    return target.getFullYear() === refYear && target.getMonth() === refMonth
  }

  if (period === 'year') {
    return target.getFullYear() === refYear
  }

  return true
}

/**
 * Calcula todos os indicadores financeiros separando estritamente faturamento confirmado
 * de pedidos apenas iniciados (aguardando confirmação) ou cancelados.
 */
export function calculateSalesDashboardMetrics(
  orders: OrderRecord[],
  referenceDate: Date = new Date()
): SalesDashboardMetrics {
  let vendasDiaCents = 0
  let vendasSemanaCents = 0
  let vendasMesCents = 0
  let vendasAnoCents = 0
  let faturamentoConfirmadoTotalCents = 0
  let valorPendenteNaoConfirmadoCents = 0

  let pedidosConfirmadosConcluidosCount = 0
  let pedidosPendentesCount = 0
  let pedidosCanceladosCount = 0

  for (const order of orders) {
    const orderTotal = Math.max(0, Number(order.totalCents) || 0)

    if (isConfirmedRevenueStatus(order.status)) {
      pedidosConfirmadosConcluidosCount += 1
      faturamentoConfirmadoTotalCents += orderTotal

      if (isDateInPeriod(order.createdAt, 'today', referenceDate)) {
        vendasDiaCents += orderTotal
      }
      if (isDateInPeriod(order.createdAt, 'week', referenceDate)) {
        vendasSemanaCents += orderTotal
      }
      if (isDateInPeriod(order.createdAt, 'month', referenceDate)) {
        vendasMesCents += orderTotal
      }
      if (isDateInPeriod(order.createdAt, 'year', referenceDate)) {
        vendasAnoCents += orderTotal
      }
    } else if (isPendingOrderStatus(order.status)) {
      pedidosPendentesCount += 1
      valorPendenteNaoConfirmadoCents += orderTotal
    } else if (order.status === 'cancelado') {
      pedidosCanceladosCount += 1
    }
  }

  const ticketMedioCents =
    pedidosConfirmadosConcluidosCount > 0
      ? Math.round(faturamentoConfirmadoTotalCents / pedidosConfirmadosConcluidosCount)
      : 0

  return {
    vendasDiaCents,
    vendasSemanaCents,
    vendasMesCents,
    vendasAnoCents,
    totalPedidosCount: orders.length,
    pedidosConfirmadosConcluidosCount,
    pedidosPendentesCount,
    pedidosCanceladosCount,
    ticketMedioCents,
    faturamentoConfirmadoTotalCents,
    valorPendenteNaoConfirmadoCents,
  }
}

/**
 * Filtra pedidos por período, status e termo de busca (cliente, telefone, código ou item).
 */
export function filterOrders(
  orders: OrderRecord[],
  criteria: OrderFilterCriteria
): OrderRecord[] {
  const { period, status, search, referenceDate = new Date() } = criteria
  const normalizedSearch = (search || '').trim().toLowerCase()

  return orders.filter((order) => {
    if (status !== 'all' && order.status !== status) {
      return false
    }

    if (!isDateInPeriod(order.createdAt, period, referenceDate)) {
      return false
    }

    if (normalizedSearch.length > 0) {
      const matchNumero = order.numeroPedido.toLowerCase().includes(normalizedSearch)
      const matchCliente = order.clienteNome.toLowerCase().includes(normalizedSearch)
      const matchTelefone = order.clienteTelefone.toLowerCase().includes(normalizedSearch)
      const matchItens = order.itens.some(
        (it) =>
          it.produto.toLowerCase().includes(normalizedSearch) ||
          it.codigo.toLowerCase().includes(normalizedSearch)
      )
      if (!matchNumero && !matchCliente && !matchTelefone && !matchItens) {
        return false
      }
    }

    return true
  })
}

/**
 * Formata o endereço de entrega ou número da mesa de um pedido para exibição ou exportação.
 */
export function formatOrderLocation(order: OrderRecord): string {
  if (order.modalidade === 'delivery') {
    if (!order.enderecoEntrega) return 'Endereço não informado'
    const { rua, numero, bairro, complemento, referencia } = order.enderecoEntrega
    const parts = [`${rua}, ${numero} - ${bairro}`]
    if (complemento) parts.push(`Compl: ${complemento}`)
    if (referencia) parts.push(`Ref: ${referencia}`)
    return parts.join(' | ')
  }

  if (order.modalidade === 'mesa') {
    return order.numeroMesa ? `Mesa ${order.numeroMesa}` : 'Consumo no local'
  }

  return 'Retirada no balcão'
}

/**
 * Formata a lista de itens e adicionais do pedido em texto legível para relatórios.
 */
export function formatOrderItemsSummary(order: OrderRecord): string {
  return order.itens
    .map((item) => {
      const variantPart = item.varianteNome ? ` (${item.varianteNome})` : ''
      const addonsPart =
        item.adicionais && item.adicionais.length > 0
          ? ` [+ ${item.adicionais.map((a) => a.nome).join(', ')}]`
          : ''
      const obsPart = item.observacao ? ` {Obs: ${item.observacao}}` : ''
      return `${item.quantidade}x ${item.produto}${variantPart}${addonsPart}${obsPart}`
    })
    .join('; ')
}

/**
 * Escapa caracteres especiais para XML seguro.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Converte índice de coluna (0-based) em letra do Excel (A, B, ..., Z, AA...).
 */
function columnIndexToLetter(index: number): string {
  let letter = ''
  let temp = index
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * Calcula CRC-32 padrão IEEE 802.3 para empacotamento ZIP válido.
 */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >>> 8) & 0xff
  buffer[offset + 2] = (value >>> 16) & 0xff
  buffer[offset + 3] = (value >>> 24) & 0xff
}

/**
 * Empacota uma lista de arquivos em um container ZIP (STORED) compatível com OpenXML (.xlsx).
 */
function buildZipContainer(files: { path: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const encodedFiles = files.map((file) => {
    const nameBytes = encoder.encode(file.path)
    const dataBytes = encoder.encode(file.content)
    const crc = crc32(dataBytes)
    return { nameBytes, dataBytes, crc }
  })

  let localHeadersSize = 0
  let centralDirSize = 0

  for (const f of encodedFiles) {
    localHeadersSize += 30 + f.nameBytes.length + f.dataBytes.length
    centralDirSize += 46 + f.nameBytes.length
  }

  const totalSize = localHeadersSize + centralDirSize + 22
  const out = new Uint8Array(totalSize)
  const localOffsets: number[] = []

  let offset = 0

  // 1. Local File Headers + File Data
  for (const f of encodedFiles) {
    localOffsets.push(offset)
    writeUint32LE(out, offset, 0x04034b50) // PK\x03\x04
    writeUint16LE(out, offset + 4, 20) // Version needed to extract (2.0)
    writeUint16LE(out, offset + 6, 0x0800) // UTF-8 flag
    writeUint16LE(out, offset + 8, 0) // Compression method: 0 (STORED)
    writeUint16LE(out, offset + 10, 0) // Mod time
    writeUint16LE(out, offset + 12, 0x554b) // Mod date
    writeUint32LE(out, offset + 14, f.crc)
    writeUint32LE(out, offset + 18, f.dataBytes.length)
    writeUint32LE(out, offset + 22, f.dataBytes.length)
    writeUint16LE(out, offset + 26, f.nameBytes.length)
    writeUint16LE(out, offset + 28, 0) // Extra field length
    out.set(f.nameBytes, offset + 30)
    offset += 30 + f.nameBytes.length
    out.set(f.dataBytes, offset)
    offset += f.dataBytes.length
  }

  const centralDirStart = offset

  // 2. Central Directory File Headers
  for (let i = 0; i < encodedFiles.length; i++) {
    const f = encodedFiles[i]
    writeUint32LE(out, offset, 0x02014b50) // PK\x01\x02
    writeUint16LE(out, offset + 4, 20) // Version made by
    writeUint16LE(out, offset + 6, 20) // Version needed
    writeUint16LE(out, offset + 8, 0x0800) // UTF-8 flag
    writeUint16LE(out, offset + 10, 0) // Compression: STORED
    writeUint16LE(out, offset + 12, 0) // Mod time
    writeUint16LE(out, offset + 14, 0x554b) // Mod date
    writeUint32LE(out, offset + 16, f.crc)
    writeUint32LE(out, offset + 20, f.dataBytes.length)
    writeUint32LE(out, offset + 24, f.dataBytes.length)
    writeUint16LE(out, offset + 28, f.nameBytes.length)
    writeUint16LE(out, offset + 30, 0) // Extra length
    writeUint16LE(out, offset + 32, 0) // Comment length
    writeUint16LE(out, offset + 34, 0) // Disk number
    writeUint16LE(out, offset + 36, 0) // Internal attrs
    writeUint32LE(out, offset + 38, 0) // External attrs
    writeUint32LE(out, offset + 42, localOffsets[i])
    out.set(f.nameBytes, offset + 46)
    offset += 46 + f.nameBytes.length
  }

  // 3. End of Central Directory Record (EOCD)
  writeUint32LE(out, offset, 0x06054b50) // PK\x05\x06
  writeUint16LE(out, offset + 4, 0) // Number of this disk
  writeUint16LE(out, offset + 6, 0) // Disk where central directory starts
  writeUint16LE(out, offset + 8, encodedFiles.length)
  writeUint16LE(out, offset + 10, encodedFiles.length)
  writeUint32LE(out, offset + 12, centralDirSize)
  writeUint32LE(out, offset + 16, centralDirStart)
  writeUint16LE(out, offset + 20, 0) // Comment length

  return out
}

/**
 * Gera um arquivo binário Excel (.xlsx) OpenXML válido contendo a lista de pedidos fornecida.
 */
export function generateOrdersXlsxBuffer(orders: OrderRecord[]): Uint8Array {
  const headers = [
    'Número do Pedido',
    'Data/Horário',
    'Cliente',
    'Telefone',
    'Modalidade',
    'Endereço/Mesa',
    'Itens e Quantidades',
    'Subtotal (R$)',
    'Taxa de Entrega (R$)',
    'Total (R$)',
    'Status',
    'Observações',
  ]

  const rows: string[][] = [headers]

  for (const order of orders) {
    const formattedDate = (() => {
      const dt = new Date(order.createdAt)
      if (isNaN(dt.getTime())) return order.createdAt
      return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    })()

    rows.push([
      order.numeroPedido,
      formattedDate,
      order.clienteNome,
      order.clienteTelefone,
      ORDER_MODALITY_LABELS[order.modalidade] || order.modalidade,
      formatOrderLocation(order),
      formatOrderItemsSummary(order),
      formatCentsToBRL(order.subtotalCents),
      formatCentsToBRL(order.taxaEntregaCents),
      formatCentsToBRL(order.totalCents),
      ORDER_STATUS_LABELS[order.status] || order.status,
      order.observacoesCliente || '-',
    ])
  }

  const sheetRowsXml = rows
    .map((cols, rowIdx) => {
      const excelRowNumber = rowIdx + 1
      const cellsXml = cols
        .map((cellValue, colIdx) => {
          const cellRef = `${columnIndexToLetter(colIdx)}${excelRowNumber}`
          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(String(cellValue ?? ''))}</t></is></c>`
        })
        .join('')
      return `<row r="${excelRowNumber}">${cellsXml}</row>`
    })
    .join('')

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Pedidos Brasa Caipira" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`

  return buildZipContainer([
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { path: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
  ])
}

/**
 * Aciona o download do arquivo Excel (.xlsx) no navegador com os pedidos filtrados.
 */
export function downloadOrdersExcel(
  orders: OrderRecord[],
  filename?: string
): void {
  if (typeof window === 'undefined') return
  const buffer = generateOrdersXlsxBuffer(orders)
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const datePart = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = filename || `relatorio-pedidos-brasa-caipira-${datePart}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
