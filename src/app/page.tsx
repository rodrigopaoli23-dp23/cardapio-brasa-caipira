'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Flame,
  Clock,
  MapPin,
  Phone,
  Search,
  ShoppingCart,
  Shield,
  Tag,
  Info,
  Calendar,
  X,
  Plus,
  Minus,
  MessageCircle,
} from 'lucide-react'
import { INITIAL_PRODUCTS, InitialProduct } from '@/data/initialCatalog'
import { formatCentsToBRL } from '@/lib/money'

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)

  // Extrair categorias comerciais únicas
  const categories = useMemo(() => {
    const commercialItems = INITIAL_PRODUCTS.filter((p) => p.isCommercial)
    const cats = Array.from(new Set(commercialItems.map((p) => p.categoria)))
    return ['Todas', ...cats]
  }, [])

  // Filtragem dinâmica de produtos
  const filteredProducts = useMemo(() => {
    return INITIAL_PRODUCTS.filter((p) => {
      if (!p.isCommercial) return false
      const matchesCategory =
        selectedCategory === 'Todas' || p.categoria === selectedCategory
      const matchesSearch =
        p.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ingredientes &&
          p.ingredientes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.descricao && p.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  // Gestão simples do carrinho
  const addToCart = (code: string) => {
    setCart((prev) => ({ ...prev, [code]: (prev[code] || 0) + 1 }))
  }

  const removeFromCart = (code: string) => {
    setCart((prev) => {
      const next = { ...prev }
      if (next[code] > 1) {
        next[code] -= 1
      } else {
        delete next[code]
      }
      return next
    })
  }

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0)

  // Itens selecionados no carrinho
  const cartItemsList = useMemo(() => {
    return Object.entries(cart).map(([code, qty]) => {
      const prod = INITIAL_PRODUCTS.find((p) => p.codigo === code)!
      return { prod, qty }
    })
  }, [cart])

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fdfbf7] pb-32 shadow-sm md:max-w-2xl">
      {/* Top Banner Informativo */}
      <div className="bg-amber-950 px-4 py-2 text-center text-[11px] font-medium text-amber-200">
        🔥 O verdadeiro sabor da brasa — Leme/SP
      </div>

      {/* Cabeçalho da Marca */}
      <header className="border-b border-stone-200 bg-white px-5 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20">
              <Flame className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                BRASA CAIPIRA
              </h1>
              <p className="text-xs text-stone-500">
                Rua dos Crisântemos, 350 — Jd. Nova Leme
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  ● Aberto para Pedidos
                </span>
                <span className="text-[11px] text-stone-400">|</span>
                <span className="text-[11px] text-stone-500">Leme / SP</span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/login"
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:border-orange-500 hover:text-orange-600 transition"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </Link>
        </div>

        {/* Informações Rápidas de Horário e Localização */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-600">
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <Clock className="h-4 w-4 shrink-0 text-orange-600" />
            <div className="leading-tight">
              <span className="font-semibold block text-stone-800">Horários</span>
              <span className="text-[11px] text-stone-500">Qua a Sáb 18h–23h<br />Dom 10h–14h</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <MapPin className="h-4 w-4 shrink-0 text-orange-600" />
            <div className="leading-tight">
              <span className="font-semibold block text-stone-800">Endereço</span>
              <span className="text-[11px] text-stone-500">Em frente ao Mercado do Angu</span>
            </div>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar espetinho, grego, lanche, bebida..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-2.5 pl-10 pr-4 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Barra de Categorias com Rolagem Horizontal Suave */}
      <nav className="sticky top-0 z-20 border-b border-stone-200 bg-[#fdfbf7]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/30'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-orange-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* Catálogo de Produtos */}
      <section className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>{filteredProducts.length} itens encontrados</span>
          {selectedCategory !== 'Todas' && (
            <span className="font-medium text-orange-600">{selectedCategory}</span>
          )}
        </div>

        {filteredProducts.map((p) => {
          const qtyInCart = cart[p.codigo] || 0
          return (
            <article
              key={p.codigo}
              className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-orange-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-600">
                      {p.codigo}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">{p.produto}</h3>
                  </div>

                  {p.descricao && (
                    <p className="mt-1 text-xs text-stone-600 leading-snug">
                      {p.descricao}
                    </p>
                  )}

                  {p.ingredientes && (
                    <p className="mt-1 text-[11px] text-stone-500 italic">
                      Ingredientes: {p.ingredientes}
                    </p>
                  )}

                  {/* Badges de Dias e Unidade */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {p.dia_periodo && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                        <Calendar className="h-3 w-3 text-amber-600" />
                        {p.dia_periodo}
                      </span>
                    )}
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                      Unidade: {p.unidade}
                    </span>
                  </div>

                  {/* Preço e Botão de Adição */}
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {p.preco !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-stone-900">
                            {formatCentsToBRL(p.preco * 100)}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            (histórico)
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 border border-orange-200/60">
                          Preço a definir no painel
                        </span>
                      )}
                    </div>

                    {qtyInCart > 0 ? (
                      <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-2 py-1">
                        <button
                          onClick={() => removeFromCart(p.codigo)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm hover:bg-orange-100 transition"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-orange-950 px-1">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => addToCart(p.codigo)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm hover:bg-orange-700 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p.codigo)}
                        className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 transition active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {/* Botão Flutuante do Carrinho */}
      {totalCartItems > 0 && (
        <aside className="fixed bottom-4 left-0 right-0 z-30 mx-auto max-w-md px-4 md:max-w-2xl">
          <div className="flex items-center justify-between rounded-2xl bg-stone-950 px-5 py-3.5 text-white shadow-xl shadow-stone-950/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-orange-400" />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                  {totalCartItems}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-semibold block">
                  {totalCartItems} {totalCartItems === 1 ? 'item' : 'itens'} no pedido
                </span>
                <span className="text-[11px] text-stone-400">
                  Pronto para enviar ao WhatsApp
                </span>
              </div>
            </div>

            <a
              href={`https://wa.me/5519998107666?text=${encodeURIComponent(
                `Olá! Gostaria de fazer um pedido no Brasa Caipira:\n` +
                  cartItemsList
                    .map((item) => `• ${item.qty}x ${item.prod.produto}`)
                    .join('\n')
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Enviar WhatsApp</span>
            </a>
          </div>
        </aside>
      )}
    </main>
  )
}
