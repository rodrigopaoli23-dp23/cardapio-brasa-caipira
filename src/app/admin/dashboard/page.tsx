'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Flame,
  Package,
  Layers,
  Settings,
  LogOut,
  Eye,
  CheckCircle2,
  XCircle,
  Edit3,
  Search,
  Calendar,
  AlertTriangle,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react'
import { INITIAL_PRODUCTS, InitialProduct } from '@/data/initialCatalog'
import { formatCentsToBRL } from '@/lib/money'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'produtos' | 'grego' | 'categorias' | 'config'>('produtos')
  const [products, setProducts] = useState<InitialProduct[]>(INITIAL_PRODUCTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('Todas')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editPriceInput, setEditPriceInput] = useState<string>('')
  
  // Controle da Carne da Quinta
  const [currentThursdayMeat, setCurrentThursdayMeat] = useState('Fraldinha Extra Grill com bacon Pamplona')
  const [meatFeedback, setMeatFeedback] = useState(false)

  // Configurações da Loja
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [storeNotice, setStoreNotice] = useState('Espetinhos na brasa e churrasco grego tradicional em Leme/SP!')
  const [savedConfigFeedback, setSavedConfigFeedback] = useState(false)

  // Logout
  const handleLogout = () => {
    document.cookie = 'admin_session=; path=/; max-age=0'
    router.push('/admin/login')
  }

  // Filtragem de produtos no painel
  const filtered = products.filter((p) => {
    const matchCat = selectedCat === 'Todas' || p.categoria === selectedCat
    const matchSearch =
      p.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  // Alternar disponibilidade rápida
  const toggleAvailability = (code: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.codigo === code) {
          // Inverte se estava disponível ou esgotado
          const isCurrentlyActive = !p.observacoes?.includes('ESGOTADO')
          const updatedObs = isCurrentlyActive
            ? `${p.observacoes || ''} [ESGOTADO HOJE]`.trim()
            : (p.observacoes || '').replace('[ESGOTADO HOJE]', '').trim()
          return { ...p, observacoes: updatedObs }
        }
        return p
      })
    )
  }

  // Salvar preço alterado
  const handleSavePrice = (code: string) => {
    const num = parseFloat(editPriceInput.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      setProducts((prev) =>
        prev.map((p) => (p.codigo === code ? { ...p, preco: num } : p))
      )
      setEditingCode(null)
      setEditPriceInput('')
    }
  }

  const handleUpdateThursdayMeat = (meatName: string) => {
    setCurrentThursdayMeat(meatName)
    setMeatFeedback(true)
    setTimeout(() => setMeatFeedback(false), 3000)
  }

  const handleSaveStoreConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedConfigFeedback(true)
    setTimeout(() => setSavedConfigFeedback(false), 3000)
  }

  const categories = ['Todas', ...Array.from(new Set(INITIAL_PRODUCTS.map((p) => p.categoria)))]

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-900 pb-20">
      {/* Barra Superior do Administrador */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/30">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-900">BRASA CAIPIRA</span>
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                  Painel Admin
                </span>
              </div>
              <span className="text-[11px] text-stone-500">admin@brasacaipira.com.br</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-orange-500 hover:text-orange-600 transition"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Cardápio</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-5xl px-4 pt-5">
        {/* Abas de Navegação do Painel */}
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'produtos'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Produtos ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('grego')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'grego'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Carne da Quinta (Grego)</span>
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'categorias'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Categorias (17)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'config'
                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                : 'bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Loja & WhatsApp</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* ABA 1: PRODUTOS */}
        {/* ============================================================ */}
        {activeTab === 'produtos' && (
          <div className="mt-5 space-y-4">
            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar pelo código (ex: BC-001) ou nome..."
                  className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-xs text-stone-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <p className="text-xs text-stone-500">
              Mostrando <strong>{filtered.length}</strong> de {products.length} itens cadastrados da planilha original.
            </p>

            {/* Lista dos Produtos */}
            <div className="space-y-2.5">
              {filtered.map((p) => {
                const isOutOfStock = p.observacoes?.includes('ESGOTADO')
                return (
                  <div
                    key={p.codigo}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                          {p.codigo}
                        </span>
                        <h4 className="text-xs font-bold text-stone-900">{p.produto}</h4>
                        <span className="text-[10px] text-stone-400">({p.categoria})</span>
                      </div>

                      {p.ingredientes && (
                        <p className="mt-1 text-[11px] text-stone-500">
                          {p.ingredientes}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {p.dia_periodo && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                            <Calendar className="h-3 w-3 text-amber-600" />
                            {p.dia_periodo}
                          </span>
                        )}
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                          {p.unidade}
                        </span>
                        {isOutOfStock ? (
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            ● Esgotado hoje
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            ● Disponível
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preço e Ações do Item */}
                    <div className="flex items-center gap-2 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                      {editingCode === p.codigo ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editPriceInput}
                            onChange={(e) => setEditPriceInput(e.target.value)}
                            placeholder="Ex: 15.00"
                            className="w-20 rounded-lg border border-orange-500 px-2 py-1 text-xs text-stone-900 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePrice(p.codigo)}
                            className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                            title="Salvar"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCode(null)}
                            className="rounded-lg bg-stone-200 p-1.5 text-stone-700 hover:bg-stone-300"
                            title="Cancelar"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs font-bold text-stone-900 block">
                              {p.preco !== null ? formatCentsToBRL(p.preco * 100) : 'Sem preço'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingCode(p.codigo)
                                setEditPriceInput(p.preco !== null ? String(p.preco) : '')
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:underline"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar preço
                            </button>
                          </div>

                          <button
                            onClick={() => toggleAvailability(p.codigo)}
                            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                              isOutOfStock
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {isOutOfStock ? 'Reativar' : 'Pausar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: CHURRASCO GREGO — CARNE DA QUINTA-FEIRA */}
        {/* ============================================================ */}
        {activeTab === 'grego' && (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Carne da Semana — Churrasco Grego de Quinta-Feira
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Conforme a regra do Brasa Caipira, a carne de quinta-feira muda semanalmente. Alterne aqui sem precisar recriar os lanches.
                </p>
              </div>
            </div>

            {meatFeedback && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Carne da semana atualizada com sucesso! O cardápio refletirá esta opção.</span>
              </div>
            )}

            <div className="mt-6">
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Carne Ativa para a Próxima Quinta-Feira:
              </label>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs font-bold text-amber-900 flex items-center justify-between">
                <span>{currentThursdayMeat}</span>
                <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] text-amber-950 font-bold">
                  EM CARTAZ
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-stone-100 pt-5">
              <h4 className="text-xs font-bold text-stone-700 mb-3">
                Escolher dentre as Receitas Históricas Catalogadas:
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'Fraldinha Extra Grill com bacon Pamplona',
                  'Churrasco grego cupim com abacaxi ao mel (BC-070)',
                  'Churrasco grego suíno com bacon e pimentões (BC-069)',
                  'Churrasco grego suíno com paleta / copa-lombo (BC-072)',
                  'Churrasco grego bovino tradicional (BC-071)',
                ].map((meat) => (
                  <button
                    key={meat}
                    onClick={() => handleUpdateThursdayMeat(meat)}
                    className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${
                      currentThursdayMeat === meat
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-1 ring-orange-500'
                        : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    {meat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: CATEGORIAS */}
        {/* ============================================================ */}
        {activeTab === 'categorias' && (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-stone-500">
              17 categorias estruturadas no banco de dados com contagem de produtos associados.
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {categories.filter((c) => c !== 'Todas').map((cat, idx) => {
                const count = products.filter((p) => p.categoria === cat).length
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-stone-400 block">
                        CAT-{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-stone-900">{cat}</span>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                      {count} itens
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: CONFIGURAÇÕES DA LOJA & WHATSAPP */}
        {/* ============================================================ */}
        {activeTab === 'config' && (
          <form onSubmit={handleSaveStoreConfig} className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
              Informações Oficiais do Brasa Caipira
            </h3>

            {savedConfigFeedback && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                Configurações da loja salvas com sucesso!
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp Comercial Oficial (com DDD)
              </label>
              <input
                type="text"
                defaultValue="(19) 99810-7666"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-3 text-xs text-stone-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Endereço Físico
              </label>
              <input
                type="text"
                defaultValue="Rua dos Crisantemos, 350 — Jardim Nova Leme — Leme/SP"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-3 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ponto de Referência
              </label>
              <input
                type="text"
                defaultValue="Em frente ao Mercado do Angu"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-3 text-xs text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Aviso em Destaque no Topo do Cardápio
              </label>
              <input
                type="text"
                value={storeNotice}
                onChange={(e) => setStoreNotice(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 px-3 text-xs text-stone-900"
              />
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-4">
              <div>
                <span className="text-xs font-semibold text-stone-800 block">Status da Loja</span>
                <span className="text-[11px] text-stone-500">
                  {isStoreOpen ? 'Aberto para receber pedidos' : 'Loja fechada temporariamente'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsStoreOpen(!isStoreOpen)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isStoreOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-300 text-stone-700'
                }`}
              >
                {isStoreOpen ? 'ABERTO' : 'FECHADO'}
              </button>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-orange-600 py-3 text-xs font-semibold text-white shadow-md shadow-orange-600/20 hover:bg-orange-700 transition"
            >
              Salvar Alterações
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
