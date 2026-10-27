'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Truck,
  UtensilsCrossed,
  Store,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import {
  ExtendedProduct,
  OrderItemSnapshot,
  OrderModality,
  OrderRecord,
  ProductAddonOption,
  StoreIdentityConfig,
} from '@/types/phase3.types'
import { formatCentsToBRL, reaisToCents, calculateItemTotalCents } from '@/lib/money'
import {
  addItemToCart,
  buildStructuredWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  canProductBePurchased,
  createCartItemSnapshot,
  createOrderIdempotent,
  getAvailableAddonsForProduct,
  MODALITY_LABELS,
  removeCartItem,
  saveCartToStorage,
  updateCartItemQuantity,
  validateAndCalculateOrderTotals,
  validateCustomerCheckoutData,
} from '@/lib/checkoutAndCart'
import { DEFAULT_STORE_IDENTITY } from '@/lib/storeAndScheduleManager'

export interface ProductQuickCustomizeModalProps {
  product: ExtendedProduct | null
  catalog: ExtendedProduct[]
  onClose: () => void
  onConfirmAdd: (snapshot: OrderItemSnapshot) => void
}

/**
 * Modal de personalização rápida ao adicionar um produto ao carrinho:
 * Permite escolher variante, adicionais (BC-073 a BC-079 ou específicos do item),
 * observação do item e quantidade.
 */
export function ProductQuickCustomizeModal({
  product,
  catalog,
  onClose,
  onConfirmAdd,
}: ProductQuickCustomizeModalProps) {
  const [quantidade, setQuantidade] = useState<number>(1)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([])
  const [observacao, setObservacao] = useState<string>('')

  const availableAddons: ProductAddonOption[] = useMemo(() => {
    if (!product) return []
    return getAvailableAddonsForProduct(product, catalog)
  }, [product, catalog])

  useEffect(() => {
    if (product) {
      setQuantidade(1)
      setSelectedAddonCodes([])
      setObservacao('')
      if (product.variantes && product.variantes.length > 0) {
        setSelectedVariant(product.variantes[0].nome)
      } else {
        setSelectedVariant('')
      }
    }
  }, [product])

  if (!product || !canProductBePurchased(product)) return null

  const unitPriceReais = (() => {
    if (selectedVariant && product.variantes && product.variantes.length > 0) {
      const found = product.variantes.find((v) => v.nome === selectedVariant)
      if (found && Number(found.preco) > 0) {
        return Number(found.preco)
      }
    }
    return Number(product.preco)
  })()

  const unitPriceCents = reaisToCents(unitPriceReais)
  const selectedAddonsList = availableAddons
    .filter((a) => selectedAddonCodes.includes(a.codigo))
    .map((a) => ({
      codigo: a.codigo,
      nome: a.nome,
      precoCents: reaisToCents(a.preco),
    }))

  const previewTotalCents = calculateItemTotalCents(
    unitPriceCents,
    selectedAddonsList.map((a) => a.precoCents),
    quantidade
  )

  const toggleAddon = (code: string) => {
    setSelectedAddonCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const handleConfirm = () => {
    const snapshot = createCartItemSnapshot({
      product,
      quantidade,
      varianteNome: selectedVariant || undefined,
      adicionais: selectedAddonsList,
      observacao: observacao.trim() || undefined,
    })
    if (snapshot) {
      onConfirmAdd(snapshot)
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-[#fdfbf7] shadow-2xl border border-amber-200/80 sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between bg-[#c21e1e] px-5 py-4 text-white">
          <div>
            <span className="inline-block rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              {product.codigo} • {product.categoria}
            </span>
            <h3 className="mt-0.5 text-base font-extrabold leading-tight">
              {product.produto}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
            aria-label="Fechar personalização"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs text-stone-700">
          {product.ingredientes && (
            <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/60">
              <span className="font-bold text-stone-900 block">Composição:</span>
              <p className="mt-0.5 text-stone-600">{product.ingredientes}</p>
            </div>
          )}

          {/* Seleção de Variante */}
          {product.variantes && product.variantes.length > 0 && (
            <div>
              <label className="block font-extrabold text-stone-900 uppercase tracking-wide text-[11px] mb-2">
                Escolha a Opção / Variação *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {product.variantes.map((v) => {
                  const isSelected = selectedVariant === v.nome
                  return (
                    <button
                      key={v.id || v.nome}
                      type="button"
                      onClick={() => setSelectedVariant(v.nome)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-[#c21e1e] bg-red-50/70 font-bold text-stone-900 ring-1 ring-[#c21e1e]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      <span>{v.nome}</span>
                      <span className="font-extrabold text-[#15803d]">
                        {formatCentsToBRL(reaisToCents(v.preco))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Seleção de Adicionais (BC-073 a BC-079 ou configurados) */}
          {availableAddons.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 font-extrabold text-stone-900 uppercase tracking-wide text-[11px] mb-2">
                <Sparkles className="h-3.5 w-3.5 text-[#f59e0b]" />
                <span>Adicionais e Acompanhamentos (Opcional)</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {availableAddons.map((addon) => {
                  const checked = selectedAddonCodes.includes(addon.codigo)
                  return (
                    <button
                      key={addon.codigo}
                      type="button"
                      onClick={() => toggleAddon(addon.codigo)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-left transition ${
                        checked
                          ? 'border-[#15803d] bg-emerald-50/70 font-bold text-stone-900 ring-1 ring-[#15803d]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            checked
                              ? 'border-[#15803d] bg-[#15803d] text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {checked ? '✓' : ''}
                        </span>
                        <span>
                          {addon.nome}{' '}
                          <span className="text-[10px] text-stone-400">
                            ({addon.codigo})
                          </span>
                        </span>
                      </div>
                      <span className="font-extrabold text-[#15803d]">
                        + {formatCentsToBRL(reaisToCents(addon.preco))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Observação do Item */}
          <div>
            <label className="block font-extrabold text-stone-900 uppercase tracking-wide text-[11px] mb-1.5">
              Observação do item (opcional)
            </label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Bem passado, sem cebola, maionese à parte..."
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#c21e1e] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Rodapé com seletor de quantidade e botão Confirmar */}
        <div className="border-t border-stone-200 bg-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-[#fdfbf7] px-2.5 py-1.5">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-stone-700 shadow-xs hover:bg-stone-100"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-6 text-center text-sm font-extrabold text-stone-900">
              {quantidade}
            </span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => q + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c21e1e] text-white shadow-xs hover:bg-red-700"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-between rounded-xl bg-[#15803d] px-4 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition active:scale-98"
          >
            <span>Adicionar ao Pedido</span>
            <span className="rounded-lg bg-black/20 px-2 py-0.5 text-xs">
              {formatCentsToBRL(previewTotalCents)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export interface CartAndCheckoutDrawerProps {
  cart: OrderItemSnapshot[]
  onUpdateCart: (nextCart: OrderItemSnapshot[]) => void
  catalog: ExtendedProduct[]
  storeConfig?: StoreIdentityConfig
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  customizingProduct?: ExtendedProduct | null
  onCloseCustomize?: () => void
  onOrderCreated?: (order: OrderRecord) => void
  showFloatingBar?: boolean
}

export function CartAndCheckoutDrawer({
  cart,
  onUpdateCart,
  catalog,
  storeConfig = DEFAULT_STORE_IDENTITY,
  isOpen: controlledIsOpen,
  onOpenChange,
  customizingProduct = null,
  onCloseCustomize,
  onOrderCreated,
  showFloatingBar = true,
}: CartAndCheckoutDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen

  const setDrawerOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next)
    } else {
      setInternalOpen(next)
    }
  }

  // Modalidades ativas configuradas na loja
  const activeModalities = useMemo(() => {
    const m = storeConfig?.modalidadesAtivas || {
      delivery: true,
      mesa: true,
      retirada: true,
    }
    const list: OrderModality[] = []
    if (m.delivery) list.push('delivery')
    if (m.retirada) list.push('retirada')
    if (m.mesa) list.push('mesa')
    return list.length > 0 ? list : (['retirada'] as OrderModality[])
  }, [storeConfig])

  const [modalidade, setModalidade] = useState<OrderModality>(
    activeModalities[0] || 'delivery'
  )

  useEffect(() => {
    if (!activeModalities.includes(modalidade)) {
      setModalidade(activeModalities[0] || 'retirada')
    }
  }, [activeModalities, modalidade])

  // Campos de identificação do cliente
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [complemento, setComplemento] = useState('')
  const [referencia, setReferencia] = useState('')
  const [numeroMesa, setNumeroMesa] = useState('')
  const [observacoesCliente, setObservacoesCliente] = useState('')

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastCreatedOrder, setLastCreatedOrder] = useState<OrderRecord | null>(null)

  // Recálculo seguro dos totais a partir do catálogo oficial
  const deliveryFeeCents = useMemo(() => {
    const feeReais = Number(storeConfig?.taxaEntregaPadraoReais ?? 5)
    return Math.max(0, reaisToCents(isNaN(feeReais) ? 5 : feeReais))
  }, [storeConfig])

  const totalsCalculation = useMemo(() => {
    return validateAndCalculateOrderTotals(cart, catalog, {
      modalidade,
      taxaEntregaCents: deliveryFeeCents,
    })
  }, [cart, catalog, modalidade, deliveryFeeCents])

  const totalItemsCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantidade, 0),
    [cart]
  )

  const handleIncrementItem = (itemId: string) => {
    const updated = updateCartItemQuantity(cart, itemId, 1)
    onUpdateCart(updated)
    saveCartToStorage(updated)
  }

  const handleDecrementItem = (itemId: string) => {
    const updated = updateCartItemQuantity(cart, itemId, -1)
    onUpdateCart(updated)
    saveCartToStorage(updated)
  }

  const handleRemoveItem = (itemId: string) => {
    const updated = removeCartItem(cart, itemId)
    onUpdateCart(updated)
    saveCartToStorage(updated)
  }

  const handleConfirmQuickCustomize = (snapshot: OrderItemSnapshot) => {
    const updated = addItemToCart(cart, snapshot)
    onUpdateCart(updated)
    saveCartToStorage(updated)
  }

  const handleSendWhatsAppOrder = async () => {
    if (isSubmitting) return
    setValidationErrors([])
    setFieldErrors({})

    // 1. Valida dados obrigatórios do cliente conforme a modalidade
    const customerCheck = validateCustomerCheckoutData({
      clienteNome,
      clienteTelefone,
      modalidade,
      rua,
      numero,
      bairro,
      complemento,
      referencia,
      numeroMesa,
      observacoesCliente,
    })

    if (!customerCheck.valid) {
      setValidationErrors(customerCheck.errors)
      setFieldErrors(customerCheck.fieldErrors)
      return
    }

    // 2. Valida e recalcula preços contra o catálogo oficial
    if (!totalsCalculation.valid || totalsCalculation.items.length === 0) {
      setValidationErrors(
        totalsCalculation.errors.length > 0
          ? totalsCalculation.errors
          : ['Adicione pelo menos um item válido ao pedido.']
      )
      return
    }

    setIsSubmitting(true)
    try {
      const sanitized = customerCheck.sanitized!

      // 3. Registra o pedido de forma idempotente em 'brasa_caipira_orders_v1' com status 'aguardando_confirmacao'
      const { order } = createOrderIdempotent({
        clienteNome: sanitized.clienteNome,
        clienteTelefone: sanitized.clienteTelefone,
        modalidade: sanitized.modalidade,
        enderecoEntrega: sanitized.enderecoEntrega,
        numeroMesa: sanitized.numeroMesa,
        observacoesCliente: sanitized.observacoesCliente,
        itens: totalsCalculation.items,
        subtotalCents: totalsCalculation.subtotalCents,
        taxaEntregaCents: totalsCalculation.taxaEntregaCents,
        totalCents: totalsCalculation.totalCents,
        persistToStorage: true,
      })

      setLastCreatedOrder(order)
      if (onOrderCreated) {
        onOrderCreated(order)
      }

      // 4. Abre o WhatsApp com a mensagem completa estruturada
      const whatsappUrl = buildWhatsAppOrderUrl(
        storeConfig?.telefoneWhatsapp || '5519998107666',
        order
      )

      if (typeof window !== 'undefined') {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      }

      // Limpa o carrinho após o registro
      onUpdateCart([])
      saveCartToStorage([])
    } finally {
      setTimeout(() => {
        setIsSubmitting(false)
      }, 1200)
    }
  }

  return (
    <>
      {/* Modal de Personalização Rápida ao Adicionar Produto */}
      {customizingProduct && (
        <ProductQuickCustomizeModal
          product={customizingProduct}
          catalog={catalog}
          onClose={() => onCloseCustomize && onCloseCustomize()}
          onConfirmAdd={handleConfirmQuickCustomize}
        />
      )}

      {/* Barra Flutuante Inferior do Carrinho */}
      {showFloatingBar && totalItemsCount > 0 && !isDrawerOpen && (
        <aside className="fixed bottom-4 left-0 right-0 z-30 mx-auto max-w-md px-4 md:max-w-2xl">
          <div className="flex items-center justify-between rounded-2xl bg-stone-950 px-5 py-3.5 text-white shadow-xl shadow-stone-950/30 border border-amber-500/40">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-[#f59e0b]" />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c21e1e] text-[10px] font-bold text-white">
                  {totalItemsCount}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-extrabold block text-white">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} •{' '}
                  <span className="text-[#f59e0b]">
                    {formatCentsToBRL(totalsCalculation.subtotalCents)}
                  </span>
                </span>
                <span className="text-[11px] text-stone-300">
                  Escolha Delivery, Mesa ou Retirada
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLastCreatedOrder(null)
                setDrawerOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#c21e1e] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700 transition active:scale-95"
            >
              <span>Ver Carrinho</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Gaveta / Modal Completo de Carrinho, Modalidades e Checkout */}
      {isDrawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-lg flex-col bg-[#fdfbf7] shadow-2xl border-l border-amber-200"
          >
            {/* Topo da Gaveta */}
            <header className="flex items-center justify-between bg-[#c21e1e] px-5 py-4 text-white shadow-md">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5 text-[#f59e0b]" />
                <div>
                  <h2 className="text-base font-extrabold leading-none">
                    Seu Pedido — Brasa Caipira
                  </h2>
                  <p className="mt-1 text-[11px] text-amber-100">
                    Revise seus itens, escolha a modalidade e envie pelo WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
                aria-label="Fechar carrinho"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Conteúdo Principal Rolável */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Confirmação de Pedido Registrado */}
              {lastCreatedOrder && cart.length === 0 ? (
                <div className="rounded-2xl border-2 border-[#15803d] bg-emerald-50/90 p-5 text-center space-y-3">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-[#15803d]" />
                  <h3 className="text-base font-extrabold text-stone-900">
                    Pedido {lastCreatedOrder.numeroPedido} Registrado!
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    Seu pedido foi registrado com status{' '}
                    <strong className="text-amber-800">
                      Aguardando confirmação do estabelecimento
                    </strong>
                    . Envie a mensagem aberta no seu WhatsApp e aguarde o retorno da
                    equipe Brasa Caipira!
                  </p>
                  <div className="rounded-xl bg-white p-3 text-left text-[11px] text-stone-600 border border-emerald-200 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                    {buildStructuredWhatsAppOrderMessage(lastCreatedOrder)}
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={buildWhatsAppOrderUrl(
                        storeConfig?.telefoneWhatsapp || '5519998107666',
                        lastCreatedOrder
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15803d] px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Abrir WhatsApp Novamente</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setLastCreatedOrder(null)
                        setDrawerOpen(false)
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                    >
                      Voltar ao Cardápio
                    </button>
                  </div>
                </div>
              ) : cart.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
                  <ShoppingCart className="mx-auto h-10 w-10 text-stone-300" />
                  <p className="mt-3 text-sm font-bold text-stone-800">
                    Seu carrinho está vazio
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Escolha seus espetinhos, lanches ou porções no cardápio para iniciar o pedido.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Lista de Itens do Carrinho */}
                  <section>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 mb-2.5 flex items-center justify-between">
                      <span>1. Itens do Pedido ({totalItemsCount})</span>
                      <span className="text-[#15803d]">
                        {formatCentsToBRL(totalsCalculation.subtotalCents)}
                      </span>
                    </h3>

                    <div className="space-y-2.5">
                      {totalsCalculation.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-stone-400">
                                {item.codigo}
                              </span>
                              <h4 className="text-xs font-extrabold text-stone-900">
                                {item.produto}
                                {item.varianteNome ? (
                                  <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                    {item.varianteNome}
                                  </span>
                                ) : null}
                              </h4>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Unitário: {formatCentsToBRL(item.precoUnitarioCents)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-stone-400 hover:text-[#c21e1e] p-1 transition"
                              aria-label={`Remover ${item.produto}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Adicionais do item */}
                          {item.adicionais && item.adicionais.length > 0 && (
                            <div className="mt-2 rounded-lg bg-amber-50/60 px-2.5 py-1.5 border border-amber-200/60">
                              <span className="block text-[10px] font-bold text-amber-900">
                                Adicionais:
                              </span>
                              <ul className="mt-0.5 space-y-0.5 text-[11px] text-stone-700">
                                {item.adicionais.map((add) => (
                                  <li
                                    key={add.codigo}
                                    className="flex items-center justify-between"
                                  >
                                    <span>+ {add.nome}</span>
                                    <span className="font-semibold text-[#15803d]">
                                      {formatCentsToBRL(add.precoCents)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Observação do item */}
                          {item.observacao && (
                            <p className="mt-1.5 text-[11px] italic text-stone-600">
                              Obs: &ldquo;{item.observacao}&rdquo;
                            </p>
                          )}

                          {/* Controles + / - e Subtotal da linha */}
                          <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
                            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-[#fdfbf7] px-2 py-1">
                              <button
                                type="button"
                                onClick={() => handleDecrementItem(item.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-stone-700 shadow-2xs hover:bg-stone-100"
                                aria-label="Diminuir"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-5 text-center text-xs font-extrabold text-stone-900">
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrementItem(item.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#c21e1e] text-white shadow-2xs hover:bg-red-700"
                                aria-label="Aumentar"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <span className="text-xs font-extrabold text-[#15803d]">
                              {formatCentsToBRL(item.subtotalItemCents)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 2. Seleção da Modalidade */}
                  <section>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 mb-2.5">
                      2. Modalidade de Atendimento *
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {activeModalities.includes('delivery') && (
                        <button
                          type="button"
                          onClick={() => setModalidade('delivery')}
                          className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${
                            modalidade === 'delivery'
                              ? 'border-[#c21e1e] bg-red-50/80 text-[#c21e1e] font-extrabold ring-1 ring-[#c21e1e]'
                              : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                          }`}
                        >
                          <Truck className="h-5 w-5" />
                          <span className="text-xs">Delivery</span>
                          <span className="text-[10px] text-stone-500">
                            +{formatCentsToBRL(deliveryFeeCents)}
                          </span>
                        </button>
                      )}

                      {activeModalities.includes('mesa') && (
                        <button
                          type="button"
                          onClick={() => setModalidade('mesa')}
                          className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${
                            modalidade === 'mesa'
                              ? 'border-[#c21e1e] bg-red-50/80 text-[#c21e1e] font-extrabold ring-1 ring-[#c21e1e]'
                              : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                          }`}
                        >
                          <UtensilsCrossed className="h-5 w-5" />
                          <span className="text-xs">Na Mesa</span>
                          <span className="text-[10px] text-stone-500">
                            Consumo local
                          </span>
                        </button>
                      )}

                      {activeModalities.includes('retirada') && (
                        <button
                          type="button"
                          onClick={() => setModalidade('retirada')}
                          className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center transition ${
                            modalidade === 'retirada'
                              ? 'border-[#c21e1e] bg-red-50/80 text-[#c21e1e] font-extrabold ring-1 ring-[#c21e1e]'
                              : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400'
                          }`}
                        >
                          <Store className="h-5 w-5" />
                          <span className="text-xs">Retirada</span>
                          <span className="text-[10px] text-stone-500">
                            No balcão
                          </span>
                        </button>
                      )}
                    </div>
                  </section>

                  {/* 3. Formulário Dinâmico de Dados do Cliente */}
                  <section className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                      3. Seus Dados ({MODALITY_LABELS[modalidade]})
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Seu Nome *
                        </label>
                        <input
                          type="text"
                          value={clienteNome}
                          onChange={(e) => setClienteNome(e.target.value)}
                          placeholder="Ex: João Silva"
                          className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                            fieldErrors.clienteNome
                              ? 'border-[#c21e1e] bg-red-50/30'
                              : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Telefone / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          value={clienteTelefone}
                          onChange={(e) => setClienteTelefone(e.target.value)}
                          placeholder="Ex: (19) 99999-9999"
                          className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                            fieldErrors.clienteTelefone
                              ? 'border-[#c21e1e] bg-red-50/30'
                              : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Campos específicos para DELIVERY */}
                    {modalidade === 'delivery' && (
                      <div className="space-y-3 pt-2 border-t border-stone-100">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Rua / Logradouro *
                            </label>
                            <input
                              type="text"
                              value={rua}
                              onChange={(e) => setRua(e.target.value)}
                              placeholder="Ex: Rua das Flores"
                              className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                                fieldErrors.rua
                                  ? 'border-[#c21e1e] bg-red-50/30'
                                  : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Número *
                            </label>
                            <input
                              type="text"
                              value={numero}
                              onChange={(e) => setNumero(e.target.value)}
                              placeholder="Ex: 120"
                              className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                                fieldErrors.numero
                                  ? 'border-[#c21e1e] bg-red-50/30'
                                  : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Bairro *
                            </label>
                            <input
                              type="text"
                              value={bairro}
                              onChange={(e) => setBairro(e.target.value)}
                              placeholder="Ex: Jd. Nova Leme"
                              className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                                fieldErrors.bairro
                                  ? 'border-[#c21e1e] bg-red-50/30'
                                  : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 mb-1">
                              Complemento (opcional)
                            </label>
                            <input
                              type="text"
                              value={complemento}
                              onChange={(e) => setComplemento(e.target.value)}
                              placeholder="Ex: Casa 2 / Apto 14"
                              className="w-full rounded-xl border border-stone-300 bg-[#fdfbf7] px-3 py-2 text-xs text-stone-900 focus:border-[#c21e1e] focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Ponto de Referência (opcional)
                          </label>
                          <input
                            type="text"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            placeholder="Ex: Próximo à praça / portão branco"
                            className="w-full rounded-xl border border-stone-300 bg-[#fdfbf7] px-3 py-2 text-xs text-stone-900 focus:border-[#c21e1e] focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}

                    {/* Campo específico para CONSUMO NA MESA */}
                    {modalidade === 'mesa' && (
                      <div className="pt-2 border-t border-stone-100">
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          Número ou Identificação da Mesa *
                        </label>
                        <input
                          type="text"
                          value={numeroMesa}
                          onChange={(e) => setNumeroMesa(e.target.value)}
                          placeholder="Ex: Mesa 04"
                          className={`w-full rounded-xl border px-3 py-2 text-xs text-stone-900 focus:outline-hidden ${
                            fieldErrors.numeroMesa
                              ? 'border-[#c21e1e] bg-red-50/30'
                              : 'border-stone-300 bg-[#fdfbf7] focus:border-[#c21e1e]'
                          }`}
                        />
                      </div>
                    )}

                    {/* Aviso informativo para RETIRADA NO BALCÃO */}
                    {modalidade === 'retirada' && (
                      <div className="rounded-xl bg-amber-50/80 p-3 text-[11px] text-stone-700 border border-amber-200/70">
                        <strong className="text-stone-900 block">
                          Endereço para Retirada no Balcão:
                        </strong>
                        {storeConfig?.endereco || 'Rua dos Crisântemos'},{' '}
                        {storeConfig?.numero || '350'} —{' '}
                        {storeConfig?.bairro || 'Jd. Nova Leme'} (
                        {storeConfig?.pontoReferencia ||
                          'Em frente ao Mercado do Angu'}
                        )
                      </div>
                    )}

                    {/* Observações Gerais do Pedido */}
                    <div className="pt-1">
                      <label className="flex items-center gap-1 text-[11px] font-bold text-stone-700 mb-1">
                        <FileText className="h-3.5 w-3.5 text-stone-400" />
                        <span>Observações Gerais do Pedido (opcional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={observacoesCliente}
                        onChange={(e) => setObservacoesCliente(e.target.value)}
                        placeholder="Ex: Preciso de troco para R$ 100,00 / pagamento via PIX..."
                        className="w-full rounded-xl border border-stone-300 bg-[#fdfbf7] px-3 py-2 text-xs text-stone-900 focus:border-[#c21e1e] focus:outline-hidden"
                      />
                    </div>
                  </section>

                  {/* 4. Resumo Completo para Revisão antes do Envio */}
                  <section className="rounded-2xl border-2 border-amber-300/80 bg-amber-50/60 p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-stone-900 uppercase tracking-wider text-[11px]">
                      <ShieldCheck className="h-4 w-4 text-[#15803d]" />
                      <span>4. Resumo Financeiro Oficial</span>
                    </div>

                    <div className="space-y-1 pt-1 text-stone-700">
                      <div className="flex justify-between">
                        <span>Subtotal dos itens ({totalItemsCount}):</span>
                        <span className="font-bold">
                          {formatCentsToBRL(totalsCalculation.subtotalCents)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>
                          Taxa de entrega ({MODALITY_LABELS[modalidade]}):
                        </span>
                        <span className="font-bold">
                          {modalidade === 'delivery'
                            ? formatCentsToBRL(totalsCalculation.taxaEntregaCents)
                            : 'Grátis / Isento'}
                        </span>
                      </div>

                      <div className="flex justify-between border-t border-amber-300 pt-2 text-sm font-extrabold text-stone-950">
                        <span>TOTAL DO PEDIDO:</span>
                        <span className="text-[#15803d]">
                          {formatCentsToBRL(totalsCalculation.totalCents)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-stone-600 pt-1 leading-tight">
                      ⏳ Importante: Ao clicar em enviar, seu pedido será registrado como{' '}
                      <strong>Aguardando Confirmação</strong> e confirmado assim que nossa
                      equipe responder no WhatsApp.
                    </p>
                  </section>

                  {/* Mensagens de erro de validação */}
                  {validationErrors.length > 0 && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[#c21e1e] bg-red-50 p-3.5 text-xs text-[#c21e1e] space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-extrabold">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Verifique os campos obrigatórios:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Rodapé Fixo com Botão de Envio para o WhatsApp */}
            {cart.length > 0 && (
              <footer className="border-t border-stone-200 bg-white p-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendWhatsAppOrder}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#15803d] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/20 hover:bg-emerald-700 disabled:opacity-60 transition active:scale-98"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>
                    {isSubmitting
                      ? 'Validando e Abrindo WhatsApp...'
                      : `Enviar Pedido pelo WhatsApp (${formatCentsToBRL(
                          totalsCalculation.totalCents
                        )})`}
                  </span>
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default CartAndCheckoutDrawer
