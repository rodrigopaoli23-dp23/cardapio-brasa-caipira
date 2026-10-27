'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit3,
  Archive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  X,
  Package,
} from 'lucide-react'
import { CategoryRecord, ExtendedProduct } from '@/types/phase3.types'
import {
  createCategory,
  updateCategory,
  reorderCategory,
  deleteCategorySafely,
  organizePorcoesCategory,
  loadCategoriesFromStorage,
  saveCategoriesToStorage,
  saveCatalogToStorage,
} from '@/lib/catalogManager'

export interface CategoriesManagerSectionProps {
  products: ExtendedProduct[]
  categories?: CategoryRecord[]
  onUpdateCategories?: (updatedCategories: CategoryRecord[]) => void
  onUpdateProducts?: (updatedProducts: ExtendedProduct[]) => void
}

export function CategoriesManagerSection({
  products,
  categories: externalCategories,
  onUpdateCategories,
  onUpdateProducts,
}: CategoriesManagerSectionProps) {
  const [internalCategories, setInternalCategories] = useState<CategoryRecord[]>(
    () => externalCategories ?? loadCategoriesFromStorage(products)
  )

  useEffect(() => {
    if (externalCategories) {
      setInternalCategories(externalCategories)
    }
  }, [externalCategories])

  const categories = externalCategories ?? internalCategories

  const syncCategories = (nextCategories: CategoryRecord[]) => {
    setInternalCategories(nextCategories)
    saveCategoriesToStorage(nextCategories)
    if (onUpdateCategories) {
      onUpdateCategories(nextCategories)
    }
  }

  const syncProducts = (nextProducts: ExtendedProduct[]) => {
    saveCatalogToStorage(nextProducts)
    if (onUpdateProducts) {
      onUpdateProducts(nextProducts)
    }
  }

  // Estados de criação de nova categoria
  const [isCreating, setIsCreating] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatVisible, setNewCatVisible] = useState(true)

  // Estados de edição inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Feedback e alertas
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning'
    message: string
  } | null>(null)

  const showFeedback = (
    type: 'success' | 'error' | 'warning',
    message: string
  ) => {
    setFeedback({ type, message })
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev))
    }, 5000)
  }

  // Ordenação e contagem de produtos por categoria
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.ordem - b.ordem)
  }, [categories])

  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of products) {
      const key = p.categoria.trim().toLowerCase()
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [products])

  const getLinkedCount = (catName: string) => {
    return productCountByCategory[catName.trim().toLowerCase()] || 0
  }

  // Criar categoria
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const res = createCategory(categories, {
      nome: newCatName,
      descricao: newCatDesc,
      visivel: newCatVisible,
    })

    if (!res.success) {
      showFeedback('error', res.error || 'Erro ao criar categoria.')
      return
    }

    syncCategories(res.categories)
    setNewCatName('')
    setNewCatDesc('')
    setNewCatVisible(true)
    setIsCreating(false)
    showFeedback(
      'success',
      `Categoria "${res.category?.nome}" criada com sucesso!`
    )
  }

  // Organizar e consolidar categoria Porções
  const handleOrganizePorcoes = () => {
    const result = organizePorcoesCategory(products, categories)
    syncProducts(result.products)
    syncCategories(result.categories)

    const porcoesItemsCount = result.products.filter(
      (p) => p.categoria === 'Porções'
    ).length

    showFeedback(
      'success',
      `Categoria "Porções" organizada com sucesso! (${porcoesItemsCount} itens ativos em Porções, ${result.unifiedCount} reclassificado(s) e ${result.addedCount} adicionado(s) sem duplicidade).`
    )
  }

  // Subir ou descer ordem
  const handleMove = (id: string, direction: 'up' | 'down') => {
    const reordered = reorderCategory(categories, id, direction)
    syncCategories(reordered)
  }

  // Alternar visibilidade pública
  const handleToggleVisible = (cat: CategoryRecord) => {
    const res = updateCategory(categories, cat.id, {
      visivel: !cat.visivel,
    })
    if (res.success) {
      syncCategories(res.categories)
      showFeedback(
        'success',
        `Visibilidade de "${cat.nome}" alterada para ${
          !cat.visivel ? 'Visível no Cardápio' : 'Oculta do Público'
        }.`
      )
    }
  }

  // Alternar arquivamento
  const handleToggleArchive = (cat: CategoryRecord) => {
    const nextArchived = !cat.arquivada
    const res = updateCategory(categories, cat.id, {
      arquivada: nextArchived,
      visivel: nextArchived ? false : cat.visivel,
    })
    if (res.success) {
      syncCategories(res.categories)
      showFeedback(
        'success',
        nextArchived
          ? `Categoria "${cat.nome}" arquivada e ocultada do cardápio.`
          : `Categoria "${cat.nome}" restaurada do arquivo.`
      )
    }
  }

  // Iniciar edição de nome/descrição
  const handleStartEdit = (cat: CategoryRecord) => {
    setEditingId(cat.id)
    setEditName(cat.nome)
    setEditDesc(cat.descricao)
  }

  // Salvar edição de nome/descrição
  const handleSaveEdit = (catId: string) => {
    const res = updateCategory(
      categories,
      catId,
      {
        nome: editName,
        descricao: editDesc,
      },
      products
    )

    if (!res.success) {
      showFeedback('error', res.error || 'Erro ao atualizar categoria.')
      return
    }

    syncCategories(res.categories)
    if (res.products) {
      syncProducts(res.products)
    }
    setEditingId(null)
    showFeedback('success', 'Categoria atualizada com sucesso!')
  }

  // Excluir categoria (bloqueando se houver produtos vinculados)
  const handleDeleteCategory = (cat: CategoryRecord) => {
    const res = deleteCategorySafely(categories, cat.nome, products)

    if (!res.success) {
      showFeedback(
        res.blockedByProducts ? 'warning' : 'error',
        res.error || 'Não foi possível excluir a categoria.'
      )
      return
    }

    syncCategories(res.categories)
    showFeedback(
      'success',
      `Categoria vazia "${cat.nome}" excluída permanentemente.`
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações Rápidas */}
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-[#fdfbf7] p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#c21e1e]" />
            <h2 className="text-lg font-extrabold text-stone-900">
              Gerenciamento de Categorias
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-600">
            Crie, ordene, edite visibilidade ou consolide categorias. Categorias
            com produtos vinculados são protegidas contra exclusão acidental.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOrganizePorcoes}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#f59e0b] bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs transition hover:bg-[#f59e0b] hover:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Consolidar Categoria &ldquo;Porções&rdquo;
          </button>

          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#c21e1e] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-800"
          >
            <Plus className="h-4 w-4" />
            Nova Categoria
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm font-medium shadow-xs ${
            feedback.type === 'success'
              ? 'border-[#15803d]/30 bg-[#15803d]/10 text-[#15803d]'
              : feedback.type === 'warning'
                ? 'border-[#f59e0b] bg-amber-50 text-amber-900'
                : 'border-[#c21e1e]/30 bg-[#c21e1e]/10 text-[#c21e1e]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Formulário para Criar Nova Categoria */}
      {isCreating && (
        <form
          onSubmit={handleCreateCategory}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900">
              Cadastrar Nova Categoria
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Nome da Categoria *
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Porções Especiais"
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3.5 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Descrição Comercial
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Breve descrição exibida no topo da seção"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3.5 py-2 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col justify-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-2 text-xs font-bold text-stone-800">
                <input
                  type="checkbox"
                  checked={newCatVisible}
                  onChange={(e) => setNewCatVisible(e.target.checked)}
                  className="h-4 w-4 accent-[#15803d]"
                />
                Visível
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#15803d] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-green-800"
            >
              <Save className="h-3.5 w-3.5" />
              Criar Categoria
            </button>
          </div>
        </form>
      )}

      {/* Listagem Ordenada de Categorias */}
      <div className="space-y-3">
        {sortedCategories.map((cat, idx) => {
          const linkedCount = getLinkedCount(cat.nome)
          const isEditing = editingId === cat.id

          return (
            <div
              key={cat.id}
              className={`rounded-2xl border p-4 transition ${
                cat.arquivada
                  ? 'border-stone-200 bg-stone-100/75 opacity-75'
                  : 'border-stone-200 bg-white shadow-2xs'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-600">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm font-bold text-stone-900 outline-none focus:border-[#c21e1e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-sm text-stone-900 outline-none focus:border-[#c21e1e]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#15803d] px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    {/* Controles de Ordem */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(cat.id, 'up')}
                        className="rounded-lg border border-stone-200 bg-[#fdfbf7] p-1 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
                        title="Subir posição"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-[11px] font-bold text-stone-400">
                        #{cat.ordem}
                      </span>
                      <button
                        type="button"
                        disabled={idx === sortedCategories.length - 1}
                        onClick={() => handleMove(cat.id, 'down')}
                        className="rounded-lg border border-stone-200 bg-[#fdfbf7] p-1 text-stone-600 transition hover:bg-stone-100 disabled:opacity-30"
                        title="Descer posição"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Informações da Categoria */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-stone-900">
                          {cat.nome}
                        </h3>

                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-[#fdfbf7] px-2.5 py-0.5 text-xs font-bold text-stone-700">
                          <Package className="h-3 w-3 text-[#c21e1e]" />
                          {linkedCount} {linkedCount === 1 ? 'item' : 'itens'}
                        </span>

                        {cat.visivel && !cat.arquivada ? (
                          <span className="rounded-full bg-[#15803d]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#15803d]">
                            Pública
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">
                            Oculta
                          </span>
                        )}

                        {cat.arquivada && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            Arquivada
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-stone-500">
                        {cat.descricao}
                      </p>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(cat)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        cat.visivel
                          ? 'border-stone-200 bg-[#fdfbf7] text-stone-700 hover:bg-stone-100'
                          : 'border-[#15803d]/30 bg-[#15803d]/10 text-[#15803d]'
                      }`}
                      title="Alternar visibilidade no cardápio público"
                    >
                      {cat.visivel ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Exibir
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleArchive(cat)}
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-[#fdfbf7] px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-50"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {cat.arquivada ? 'Desarquivar' : 'Arquivar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        linkedCount > 0
                          ? 'border-stone-200 bg-stone-100 text-stone-400 hover:border-amber-400 hover:text-amber-800'
                          : 'border-[#c21e1e]/30 bg-red-50 text-[#c21e1e] hover:bg-[#c21e1e] hover:text-white'
                      }`}
                      title={
                        linkedCount > 0
                          ? `Protegida: possui ${linkedCount} produto(s) vinculado(s)`
                          : 'Excluir categoria vazia'
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CategoriesManagerSection
