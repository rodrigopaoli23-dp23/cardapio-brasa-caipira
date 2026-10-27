'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react'
import {
  CatalogItemStatus,
  CategoryRecord,
  ExtendedProduct,
  ProductAddonOption,
  ProductVariantOption,
} from '@/types/phase3.types'
import {
  createProduct,
  updateProduct,
  deleteProductSafely,
  setProductStatus,
  generateNextProductCode,
  isProductCodeUnique,
  getExistingOrderProductCodesFromStorage,
} from '@/lib/catalogManager'

export interface ProductFormModalProps {
  isOpen?: boolean
  mode?: 'create' | 'edit'
  initialProduct?: ExtendedProduct | null
  product?: ExtendedProduct | null
  allProducts: ExtendedProduct[]
  categories: CategoryRecord[]
  existingOrderProductCodes?: string[]
  onClose: () => void
  onSave: (updatedProducts: ExtendedProduct[], savedProduct: ExtendedProduct) => void
  onDelete?: (updatedProducts: ExtendedProduct[], deletedCode: string) => void
}

const WEEK_DAYS = [
  { index: 0, short: 'Dom', label: 'Domingo' },
  { index: 1, short: 'Seg', label: 'Segunda' },
  { index: 2, short: 'Ter', label: 'Terça' },
  { index: 3, short: 'Qua', label: 'Quarta' },
  { index: 4, short: 'Qui', label: 'Quinta' },
  { index: 5, short: 'Sex', label: 'Sexta' },
  { index: 6, short: 'Sáb', label: 'Sábado' },
]

const STATUS_OPTIONS: {
  value: CatalogItemStatus
  label: string
  badgeClass: string
  desc: string
}[] = [
  {
    value: 'published',
    label: 'Publicado',
    badgeClass: 'bg-[#15803d]/10 text-[#15803d] border-[#15803d]/30',
    desc: 'Visível e disponível para venda no cardápio público',
  },
  {
    value: 'unp_draft',
    label: 'Rascunho',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    desc: 'Em edição interna; oculto para os clientes',
  },
  {
    value: 'paused',
    label: 'Pausado',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
    desc: 'Pausado / esgotado temporariamente hoje',
  },
  {
    value: 'archived',
    label: 'Arquivado',
    badgeClass: 'bg-stone-100 text-stone-600 border-stone-300',
    desc: 'Inativo permanentemente, preservado para histórico',
  },
]

export function ProductFormModal({
  isOpen = true,
  mode,
  initialProduct,
  product,
  allProducts,
  categories,
  existingOrderProductCodes,
  onClose,
  onSave,
  onDelete,
}: ProductFormModalProps) {
  const targetProduct = initialProduct ?? product ?? null
  const effectiveMode: 'create' | 'edit' =
    mode ?? (targetProduct ? 'edit' : 'create')

  const activeCategories = useMemo(() => {
    const list = categories
      .filter((c) => !c.arquivada)
      .sort((a, b) => a.ordem - b.ordem)
    return list
  }, [categories])

  const catalogAddonSuggestions = useMemo(() => {
    return allProducts.filter((p) => p.classification === 'addon')
  }, [allProducts])

  // Form states
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('unidade')
  const [precoInput, setPrecoInput] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ingredientes, setIngredientes] = useState('')
  const [diaPeriodo, setDiaPeriodo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState<CatalogItemStatus>('published')
  const [diasAtivos, setDiasAtivos] = useState<number[]>([])
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')

  // Variações
  const [variantes, setVariantes] = useState<ProductVariantOption[]>([])
  const [newVariantName, setNewVariantName] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')

  // Adicionais
  const [adicionais, setAdicionais] = useState<ProductAddonOption[]>([])
  const [newAddonCode, setNewAddonCode] = useState('')
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')

  // Validação e exclusão
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(
    null
  )

  useEffect(() => {
    if (!isOpen) return
    setFormError(null)
    setDeleteStep(0)
    setDeleteBlockedMessage(null)

    if (effectiveMode === 'edit' && targetProduct) {
      setCodigo(targetProduct.codigo)
      setNome(targetProduct.produto)
      setCategoria(targetProduct.categoria)
      setUnidade(targetProduct.unidade || 'unidade')
      setPrecoInput(
        targetProduct.preco !== null && targetProduct.preco !== undefined
          ? String(targetProduct.preco).replace('.', ',')
          : ''
      )
      setDescricao(targetProduct.descricao || '')
      setIngredientes(targetProduct.ingredientes || '')
      setDiaPeriodo(targetProduct.dia_periodo || '')
      setObservacoes(targetProduct.observacoes || '')
      setStatus(
        targetProduct.status ||
          (targetProduct.observacoes?.includes('ESGOTADO')
            ? 'paused'
            : targetProduct.isCommercial
              ? 'published'
              : 'unp_draft')
      )
      setDiasAtivos(targetProduct.diasAtivos || [])
      setHorarioInicio(targetProduct.horarioInicio || '')
      setHorarioFim(targetProduct.horarioFim || '')
      setVariantes(targetProduct.variantes ? [...targetProduct.variantes] : [])
      setAdicionais(
        targetProduct.adicionaisDisponiveis
          ? [...targetProduct.adicionaisDisponiveis]
          : []
      )
    } else {
      const nextCode = generateNextProductCode(allProducts)
      setCodigo(nextCode)
      setNome('')
      setCategoria(activeCategories[0]?.nome || 'Espetinhos')
      setUnidade('unidade')
      setPrecoInput('')
      setDescricao('')
      setIngredientes('')
      setDiaPeriodo('Quarta a sábado')
      setObservacoes('')
      setStatus('published')
      setDiasAtivos([3, 4, 5, 6])
      setHorarioInicio('18:00')
      setHorarioFim('23:00')
      setVariantes([])
      setAdicionais([])
    }
  }, [isOpen, effectiveMode, targetProduct, allProducts, activeCategories])

  if (!isOpen) return null

  const codeIsUnique = isProductCodeUnique(
    allProducts,
    codigo,
    effectiveMode === 'edit' ? targetProduct?.codigo : undefined
  )
  const codeFormatValid = /^BC-\d{3,}$/i.test(codigo.trim())

  const toggleDay = (dayIdx: number) => {
    setDiasAtivos((prev) =>
      prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx].sort()
    )
  }

  const handleAddVariant = () => {
    const trimmedName = newVariantName.trim()
    const parsedPrice = parseFloat(newVariantPrice.replace(',', '.'))
    if (!trimmedName || isNaN(parsedPrice) || parsedPrice < 0) return

    const newVar: ProductVariantOption = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nome: trimmedName,
      preco: parsedPrice,
    }
    setVariantes((prev) => [...prev, newVar])
    setNewVariantName('')
    setNewVariantPrice('')
  }

  const handleRemoveVariant = (id: string) => {
    setVariantes((prev) => prev.filter((v) => v.id !== id))
  }

  const handleAddAddon = () => {
    const trimmedName = newAddonName.trim()
    const parsedPrice = parseFloat(newAddonPrice.replace(',', '.'))
    if (!trimmedName || isNaN(parsedPrice) || parsedPrice < 0) return

    const code =
      newAddonCode.trim().toUpperCase() ||
      `ADD-${String(adicionais.length + 1).padStart(2, '0')}`

    if (adicionais.some((a) => a.codigo === code)) return

    setAdicionais((prev) => [
      ...prev,
      { codigo: code, nome: trimmedName, preco: parsedPrice },
    ])
    setNewAddonCode('')
    setNewAddonName('')
    setNewAddonPrice('')
  }

  const handleQuickSelectCatalogAddon = (addonProd: ExtendedProduct) => {
    if (adicionais.some((a) => a.codigo === addonProd.codigo)) return
    setAdicionais((prev) => [
      ...prev,
      {
        codigo: addonProd.codigo,
        nome: addonProd.produto,
        preco: addonProd.preco ?? 5,
      },
    ])
  }

  const handleRemoveAddon = (addonCode: string) => {
    setAdicionais((prev) => prev.filter((a) => a.codigo !== addonCode))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!codeFormatValid) {
      setFormError('O código deve seguir o formato BC-XXX (ex: BC-088).')
      return
    }

    if (!codeIsUnique) {
      setFormError(
        `O código ${codigo.trim().toUpperCase()} já está sendo utilizado por outro produto.`
      )
      return
    }

    let parsedPreco: number | null = null
    if (precoInput.trim() !== '') {
      const num = parseFloat(precoInput.replace(',', '.'))
      if (isNaN(num) || num < 0) {
        setFormError('Informe um preço válido em R$ ou deixe em branco para sob consulta.')
        return
      }
      parsedPreco = num
    }

    const payload: Partial<ExtendedProduct> & {
      produto: string
      categoria: string
    } = {
      codigo: codigo.trim().toUpperCase(),
      produto: nome.trim(),
      categoria: categoria.trim(),
      unidade: unidade.trim() || 'unidade',
      preco: parsedPreco,
      descricao: descricao.trim() || null,
      ingredientes: ingredientes.trim() || null,
      dia_periodo: diaPeriodo.trim() || null,
      observacoes: observacoes.trim() || null,
      status,
      isCommercial: status !== 'archived',
      classification: targetProduct?.classification || 'commercial',
      variantes,
      adicionaisDisponiveis: adicionais,
      diasAtivos,
      horarioInicio: horarioInicio.trim(),
      horarioFim: horarioFim.trim(),
    }

    if (effectiveMode === 'create') {
      const result = createProduct(allProducts, payload)
      if (!result.success || !result.product) {
        setFormError(result.error || 'Não foi possível criar o produto.')
        return
      }
      onSave(result.products, result.product)
      onClose()
    } else if (targetProduct) {
      const result = updateProduct(allProducts, targetProduct.codigo, payload)
      if (!result.success || !result.product) {
        setFormError(result.error || 'Não foi possível atualizar o produto.')
        return
      }
      onSave(result.products, result.product)
      onClose()
    }
  }

  const handleConfirmDelete = () => {
    if (!targetProduct) return

    const orderCodes =
      existingOrderProductCodes ?? getExistingOrderProductCodesFromStorage()

    const result = deleteProductSafely(
      allProducts,
      targetProduct.codigo,
      orderCodes
    )

    if (!result.success) {
      if (result.blockedByHistory) {
        setDeleteBlockedMessage(
          result.error ||
            'Este produto possui pedidos vinculados no histórico e não pode ser excluído definitivamente.'
        )
      } else {
        setFormError(result.error || 'Erro ao tentar excluir produto.')
      }
      return
    }

    if (onDelete) {
      onDelete(result.products, targetProduct.codigo)
    }
    onClose()
  }

  const handleArchiveInstead = () => {
    if (!targetProduct) return
    const updatedList = setProductStatus(
      allProducts,
      targetProduct.codigo,
      'archived'
    )
    const archivedItem = updatedList.find(
      (p) => p.codigo === targetProduct.codigo
    )
    if (archivedItem) {
      onSave(updatedList, archivedItem)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfbf7] shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c21e1e]/10 px-2.5 py-0.5 text-xs font-bold text-[#c21e1e]">
              <Tag className="h-3.5 w-3.5" />
              {effectiveMode === 'create'
                ? 'Novo Produto no Catálogo'
                : `Editando ${targetProduct?.codigo}`}
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-stone-900">
              {effectiveMode === 'create'
                ? 'Adicionar Produto Completo'
                : `Ficha Completa — ${targetProduct?.produto}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-stone-50 p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto p-6"
        >
          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#c21e1e]/30 bg-[#c21e1e]/10 p-3.5 text-sm font-medium text-[#c21e1e]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bloco 1: Identificação, Código e Categoria */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Código BC-XXX *
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="BC-088"
                required
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-mono font-bold uppercase outline-none transition ${
                  !codeFormatValid || !codeIsUnique
                    ? 'border-[#c21e1e] bg-red-50 text-[#c21e1e]'
                    : 'border-stone-200 bg-white text-stone-900 focus:border-[#c21e1e]'
                }`}
              />
              {!codeFormatValid ? (
                <p className="mt-1 text-[11px] font-semibold text-[#c21e1e]">
                  Use o padrão BC-XXX
                </p>
              ) : !codeIsUnique ? (
                <p className="mt-1 text-[11px] font-semibold text-[#c21e1e]">
                  Código já existente!
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[#15803d]">
                  Código único válido
                </p>
              )}
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Espetinho de Fraldinha"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-[#c21e1e]"
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.nome}>
                    {cat.nome} {!cat.visivel ? '(Oculta)' : ''}
                  </option>
                ))}
                {categoria &&
                  !activeCategories.some((c) => c.nome === categoria) && (
                    <option value={categoria}>{categoria}</option>
                  )}
              </select>
            </div>
          </div>

          {/* Bloco 2: Preço, Unidade e Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Preço em R$ (vazio = sob consulta)
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-stone-400">
                  R$
                </span>
                <input
                  type="text"
                  value={precoInput}
                  onChange={(e) => setPrecoInput(e.target.value)}
                  placeholder="Sob consulta"
                  className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-3 pl-9 text-sm font-bold text-stone-900 outline-none focus:border-[#c21e1e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Unidade de Venda *
              </label>
              <input
                type="text"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="espeto, lanche, porção, 350 ml..."
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Status de Publicação
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CatalogItemStatus)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-900 outline-none focus:border-[#c21e1e]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicador visual do Status */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? opt.badgeClass + ' ring-2 ring-stone-900/10'
                      : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              )
            })}
            <span className="ml-auto text-xs text-stone-500">
              {STATUS_OPTIONS.find((s) => s.value === status)?.desc}
            </span>
          </div>

          {/* Bloco 3: Descrição Comercial e Ingredientes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Descrição Comercial
              </label>
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Espetinho preparado na brasa com tempero da casa"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Ingredientes
              </label>
              <textarea
                rows={2}
                value={ingredientes}
                onChange={(e) => setIngredientes(e.target.value)}
                placeholder="Ex: Carne bovina selecionada; tempero caipira"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>
          </div>

          {/* Bloco 4: Disponibilidade por Dia/Período e Horário */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
              <Clock className="h-4 w-4 text-[#f59e0b]" />
              Dia / Período de Venda e Janela de Horário
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-stone-600">
                  Texto do Período
                </label>
                <input
                  type="text"
                  value={diaPeriodo}
                  onChange={(e) => setDiaPeriodo(e.target.value)}
                  placeholder="Ex: Quarta a sábado, Domingo 10h–14h"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">
                  Horário Inicial
                </label>
                <input
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">
                  Horário Final
                </label>
                <input
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-stone-600 mb-1.5">
                Dias da semana ativos (opcional):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const isSelected = diasAtivos.includes(d.index)
                  return (
                    <button
                      key={d.index}
                      type="button"
                      onClick={() => toggleDay(d.index)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#c21e1e] bg-[#c21e1e] text-white'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {d.short}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bloco 5: Variações do Produto */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                <Layers className="h-4 w-4 text-[#c21e1e]" />
                Variações de Preço / Tamanho ({variantes.length})
              </div>
            </div>

            {variantes.length > 0 && (
              <div className="space-y-2">
                {variantes.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-stone-800">{v.nome}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#15803d]">
                        R$ {v.preco.toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="text-stone-400 hover:text-[#c21e1e]"
                        title="Remover variação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                placeholder="Nome da variação (ex: Porção 500g, No Prato)"
                className="flex-1 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm outline-none focus:border-[#c21e1e]"
              />
              <input
                type="text"
                value={newVariantPrice}
                onChange={(e) => setNewVariantPrice(e.target.value)}
                placeholder="Preço R$ (ex: 24,90)"
                className="w-full sm:w-36 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm outline-none focus:border-[#c21e1e]"
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Bloco 6: Adicionais Permitidos */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                <Sparkles className="h-4 w-4 text-[#f59e0b]" />
                Adicionais Permitidos ({adicionais.length})
              </div>
            </div>

            {catalogAddonSuggestions.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-stone-500 mb-1.5">
                  Vincular rapidamente adicionais do catálogo (BC-073 a BC-079):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {catalogAddonSuggestions.map((addon) => {
                    const alreadyAdded = adicionais.some(
                      (a) => a.codigo === addon.codigo
                    )
                    return (
                      <button
                        key={addon.codigo}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => handleQuickSelectCatalogAddon(addon)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          alreadyAdded
                            ? 'border-[#15803d]/30 bg-[#15803d]/10 text-[#15803d] opacity-60'
                            : 'border-stone-200 bg-[#fdfbf7] text-stone-700 hover:border-[#f59e0b] hover:bg-amber-50'
                        }`}
                      >
                        + {addon.produto} ({addon.codigo})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {adicionais.length > 0 && (
              <div className="space-y-2">
                {adicionais.map((add) => (
                  <div
                    key={add.codigo}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="mr-2 rounded bg-stone-200 px-1.5 py-0.5 font-mono text-xs font-bold text-stone-700">
                        {add.codigo}
                      </span>
                      <span className="font-semibold text-stone-800">
                        {add.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#15803d]">
                        + R$ {add.preco.toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(add.codigo)}
                        className="text-stone-400 hover:text-[#c21e1e]"
                        title="Remover adicional"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newAddonCode}
                onChange={(e) => setNewAddonCode(e.target.value.toUpperCase())}
                placeholder="Cód (ex: BC-075)"
                className="w-full sm:w-28 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm font-mono outline-none focus:border-[#c21e1e]"
              />
              <input
                type="text"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                placeholder="Nome do adicional (ex: Requeijão gratinado)"
                className="flex-1 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm outline-none focus:border-[#c21e1e]"
              />
              <input
                type="text"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                placeholder="R$ (ex: 4,00)"
                className="w-full sm:w-28 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm outline-none focus:border-[#c21e1e]"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700"
              >
                <Plus className="h-4 w-4" />
                Incluir
              </button>
            </div>
          </div>

          {/* Observações internas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Observações Internas / Operacionais
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas de montagem ou conferência"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
            />
          </div>

          {/* Zona de Exclusão Definitiva (apenas no modo edição) */}
          {effectiveMode === 'edit' && targetProduct && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              {deleteBlockedMessage ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 text-xs font-semibold text-[#c21e1e]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{deleteBlockedMessage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleArchiveInstead}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
                    >
                      <Archive className="h-4 w-4" />
                      Arquivar Produto com Segurança
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteStep(0)
                        setDeleteBlockedMessage(null)
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : deleteStep === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-stone-800">
                      Exclusão Definitiva do Produto
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Produtos com pedidos registrados são protegidos e devem ser arquivados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#c21e1e]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#c21e1e] transition hover:bg-[#c21e1e] hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir Produto
                  </button>
                </div>
              ) : deleteStep === 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#c21e1e]">
                    Confirmação 1/2: Deseja realmente remover {targetProduct.codigo} ({targetProduct.produto})?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="rounded-xl bg-[#c21e1e] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Sim, prosseguir
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-[#c21e1e]">
                    Confirmação Final (2/2): Esta ação é irreversível. Confirmar exclusão definitiva?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#c21e1e] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Confirmar Exclusão Definitiva
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!codeFormatValid || !codeIsUnique}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c21e1e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {effectiveMode === 'create'
                ? 'Cadastrar Produto'
                : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductFormModal
