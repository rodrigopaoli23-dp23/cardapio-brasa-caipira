'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  FileText,
  CheckSquare,
  Square,
  Phone,
  MapPin,
  AtSign,
  Flame,
  Eye,
  Layers,
  AlertTriangle,
} from 'lucide-react'
import { INITIAL_PRODUCTS, InitialProduct } from '@/data/initialCatalog'
import {
  CategoryRecord,
  ExtendedProduct,
  GreekBBQProgram,
  StoreIdentityConfig,
} from '@/types/phase3.types'
import { formatCentsToBRL, reaisToCents } from '@/lib/money'

import { DEFAULT_STORE_IDENTITY } from '@/lib/storeAndScheduleManager'

export interface PrintableMenuGeneratorProps {
  products?: (InitialProduct | ExtendedProduct)[]
  categories?: CategoryRecord[]
  storeIdentity?: Partial<StoreIdentityConfig>
  greekPrograms?: GreekBBQProgram[]
}

function formatProductPriceForPrint(product: InitialProduct | ExtendedProduct): string {
  const ext = product as ExtendedProduct
  if (ext.variantes && ext.variantes.length > 0) {
    return ext.variantes
      .map((v) => `${v.nome}: ${formatCentsToBRL(reaisToCents(v.preco))}`)
      .join(' | ')
  }

  if (
    product.preco !== null &&
    product.preco !== undefined &&
    !isNaN(Number(product.preco)) &&
    Number(product.preco) > 0
  ) {
    return formatCentsToBRL(reaisToCents(Number(product.preco)))
  }

  return 'Sob consulta'
}

export default function PrintableMenuGenerator({
  products: externalProducts,
  categories: externalCategories,
  storeIdentity: externalIdentity,
  greekPrograms: externalGreekPrograms,
}: PrintableMenuGeneratorProps) {
  const [internalProducts, setInternalProducts] = useState<
    (InitialProduct | ExtendedProduct)[]
  >(INITIAL_PRODUCTS)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [onlyWithConfirmedPrice, setOnlyWithConfirmedPrice] = useState<boolean>(false)
  const [customFooterNote, setCustomFooterNote] = useState<string>(
    'Consulte a disponibilidade do dia e a Carne Especial do Churrasco Grego pelo nosso WhatsApp!'
  )

  useEffect(() => {
    if (externalProducts === undefined && typeof window !== 'undefined') {
      try {
        const storedV2 = window.localStorage.getItem('brasa_caipira_catalog_v2')
        const storedV1 = window.localStorage.getItem('brasa_caipira_catalog_v1')
        const raw = storedV2 || storedV1
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInternalProducts(parsed)
          }
        }
      } catch {
        // Fallback para INITIAL_PRODUCTS
      }
    }
  }, [externalProducts])

  const activeProducts =
    externalProducts !== undefined ? externalProducts : internalProducts

  const identity: StoreIdentityConfig = useMemo(
    () => ({
      ...DEFAULT_STORE_IDENTITY,
      ...(externalIdentity || {}),
    }),
    [externalIdentity]
  )

  // Filtra produtos comerciais publicados (nunca inclui rascunhos/ideias futuras/arquivados)
  const publishableProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      const ext = p as ExtendedProduct
      if (ext.status && ext.status !== 'published') return false
      if (!p.isCommercial) return false
      if (
        p.classification === 'historical_recipe' ||
        p.classification === 'future_idea'
      ) {
        return false
      }
      if (onlyWithConfirmedPrice) {
        const hasVariantPrice = ext.variantes && ext.variantes.length > 0
        const hasBasePrice =
          p.preco !== null && p.preco !== undefined && Number(p.preco) > 0
        return Boolean(hasVariantPrice || hasBasePrice)
      }
      return true
    })
  }, [activeProducts, onlyWithConfirmedPrice])

  // Lista de categorias disponíveis
  const availableCategories = useMemo(() => {
    if (externalCategories && externalCategories.length > 0) {
      return externalCategories
        .filter((c) => c.visivel && !c.arquivada)
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => c.nome)
    }
    const set = new Set<string>()
    for (const p of publishableProducts) {
      if (p.categoria) set.add(p.categoria)
    }
    return Array.from(set)
  }, [externalCategories, publishableProducts])

  // Inicializa categorias selecionadas quando carregadas
  useEffect(() => {
    if (availableCategories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(availableCategories)
    }
  }, [availableCategories, selectedCategories.length])

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName)
        ? prev.filter((c) => c !== catName)
        : [...prev, catName]
    )
  }

  const selectAllCategories = () => setSelectedCategories(availableCategories)
  const clearAllCategories = () => setSelectedCategories([])

  // Agrupa produtos pelas categorias selecionadas
  const groupedCategories = useMemo(() => {
    return availableCategories
      .filter((cat) => selectedCategories.includes(cat))
      .map((cat) => ({
        categoria: cat,
        items: publishableProducts.filter((p) => p.categoria === cat),
      }))
      .filter((g) => g.items.length > 0)
  }, [availableCategories, selectedCategories, publishableProducts])

  // Divide equilibradamente entre Página 1 (Frente) e Página 2 (Verso)
  const { frontPageGroups, backPageGroups } = useMemo(() => {
    if (groupedCategories.length <= 1) {
      return {
        frontPageGroups: groupedCategories,
        backPageGroups: [] as typeof groupedCategories,
      }
    }

    const totalItems = groupedCategories.reduce(
      (acc, g) => acc + g.items.length,
      0
    )
    const targetHalf = Math.ceil(totalItems / 2)

    const front: typeof groupedCategories = []
    const back: typeof groupedCategories = []
    let runningCount = 0

    groupedCategories.forEach((group, idx) => {
      if (
        idx === 0 ||
        (runningCount + group.items.length <= targetHalf + 3 &&
          idx < groupedCategories.length - 1)
      ) {
        front.push(group)
        runningCount += group.items.length
      } else {
        back.push(group)
      }
    })

    return { frontPageGroups: front, backPageGroups: back }
  }, [groupedCategories])

  const handlePrintA4 = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      {/* Estilos dedicados de impressão A4 Frente e Verso */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          #brasa-printable-a4-root,
          #brasa-printable-a4-root * {
            visibility: visible;
          }
          #brasa-printable-a4-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fdfbf7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-sheet-page {
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 275mm !important;
          }
          .a4-sheet-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      {/* Painel de Controles de Geração do Cardápio A4 */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#c21e1e]/10 text-[#c21e1e] text-xs font-bold mb-1.5">
              <FileText className="w-3.5 h-3.5" />
              Gerador Oficial A4 — Frente e Verso
            </div>
            <h2 className="text-xl font-black text-stone-900">
              Cardápio para Impressão e Exportação PDF (A4)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Layout diagramado em duas páginas A4 (Frente e Verso), pronto para gráfica, plastificação de mesa ou salvamento direto em PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintA4}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#c21e1e] hover:bg-red-800 text-white font-black text-sm shadow-md transition cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Salvar em PDF (A4)
          </button>
        </div>

        {/* Seleção de Categorias */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#c21e1e]" />
              Categorias Incluídas no Cardápio Impresso ({selectedCategories.length}/
              {availableCategories.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllCategories}
                className="text-xs font-bold text-[#15803d] hover:underline"
              >
                Marcar todas
              </button>
              <span className="text-stone-300">|</span>
              <button
                type="button"
                onClick={clearAllCategories}
                className="text-xs font-bold text-stone-500 hover:underline"
              >
                Limpar seleção
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => {
              const isChecked = selectedCategories.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    isChecked
                      ? 'bg-[#fdfbf7] border-[#c21e1e] text-[#c21e1e] shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-[#c21e1e]" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400" />
                  )}
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Opções Adicionais do Impresso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
          <label className="flex items-start gap-2.5 cursor-pointer bg-[#fdfbf7] p-3.5 rounded-xl border border-stone-200">
            <input
              type="checkbox"
              checked={onlyWithConfirmedPrice}
              onChange={(e) => setOnlyWithConfirmedPrice(e.target.checked)}
              className="mt-0.5 accent-[#c21e1e]"
            />
            <span className="text-xs text-stone-700">
              <strong className="text-stone-900 block">
                Ocultar itens sem preço cadastrado
              </strong>
              Se desmarcado, produtos sem preço exibem claramente{' '}
              <span className="font-semibold text-amber-800">&quot;Sob consulta&quot;</span> (nunca são gerados preços fictícios).
            </span>
          </label>

          <div>
            <label
              htmlFor="printable-footer-note"
              className="block text-xs font-bold uppercase text-stone-600 mb-1"
            >
              Mensagem de Rodapé do Cardápio:
            </label>
            <input
              id="printable-footer-note"
              type="text"
              value={customFooterNote}
              onChange={(e) => setCustomFooterNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:border-[#c21e1e]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 px-3.5 py-2 rounded-lg">
          <Eye className="w-4 h-4 text-[#f59e0b] shrink-0" />
          <span>
            Pré-visualização em proporção A4 abaixo. Na janela de impressão do navegador, selecione{' '}
            <strong>&quot;Salvar como PDF&quot;</strong> e marque <strong>&quot;Gráficos de segundo plano&quot;</strong>.
          </span>
        </div>
      </div>

      {/* Raiz Imprimível A4 (Frente e Verso) */}
      <div id="brasa-printable-a4-root" className="space-y-8">
        {/* PÁGINA 1 — FRENTE */}
        <section
          aria-label="Página 1 (Frente) — Cardápio A4"
          className="a4-sheet-page mx-auto max-w-[210mm] min-h-[297mm] bg-[#fdfbf7] text-stone-900 border-2 border-[#c21e1e] rounded-2xl print:rounded-none shadow-lg p-6 sm:p-8 flex flex-col justify-between"
        >
          <div className="space-y-5">
            {/* Cabeçalho Institucional da Frente */}
            <header className="bg-[#c21e1e] text-white rounded-xl p-5 border-b-4 border-[#f59e0b] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={identity.logoUrl || '/branding/logo-brasa-caipira.png'}
                  alt={identity.nome}
                  className="w-20 h-20 object-contain rounded-xl bg-[#fdfbf7] p-1.5 border-2 border-[#f59e0b]"
                />
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-[#f59e0b] text-stone-950 font-black text-[10px] uppercase tracking-widest mb-1">
                    Tradição na Brasa • Leme/SP
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {identity.nome}
                  </h1>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium">
                    {identity.slogan}
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right text-xs space-y-1 bg-black/20 px-4 py-2.5 rounded-lg border border-white/15">
                <p className="font-black text-[#f59e0b] uppercase tracking-wider">
                  Página 1 • Frente
                </p>
                <p className="font-bold text-white">{identity.telefoneExibicao}</p>
                <p className="text-amber-100">{identity.instagramHandle}</p>
              </div>
            </header>

            {/* Destaque Especial Churrasco Grego */}
            <div className="bg-gradient-to-r from-amber-50 via-[#fdfbf7] to-amber-50 border-2 border-[#f59e0b] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-[#c21e1e] shrink-0" />
                <div className="text-xs">
                  <strong className="text-[#c21e1e] uppercase tracking-wide">
                    Destaque da Casa — Churrasco Grego Original:
                  </strong>{' '}
                  <span className="text-stone-800 font-medium">
                    {externalGreekPrograms && externalGreekPrograms.length > 0
                      ? externalGreekPrograms
                          .map((g) => `${g.diaSemana}: ${g.carnePrincipal}`)
                          .join(' • ')
                      : identity.avisoEspecial}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black text-[#15803d] bg-[#15803d]/10 px-2.5 py-1 rounded-md shrink-0">
                {identity.avisoTopo}
              </span>
            </div>

            {/* Categorias da Página 1 (Frente) */}
            {frontPageGroups.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm border border-dashed border-stone-300 rounded-xl">
                Selecione ao menos uma categoria acima para compor a Frente do cardápio.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {frontPageGroups.map((group) => (
                  <div
                    key={group.categoria}
                    className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs"
                  >
                    <div className="bg-[#c21e1e] text-white px-3.5 py-2 flex items-center justify-between border-b-2 border-[#f59e0b]">
                      <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider">
                        {group.categoria}
                      </h3>
                      <span className="text-[10px] font-bold text-[#f59e0b]">
                        {group.items.length} opç{group.items.length === 1 ? 'ão' : 'ões'}
                      </span>
                    </div>
                    <ul className="divide-y divide-stone-100 p-3 space-y-2">
                      {group.items.map((item) => {
                        const priceText = formatProductPriceForPrint(item)
                        const isConsult = priceText === 'Sob consulta'
                        return (
                          <li
                            key={item.codigo}
                            className="pt-2 first:pt-0 flex items-baseline justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-stone-900">
                                {item.produto}
                              </span>
                              {(item.ingredientes || item.descricao) && (
                                <p className="text-[10px] text-stone-500 leading-snug line-clamp-1">
                                  {item.ingredientes || item.descricao}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 font-black px-2 py-0.5 rounded ${
                                isConsult
                                  ? 'text-amber-800 bg-[#f59e0b]/15 text-[10px]'
                                  : 'text-[#15803d] bg-[#15803d]/10 text-xs'
                              }`}
                            >
                              {priceText}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé da Página 1 (Frente) */}
          <footer className="mt-6 pt-3 border-t-2 border-[#c21e1e]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-600">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800">
              <MapPin className="w-3.5 h-3.5 text-[#c21e1e]" />
              <span>
                {identity.endereco}, {identity.numero} — {identity.bairro},{' '}
                {identity.cidadeEstado}
              </span>
            </div>
            <div className="font-bold text-[#c21e1e]">
              Continue no verso (Página 2) &rarr;
            </div>
          </footer>
        </section>

        {/* PÁGINA 2 — VERSO */}
        <section
          aria-label="Página 2 (Verso) — Cardápio A4"
          className="a4-sheet-page mx-auto max-w-[210mm] min-h-[297mm] bg-[#fdfbf7] text-stone-900 border-2 border-[#c21e1e] rounded-2xl print:rounded-none shadow-lg p-6 sm:p-8 flex flex-col justify-between"
        >
          <div className="space-y-5">
            {/* Cabeçalho Compacto do Verso */}
            <header className="bg-stone-900 text-white rounded-xl p-4 border-b-4 border-[#f59e0b] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={identity.logoUrl || '/branding/logo-brasa-caipira.png'}
                  alt={identity.nome}
                  className="w-12 h-12 object-contain rounded-lg bg-[#fdfbf7] p-1 border border-[#f59e0b]"
                />
                <div>
                  <h2 className="text-lg font-black text-[#f59e0b] tracking-tight">
                    {identity.nome} — Continuação do Cardápio
                  </h2>
                  <p className="text-xs text-stone-300">
                    Porções, Guarnições, Adicionais, Bebidas & Atendimento pelo WhatsApp
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded bg-[#c21e1e] text-white font-black text-xs uppercase">
                Página 2 • Verso
              </span>
            </header>

            {/* Categorias da Página 2 (Verso) */}
            {backPageGroups.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs border border-dashed border-stone-300 rounded-xl">
                Todas as categorias selecionadas couberam na Página 1 ou nenhuma categoria adicional foi marcada para o Verso.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {backPageGroups.map((group) => (
                  <div
                    key={group.categoria}
                    className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs"
                  >
                    <div className="bg-[#c21e1e] text-white px-3.5 py-2 flex items-center justify-between border-b-2 border-[#f59e0b]">
                      <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider">
                        {group.categoria}
                      </h3>
                      <span className="text-[10px] font-bold text-[#f59e0b]">
                        {group.items.length} opç{group.items.length === 1 ? 'ão' : 'ões'}
                      </span>
                    </div>
                    <ul className="divide-y divide-stone-100 p-3 space-y-2">
                      {group.items.map((item) => {
                        const priceText = formatProductPriceForPrint(item)
                        const isConsult = priceText === 'Sob consulta'
                        return (
                          <li
                            key={item.codigo}
                            className="pt-2 first:pt-0 flex items-baseline justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-stone-900">
                                {item.produto}
                              </span>
                              {(item.ingredientes || item.descricao) && (
                                <p className="text-[10px] text-stone-500 leading-snug line-clamp-1">
                                  {item.ingredientes || item.descricao}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 font-black px-2 py-0.5 rounded ${
                                isConsult
                                  ? 'text-amber-800 bg-[#f59e0b]/15 text-[10px]'
                                  : 'text-[#15803d] bg-[#15803d]/10 text-xs'
                              }`}
                            >
                              {priceText}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Quadro Institucional de Pedidos & Contato no Verso */}
            <div className="bg-white rounded-xl border-2 border-[#15803d] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[#15803d] uppercase">
                    Peça pelo WhatsApp
                  </p>
                  <p className="font-bold text-stone-900 text-sm">
                    {identity.telefoneExibicao}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Delivery, Retirada ou Mesa
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <AtSign className="w-4 h-4 text-[#c21e1e] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[#c21e1e] uppercase">
                    Siga no Instagram
                  </p>
                  <p className="font-bold text-stone-900 text-sm">
                    {identity.instagramHandle}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Novidades e Carne da Quinta
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-stone-900 uppercase">
                    Endereço em Leme/SP
                  </p>
                  <p className="font-bold text-stone-800">
                    {identity.endereco}, {identity.numero}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {identity.bairro} • {identity.cidadeEstado}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé Final da Página 2 (Verso) */}
          <footer className="mt-6 pt-3 border-t-2 border-[#c21e1e]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-600">
            <p className="font-medium text-stone-700">{customFooterNote}</p>
            <span className="font-black text-[#c21e1e] shrink-0">
              {identity.nome} • Leme/SP
            </span>
          </footer>
        </section>
      </div>
    </div>
  )
}
