'use client'

import React, { useState, useEffect } from 'react'
import {
  Flame,
  Sparkles,
  Plus,
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  BookOpen,
  Utensils,
} from 'lucide-react'
import { GreekBBQProgram } from '@/types/phase3.types'
import {
  DEFAULT_GREEK_BBQ_PROGRAMS,
  HISTORICAL_GREEK_RECIPES,
  HistoricalGreekRecipePreset,
  applyHistoricalRecipeToProgram,
  loadGreekBBQPrograms,
  saveGreekBBQPrograms,
} from '@/lib/storeAndScheduleManager'
import { validateImageFile } from '@/lib/photos'

export interface ChurrascoGregoSectionProps {
  onProgramsUpdated?: (programs: GreekBBQProgram[]) => void
}

export default function ChurrascoGregoSection({
  onProgramsUpdated,
}: ChurrascoGregoSectionProps = {}) {
  const [programs, setPrograms] = useState<GreekBBQProgram[]>(
    DEFAULT_GREEK_BBQ_PROGRAMS
  )
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    DEFAULT_GREEK_BBQ_PROGRAMS[0].id
  )
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Inputs temporários para adicionar itens de lista (opções de lanche, porção, acompanhamentos)
  const [newLancheOption, setNewLancheOption] = useState('')
  const [newPorcaoOption, setNewPorcaoOption] = useState('')
  const [newAcompanhamento, setNewAcompanhamento] = useState('')

  useEffect(() => {
    const loaded = loadGreekBBQPrograms()
    setPrograms(loaded)
    if (loaded.length > 0) {
      setSelectedProgramId(loaded[0].id)
    }
  }, [])

  const currentProgram =
    programs.find((p) => p.id === selectedProgramId) || programs[0]

  const persistPrograms = (
    updatedList: GreekBBQProgram[],
    successMessage?: string
  ) => {
    setPrograms(updatedList)
    saveGreekBBQPrograms(updatedList)
    onProgramsUpdated?.(updatedList)
    if (successMessage) {
      setFeedback({ type: 'success', text: successMessage })
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const updateCurrentProgram = (patch: Partial<GreekBBQProgram>) => {
    if (!currentProgram) return
    const updatedList = programs.map((item) =>
      item.id === currentProgram.id ? { ...item, ...patch } : item
    )
    setPrograms(updatedList)
  }

  // Adicionar novo dia configurável de Churrasco Grego
  const handleAddNewProgramDay = () => {
    const newId = `grego-custom-${Date.now()}`
    const newProg: GreekBBQProgram = {
      id: newId,
      diaSemana: 'Sexta-feira (Novo Dia)',
      titulo: 'Nova Programação de Churrasco Grego',
      horario: '18:00 às 23:00',
      carnePrincipal: 'Carne a definir pelo administrador',
      tipoCarne: 'bovina',
      descricaoReceita:
        'Programação adicional configurável de Churrasco Grego na brasa.',
      ingredientes: 'Cortes selecionados na brasa e tempero da casa',
      fotoUrl: null,
      precoLanche: null,
      precoPorcao: null,
      status: 'draft',
      opcoesLanche: [
        'Lanche Grego Simples (Pão baguete pequeno, vinagrete, molho especial e maionese)',
      ],
      opcoesPorcao: ['Porção de Churrasco Grego no prato'],
      acompanhamentos: ['Vinagrete', 'Farofa da casa', 'Batata frita'],
      produtosAssociados: [],
    }

    const updated = [...programs, newProg]
    persistPrograms(
      updated,
      'Novo dia de Churrasco Grego criado como Rascunho! Configure os detalhes abaixo.'
    )
    setSelectedProgramId(newId)
  }

  // Aplicar receita histórica (BC-069 a BC-072) sem precisar recriar o cardápio
  const handleApplyHistoricalPreset = (
    codigo: HistoricalGreekRecipePreset['codigo']
  ) => {
    if (!currentProgram) return
    const updatedProg = applyHistoricalRecipeToProgram(currentProgram, codigo)
    const updatedList = programs.map((item) =>
      item.id === currentProgram.id ? updatedProg : item
    )
    persistPrograms(
      updatedList,
      `Receita histórica ${codigo} aplicada à programação de ${currentProgram.diaSemana}!`
    )
  }

  // Upload de foto da programação
  const handleProgramPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProgram) return

    const validation = validateImageFile({
      name: file.name,
      type: file.type,
      size: file.size,
    })

    if (!validation.isValid) {
      setFeedback({
        type: 'error',
        text: validation.error || 'Arquivo de imagem inválido.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      if (base64) {
        const updatedList = programs.map((p) =>
          p.id === currentProgram.id ? { ...p, fotoUrl: base64 } : p
        )
        persistPrograms(
          updatedList,
          'Foto oficial da programação de Churrasco Grego atualizada!'
        )
      }
    }
    reader.readAsDataURL(file)
  }

  // Salvar alterações da programação selecionada
  const handleSaveProgramForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProgram) return

    persistPrograms(
      programs,
      `Programação "${currentProgram.titulo}" (${currentProgram.diaSemana}) salva com sucesso!`
    )
  }

  // Remover programação customizada (protegendo Quinta, Sábado e Rascunho Oficial de Costela)
  const handleRemoveProgram = (id: string) => {
    if (
      id === 'grego-quinta' ||
      id === 'grego-sabado' ||
      id === 'grego-costela-draft'
    ) {
      setFeedback({
        type: 'error',
        text: 'As programações oficiais (Quinta, Sábado e Rascunho de Costela) não podem ser excluídas — use o status Rascunho ou Pausado.',
      })
      return
    }
    const remaining = programs.filter((p) => p.id !== id)
    persistPrograms(remaining, 'Programação removida com sucesso.')
    if (remaining.length > 0) {
      setSelectedProgramId(remaining[0].id)
    }
  }

  const getStatusBadge = (status: GreekBBQProgram['status']) => {
    if (status === 'published') {
      return (
        <span className="rounded-lg bg-[#15803d] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
          Publicado
        </span>
      )
    }
    if (status === 'paused') {
      return (
        <span className="rounded-lg bg-[#c21e1e] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
          Pausado
        </span>
      )
    }
    return (
      <span className="rounded-lg bg-[#f59e0b] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-stone-950">
        Rascunho
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba Renomeada: CHURRASCO GREGO */}
      <div className="rounded-2xl border border-stone-200 bg-[#fdfbf7] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#c21e1e] text-white shadow-md">
              <Flame className="h-6 w-6 text-[#f59e0b]" />
            </div>
            <div>
              <span className="inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                Gestão Completa de Espeto Vertical
              </span>
              <h2 className="text-lg font-extrabold text-stone-900 mt-0.5">
                Churrasco Grego — Quinta, Sábado & Edições Especiais
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Administre a carne rotativa de Quinta-feira, a Fraldinha Extra Grill de Sábado, o rascunho de Costela Bovina Fatiada e crie novos dias.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddNewProgramDay}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-xs font-extrabold text-stone-950 shadow-xs hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Novo Dia</span>
          </button>
        </div>

        {/* Cartões Seletores das Programações */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {programs.map((prog) => {
            const isSelected = prog.id === currentProgram?.id
            return (
              <div
                key={prog.id}
                onClick={() => setSelectedProgramId(prog.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  isSelected
                    ? 'border-[#c21e1e] bg-white ring-2 ring-[#c21e1e]/20 shadow-sm'
                    : 'border-stone-200 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#c21e1e]">
                    <Calendar className="h-3.5 w-3.5" />
                    {prog.diaSemana}
                  </span>
                  {getStatusBadge(prog.status)}
                </div>

                <h3 className="mt-2 text-xs font-extrabold text-stone-900 line-clamp-1">
                  {prog.titulo}
                </h3>
                <p className="mt-1 text-[11px] text-stone-600 line-clamp-2">
                  {prog.carnePrincipal}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-[11px] font-bold text-stone-700">
                  <span>
                    Lanche:{' '}
                    {prog.precoLanche !== null
                      ? `R$ ${prog.precoLanche.toFixed(2).replace('.', ',')}`
                      : 'Sem preço'}
                  </span>
                  <span>
                    Porção:{' '}
                    {prog.precoPorcao !== null
                      ? `R$ ${prog.precoPorcao.toFixed(2).replace('.', ',')}`
                      : 'Sem preço'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-bold ${
            feedback.type === 'success'
              ? 'border-[#15803d]/30 bg-[#15803d]/10 text-[#15803d]'
              : 'border-[#c21e1e]/30 bg-[#c21e1e]/10 text-[#c21e1e]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Formulário Detalhado da Programação Selecionada */}
      {currentProgram && (
        <form
          onSubmit={handleSaveProgramForm}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-stone-900">
                  Editando: {currentProgram.titulo}
                </h3>
                {getStatusBadge(currentProgram.status)}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                ID da programação: <code className="font-mono">{currentProgram.id}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentProgram.id !== 'grego-quinta' &&
                currentProgram.id !== 'grego-sabado' &&
                currentProgram.id !== 'grego-costela-draft' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProgram(currentProgram.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-[#c21e1e] hover:bg-rose-100 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Excluir Dia</span>
                  </button>
                )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#c21e1e] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-800 transition"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Programação</span>
              </button>
            </div>
          </div>

          {/* Seletor Rápido de Receitas Históricas (BC-069 a BC-072) */}
          <div className="rounded-2xl border border-amber-300/80 bg-[#fdfbf7] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-stone-900">
                <BookOpen className="h-4 w-4 text-[#f59e0b]" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider">
                  Seletor Rápido de Receitas Históricas (BC-069 a BC-072)
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-stone-500">
                Troque a carne da semana com 1 clique sem recriar os lanches
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {HISTORICAL_GREEK_RECIPES.map((preset) => {
                const isActivePreset =
                  currentProgram.carnePrincipal === preset.carnePrincipal ||
                  currentProgram.produtosAssociados.includes(preset.codigo)
                return (
                  <button
                    key={preset.codigo}
                    type="button"
                    onClick={() => handleApplyHistoricalPreset(preset.codigo)}
                    className={`rounded-xl border p-3 text-left transition ${
                      isActivePreset
                        ? 'border-[#c21e1e] bg-amber-50/90 ring-1 ring-[#c21e1e]'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-stone-900 px-2 py-0.5 text-[10px] font-mono font-bold text-[#f59e0b]">
                        {preset.codigo}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-stone-500">
                        Carne {preset.tipoCarne}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-extrabold text-stone-900">
                      {preset.nome}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-600 line-clamp-1">
                      {preset.ingredientes}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dados Principais: Dia, Horário, Status, Preços */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Dia da Semana / Rótulo
              </label>
              <input
                type="text"
                value={currentProgram.diaSemana}
                onChange={(e) =>
                  updateCurrentProgram({ diaSemana: e.target.value })
                }
                placeholder="Ex: Quinta-feira, Sábado, Sexta Especial"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Horário de Atendimento
              </label>
              <div className="relative">
                <Clock className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={currentProgram.horario}
                  onChange={(e) =>
                    updateCurrentProgram({ horario: e.target.value })
                  }
                  placeholder="18:00 às 23:00"
                  className="w-full rounded-xl border border-stone-300 pl-8 pr-3 py-2 text-xs text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Status de Publicação
              </label>
              <select
                value={currentProgram.status}
                onChange={(e) =>
                  updateCurrentProgram({
                    status: e.target.value as GreekBBQProgram['status'],
                  })
                }
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-extrabold text-stone-900"
              >
                <option value="published">Publicado (Visível no Cardápio)</option>
                <option value="draft">Rascunho (Oculto do Público)</option>
                <option value="paused">Pausado / Esgotado Hoje</option>
              </select>
            </div>
          </div>

          {/* Título, Tipo de Carne e Carne Principal */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Título Comercial da Programação
              </label>
              <input
                type="text"
                value={currentProgram.titulo}
                onChange={(e) =>
                  updateCurrentProgram({ titulo: e.target.value })
                }
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Classificação da Carne
              </label>
              <select
                value={currentProgram.tipoCarne}
                onChange={(e) =>
                  updateCurrentProgram({
                    tipoCarne: e.target.value as GreekBBQProgram['tipoCarne'],
                  })
                }
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900"
              >
                <option value="bovina">Bovina</option>
                <option value="suina">Suína</option>
                <option value="mista">Rotativa / Mista (Suína e Bovina)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Carne Principal em Destaque
            </label>
            <input
              type="text"
              value={currentProgram.carnePrincipal}
              onChange={(e) =>
                updateCurrentProgram({ carnePrincipal: e.target.value })
              }
              className="w-full rounded-xl border border-stone-300 bg-[#fdfbf7] px-3 py-2.5 text-xs font-extrabold text-stone-900"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Descrição da Receita / Modo de Preparo
              </label>
              <textarea
                rows={3}
                value={currentProgram.descricaoReceita}
                onChange={(e) =>
                  updateCurrentProgram({ descricaoReceita: e.target.value })
                }
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Ingredientes Detalhados
              </label>
              <textarea
                rows={3}
                value={currentProgram.ingredientes}
                onChange={(e) =>
                  updateCurrentProgram({ ingredientes: e.target.value })
                }
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900"
              />
            </div>
          </div>

          {/* Preços (Lanche e Porção) e Upload de Foto */}
          <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-stone-200 bg-[#fdfbf7] p-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Preço Base do Lanche (R$)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={
                  currentProgram.precoLanche !== null
                    ? currentProgram.precoLanche
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value
                  updateCurrentProgram({
                    precoLanche: val === '' ? null : parseFloat(val),
                  })
                }}
                placeholder="Deixe vazio para sob consulta / rascunho"
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Preço Base da Porção (R$)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={
                  currentProgram.precoPorcao !== null
                    ? currentProgram.precoPorcao
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value
                  updateCurrentProgram({
                    precoPorcao: val === '' ? null : parseFloat(val),
                  })
                }}
                placeholder="Deixe vazio para sob consulta / rascunho"
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Foto Oficial da Programação
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#f59e0b] bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{currentProgram.fotoUrl ? 'Trocar Foto' : 'Enviar Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProgramPhotoUpload}
                  />
                </label>

                {currentProgram.fotoUrl && (
                  <button
                    type="button"
                    onClick={() => updateCurrentProgram({ fotoUrl: null })}
                    className="rounded-xl border border-stone-300 bg-white p-2 text-stone-500 hover:text-[#c21e1e]"
                    title="Remover foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Opções de Lanche, Porção e Acompanhamentos */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Opções de Lanche */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-[#c21e1e]" />
                <span>Opções de Lanche</span>
              </h4>

              <ul className="space-y-1.5">
                {currentProgram.opcoesLanche.map((opt, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#fdfbf7] border border-stone-200 px-2.5 py-1.5 text-[11px] text-stone-800"
                  >
                    <span className="line-clamp-2">{opt}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCurrentProgram({
                          opcoesLanche: currentProgram.opcoesLanche.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="text-stone-400 hover:text-[#c21e1e] shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newLancheOption}
                  onChange={(e) => setNewLancheOption(e.target.value)}
                  placeholder="Adicionar opção de lanche..."
                  className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLancheOption.trim()) return
                    updateCurrentProgram({
                      opcoesLanche: [
                        ...currentProgram.opcoesLanche,
                        newLancheOption.trim(),
                      ],
                    })
                    setNewLancheOption('')
                  }}
                  className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>

            {/* Opções de Porção */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#f59e0b]" />
                <span>Opções de Porção</span>
              </h4>

              <ul className="space-y-1.5">
                {currentProgram.opcoesPorcao.map((opt, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#fdfbf7] border border-stone-200 px-2.5 py-1.5 text-[11px] text-stone-800"
                  >
                    <span className="line-clamp-2">{opt}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCurrentProgram({
                          opcoesPorcao: currentProgram.opcoesPorcao.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="text-stone-400 hover:text-[#c21e1e] shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPorcaoOption}
                  onChange={(e) => setNewPorcaoOption(e.target.value)}
                  placeholder="Adicionar opção de porção..."
                  className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPorcaoOption.trim()) return
                    updateCurrentProgram({
                      opcoesPorcao: [
                        ...currentProgram.opcoesPorcao,
                        newPorcaoOption.trim(),
                      ],
                    })
                    setNewPorcaoOption('')
                  }}
                  className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>

            {/* Acompanhamentos */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
                <span>Acompanhamentos</span>
              </h4>

              <ul className="space-y-1.5">
                {currentProgram.acompanhamentos.map((acomp, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#fdfbf7] border border-stone-200 px-2.5 py-1.5 text-[11px] text-stone-800"
                  >
                    <span>{acomp}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCurrentProgram({
                          acompanhamentos: currentProgram.acompanhamentos.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="text-stone-400 hover:text-[#c21e1e] shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newAcompanhamento}
                  onChange={(e) => setNewAcompanhamento(e.target.value)}
                  placeholder="Ex: Mandioca na manteiga..."
                  className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newAcompanhamento.trim()) return
                    updateCurrentProgram({
                      acompanhamentos: [
                        ...currentProgram.acompanhamentos,
                        newAcompanhamento.trim(),
                      ],
                    })
                    setNewAcompanhamento('')
                  }}
                  className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
