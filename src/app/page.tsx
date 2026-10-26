'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame,
  Clock,
  MapPin,
  Search,
  ShoppingCart,
  Shield,
  Calendar,
  X,
  Plus,
  Minus,
  MessageCircle,
  Camera,
  Maximize2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { INITIAL_PRODUCTS, InitialProduct } from '@/data/initialCatalog'
import { formatCentsToBRL } from '@/lib/money'

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [productPhotos, setProductPhotos] = useState<Record<string, { url: string; isPrimary: boolean }[]>>({})
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<{
    url: string
    title: string
    desc?: string | null
  } | null>(null)

  // Carregar fotos persistidas do armazenamento local (sincronizado com o painel admin)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('brasa_caipira_product_photos_v1')
      if (stored) {
        setProductPhotos(JSON.parse(stored))
      }
    } catch {
      // Falha silenciosa em ambientes sem localStorage
    }
  }, [])

  // Categorias comerciais
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

  // Gestão do carrinho
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

  const cartItemsList = useMemo(() => {
    return Object.entries(cart).map(([code, qty]) => {
      const prod = INITIAL_PRODUCTS.find((p) => p.codigo === code)!
      return { prod, qty }
    })
  }, [cart])

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fdfbf7] pb-36 shadow-sm md:max-w-2xl">
      {/* Top Banner de Identidade Visual Inspirado no Folheto Oficial */}
      <div className="bg-[#991b1b] px-4 py-2 text-center text-xs font-extrabold text-amber-200 tracking-wide border-b border-amber-500/30">
        🔥 O VERDADEIRO SABOR DA BRASA QUE REÚNE A FAMÍLIA!
      </div>

      {/* Cabeçalho da Marca com Logotipo Oficial */}
      <header className="border-b border-stone-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logotipo Oficial Fornecido */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400 bg-black shadow-md shadow-amber-900/10">
              <Image
                src="/images/brand/logo-oficial.jpg"
                alt="Logotipo Oficial Brasa Caipira"
                fill
                priority
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900 leading-none">
                BRASA CAIPIRA
              </h1>
              <p className="mt-1 text-xs text-stone-600 font-medium">
                Rua dos Crisântemos, 350 — Jd. Nova Leme
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                  ● Cardápio Aberto
                </span>
                <span className="text-[11px] text-stone-400">•</span>
                <span className="text-[11px] font-semibold text-orange-700">Leme / SP</span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 hover:border-orange-500 hover:text-orange-700 hover:bg-orange-50/50 transition shadow-xs"
          >
            <Shield className="h-3.5 w-3.5 text-orange-600" />
            <span>Admin</span>
          </Link>
        </div>

        {/* Informações Oficiais de Atendimento */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-700">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/60">
            <Clock className="h-4 w-4 shrink-0 text-amber-700" />
            <div className="leading-tight">
              <span className="font-bold block text-stone-900">Horários</span>
              <span className="text-[11px] text-stone-600">Qua a Sáb 18h–23h<br />Dom 10h–14h</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/60">
            <MapPin className="h-4 w-4 shrink-0 text-amber-700" />
            <div className="leading-tight">
              <span className="font-bold block text-stone-900">Localização</span>
              <span className="text-[11px] text-stone-600">Em frente ao Mercado do Angu</span>
            </div>
          </div>
        </div>

        {/* Links Oficiais em Evidência (WhatsApp & Instagram) */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs">
          <a
            href="https://wa.me/5519998107666"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 px-3 font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>(19) 99810-7666</span>
          </a>

          <a
            href="https://instagram.com/brasa.caipira"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2 px-3 font-bold text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
          >
            <InstagramIcon className="h-4 w-4 text-rose-600" />
            <span>@brasa.caipira</span>
          </a>
        </div>

        {/* Barra de Busca Dinâmica */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar espetinho, churrasco grego, lanche, massa..."
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

      {/* BANNER DE NOVIDADES & DESTAQUES DA CASA COM ARTE OFICIAL FORNECIDA */}
      <section className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-[#991b1b] via-[#b91c1c] to-[#7f1d1d] text-white shadow-md">
          {/* Imagem Oficial dos Espetinhos Brasa Caipira */}
          <div
            onClick={() =>
              setSelectedPhotoZoom({
                url: '/images/brand/banner-espetinhos.png',
                title: 'A Brasa Tem Escolha — Espetinhos Brasa Caipira',
                desc: 'Carne bovina, frango grelhado, queijo coalho e medalhão com farofa e molhos especiais!',
              })
            }
            className="relative h-52 sm:h-64 w-full cursor-pointer group bg-black/30"
          >
            <Image
              src="/images/brand/banner-espetinhos.png"
              alt="A Brasa Tem Escolha — Espetinhos Brasa Caipira"
              fill
              priority
              className="object-cover group-hover:scale-102 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-stone-950">
                    Foto & Cartaz Oficial
                  </span>
                  <h2 className="mt-1 text-sm sm:text-base font-black text-white drop-shadow-md">
                    A BRASA TEM ESCOLHA!
                  </h2>
                </div>
                <span className="bg-black/60 text-white rounded-full p-2 group-hover:scale-110 transition shadow-sm">
                  <Maximize2 className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Destaques da Semana no Brasa Caipira</span>
            </div>

            <p className="mt-1 text-xs text-amber-100/90 leading-snug">
              Espetos tradicionais assados na brasa, acompanhados de farofa artesanal caipira e molhos especiais da casa. Faça seu pedido direto no balcão ou via WhatsApp!
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-black/30 p-2 border border-white/10">
                <span className="font-bold text-amber-300 block">Massas Frescas</span>
                <span className="text-[10px] text-stone-200">Talharim à bolonhesa no pote</span>
              </div>
              <div className="rounded-xl bg-black/30 p-2 border border-white/10">
                <span className="font-bold text-amber-300 block">Churrasco Grego</span>
                <span className="text-[10px] text-stone-200">Às quintas: fraldinha ou lombo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navegação por Categorias com Rolagem Suave */}
      <nav className="sticky top-0 z-20 border-b border-stone-200 bg-[#fdfbf7]/95 px-4 py-3 backdrop-blur-md mt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedCategory === cat
                  ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/30'
                  : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* Listagem de Produtos com Área Proporcional de Foto */}
      <section className="px-4 py-4 space-y-3.5">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1 font-medium">
          <span>{filteredProducts.length} itens comerciais encontrados</span>
          {selectedCategory !== 'Todas' && (
            <span className="font-bold text-[#c21e1e]">{selectedCategory}</span>
          )}
        </div>

        {filteredProducts.map((p) => {
          const qtyInCart = cart[p.codigo] || 0
          const photos = productPhotos[p.codigo] || []
          const primaryPhoto = photos.find((x) => x.isPrimary) || photos[0]

          return (
            <article
              key={p.codigo}
              className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs transition hover:border-amber-300 flex flex-col sm:flex-row gap-3.5"
            >
              {/* Espaço Padronizado da Foto / Imagem Real ou Placeholder Oficial */}
              <div
                onClick={() => {
                  if (primaryPhoto) {
                    setSelectedPhotoZoom({
                      url: primaryPhoto.url,
                      title: p.produto,
                      desc: p.descricao,
                    })
                  }
                }}
                className={`relative h-44 sm:h-32 sm:w-32 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center ${
                  primaryPhoto ? 'cursor-pointer group' : ''
                }`}
              >
                {primaryPhoto ? (
                  <>
                    <Image
                      src={primaryPhoto.url}
                      alt={p.produto}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-1.5 transition">
                        <Maximize2 className="h-4 w-4" />
                      </span>
                    </div>
                  </>
                ) : (
                  /* Placeholder Oficial Padronizado "Foto em Breve" sem imagens falsas de concorrentes */
                  <div className="flex flex-col items-center justify-center p-3 text-center w-full h-full bg-gradient-to-br from-amber-50/90 via-stone-50 to-orange-50/60">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 mb-1 border border-amber-200">
                      <Camera className="h-4 w-4 text-amber-700" />
                    </div>
                    <span className="text-[11px] font-extrabold text-stone-800 tracking-tight">
                      BRASA CAIPIRA
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 mt-0.5">
                      Foto oficial em breve
                    </span>
                  </div>
                )}
              </div>

              {/* Informações Comerciais do Produto */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                      {p.codigo}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 leading-snug">
                      {p.produto}
                    </h3>
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
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {p.dia_periodo && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                        <Calendar className="h-3 w-3 text-amber-700" />
                        {p.dia_periodo}
                      </span>
                    )}
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                      {p.unidade}
                    </span>
                  </div>
                </div>

                {/* Preço e Botão de Adição */}
                <div className="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-2.5">
                  <div>
                    {p.preco !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-extrabold text-stone-900">
                          {formatCentsToBRL(p.preco * 100)}
                        </span>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          (histórico)
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-800 border border-orange-200">
                        Preço a cadastrar pelo admin
                      </span>
                    )}
                  </div>

                  {qtyInCart > 0 ? (
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-300 px-2 py-1">
                      <button
                        onClick={() => removeFromCart(p.codigo)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-orange-700 shadow-xs hover:bg-orange-100 transition"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-extrabold text-orange-950 px-1">
                        {qtyInCart}
                      </span>
                      <button
                        onClick={() => addToCart(p.codigo)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#c21e1e] text-white shadow-xs hover:bg-red-700 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p.codigo)}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#c21e1e] transition active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {/* Modal de Zoom de Fotos (Lightbox) */}
      {selectedPhotoZoom && (
        <div
          onClick={() => setSelectedPhotoZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-2xl bg-white p-4 shadow-2xl"
          >
            <button
              onClick={() => setSelectedPhotoZoom(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900/60 text-white hover:bg-stone-900"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative h-72 w-full overflow-hidden rounded-xl bg-stone-100">
              <Image
                src={selectedPhotoZoom.url}
                alt={selectedPhotoZoom.title}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-sm text-stone-900">
                {selectedPhotoZoom.title}
              </h3>
              {selectedPhotoZoom.desc && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedPhotoZoom.desc}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Informativo Institucional do Brasa Caipira */}
      <footer className="mt-8 border-t border-stone-200 bg-white px-5 py-6 text-center text-xs text-stone-600">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300 bg-black p-1 shadow-xs">
          <Image
            src="/images/brand/logo-oficial.jpg"
            alt="Brasa Caipira"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <p className="mt-3 font-bold text-stone-900">BRASA CAIPIRA</p>
        <p className="text-[11px] text-stone-500 mt-0.5">O verdadeiro sabor da brasa que reúne a família!</p>
        <p className="mt-2 text-[11px] text-stone-500">
          Rua dos Crisântemos, 350 — Jd. Nova Leme — Leme/SP (Em frente ao Mercado do Angu)
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold">
          <a
            href="https://wa.me/5519998107666"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline flex items-center gap-1"
          >
            <MessageCircle className="h-3.5 w-3.5" /> (19) 99810-7666
          </a>
          <a
            href="https://instagram.com/brasa.caipira"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-700 hover:underline flex items-center gap-1"
          >
            <InstagramIcon className="h-3.5 w-3.5" /> @brasa.caipira
          </a>
        </div>
      </footer>

      {/* Botão Flutuante do Carrinho */}
      {totalCartItems > 0 && (
        <aside className="fixed bottom-4 left-0 right-0 z-30 mx-auto max-w-md px-4 md:max-w-2xl">
          <div className="flex items-center justify-between rounded-2xl bg-stone-950 px-5 py-3.5 text-white shadow-xl shadow-stone-950/30 border border-stone-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-amber-400" />
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c21e1e] text-[10px] font-bold text-white">
                  {totalCartItems}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-bold block">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95"
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
