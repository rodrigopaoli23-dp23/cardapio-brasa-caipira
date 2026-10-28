'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Clock,
  MapPin,
  Search,
  Shield,
  Calendar,
  X,
  Plus,
  Minus,
  MessageCircle,
  Camera,
  Maximize2,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { formatCentsToBRL } from '@/lib/money'
import {
  CategoryRecord,
  ExtendedProduct,
  GreekBBQProgram,
  HeroBannerConfig,
  OrderItemSnapshot,
  StoreIdentityConfig,
  WeeklyScheduleConfig,
} from '@/types/phase3.types'
import {
  loadCatalogFromStorage,
  loadCategoriesFromStorage,
} from '@/lib/catalogManager'
import {
  DEFAULT_STORE_IDENTITY,
  DEFAULT_WEEKLY_SCHEDULE,
  evaluateStoreOpenStatus,
  loadGreekBBQPrograms,
  loadStoreIdentity,
  loadWeeklySchedule,
} from '@/lib/storeAndScheduleManager'
import {
  DEFAULT_HERO_BANNER,
  loadHeroBannerConfig,
} from '@/lib/bannerCarouselManager'
import {
  addItemToCart,
  canProductBePurchased,
  createCartItemSnapshot,
  loadCartFromStorage,
  saveCartToStorage,
  updateCartItemQuantity,
} from '@/lib/checkoutAndCart'
import HeroBannerCarousel from '@/components/HeroBannerCarousel'
import CartAndCheckoutDrawer from '@/components/CartAndCheckoutDrawer'
import {
  pullCloudToLocal,
  PHOTOS_STORAGE_KEY,
  CLOUD_DATA_EVENT,
} from '@/lib/cloudSync'

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
  const [products, setProducts] = useState<ExtendedProduct[]>(() => loadCatalogFromStorage())
  const [categoriesList, setCategoriesList] = useState<CategoryRecord[]>(() =>
    loadCategoriesFromStorage(loadCatalogFromStorage())
  )
  const [storeIdentity, setStoreIdentity] = useState<StoreIdentityConfig>(DEFAULT_STORE_IDENTITY)
  const [weeklySchedule, setWeeklySchedule] =
    useState<WeeklyScheduleConfig>(DEFAULT_WEEKLY_SCHEDULE)
  const [greekPrograms, setGreekPrograms] = useState<GreekBBQProgram[]>([])
  const [bannerConfig, setBannerConfig] = useState<HeroBannerConfig>(DEFAULT_HERO_BANNER)

  // Carrinho completo sincronizado (suportando variantes, adicionais e checkout estruturado)
  const [cartItems, setCartItems] = useState<OrderItemSnapshot[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [customizingProduct, setCustomizingProduct] = useState<ExtendedProduct | null>(null)

  const [productPhotos, setProductPhotos] = useState<
    Record<string, { url: string; isPrimary: boolean }[]>
  >({})
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState<{
    url: string
    title: string
    desc?: string | null
  } | null>(null)

  // Sincronizar catálogo, categorias, loja, agenda, carrossel e fotos em tempo real com a Nuvem
  useEffect(() => {
    const refreshMenuState = () => {
      const loadedProds = loadCatalogFromStorage()
      setProducts(loadedProds)
      setCategoriesList(loadCategoriesFromStorage(loadedProds))
      setStoreIdentity(loadStoreIdentity())
      setWeeklySchedule(loadWeeklySchedule())
      setGreekPrograms(loadGreekBBQPrograms())
      setBannerConfig(loadHeroBannerConfig())
      setCartItems(loadCartFromStorage())

      try {
        const storedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
        if (storedPhotos) {
          setProductPhotos(JSON.parse(storedPhotos))
        }
      } catch {
        // Fallback silencioso
      }
    }

    refreshMenuState()

    // Sincroniza dados oficiais da nuvem Supabase
    void pullCloudToLocal().then((changed) => {
      if (changed) {
        refreshMenuState()
      }
    })

    const handleCloudUpdate = () => {
      refreshMenuState()
    }

    window.addEventListener(CLOUD_DATA_EVENT, handleCloudUpdate)
    return () => {
      window.removeEventListener(CLOUD_DATA_EVENT, handleCloudUpdate)
    }
  }, [])

  const handleUpdateCart = (nextCart: OrderItemSnapshot[]) => {
    setCartItems(nextCart)
    saveCartToStorage(nextCart)
  }

  // Status de abertura da loja em tempo real (fuso America/Sao_Paulo + override manual temporário)
  const storeOpenStatus = useMemo(() => {
    return evaluateStoreOpenStatus(weeklySchedule)
  }, [weeklySchedule])

  // Categorias comerciais visíveis e ordenadas
  const categories = useMemo(() => {
    const commercialItems = products.filter(
      (p) => p.isCommercial && p.status !== 'archived' && p.status !== 'unp_draft'
    )
    const activeCatNamesFromProducts = new Set(commercialItems.map((p) => p.categoria))

    const orderedVisible = [...categoriesList]
      .filter((c) => c.visivel && !c.arquivada && activeCatNamesFromProducts.has(c.nome))
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => c.nome)

    // Garantir que nenhuma categoria comercial ativa fique de fora
    for (const catName of activeCatNamesFromProducts) {
      const record = categoriesList.find((c) => c.nome === catName)
      if (!record && !orderedVisible.includes(catName)) {
        orderedVisible.push(catName)
      }
    }

    return ['Todas', ...orderedVisible]
  }, [products, categoriesList])

  // Filtragem dinâmica de produtos comerciais publicados
  const filteredProducts = useMemo(() => {
    const hiddenCategories = new Set(
      categoriesList.filter((c) => !c.visivel || c.arquivada).map((c) => c.nome)
    )

    return products.filter((p) => {
      if (!p.isCommercial) return false
      if (p.status === 'archived' || p.status === 'unp_draft') return false
      if (hiddenCategories.has(p.categoria)) return false

      const matchesCategory =
        selectedCategory === 'Todas' || p.categoria === selectedCategory
      const matchesSearch =
        p.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ingredientes &&
          p.ingredientes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.descricao && p.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [products, categoriesList, selectedCategory, searchQuery])

  // Programações publicadas de Churrasco Grego (Quinta-feira, Sábado, etc. — exclui rascunhos como a Costela bovina)
  const publishedGreekPrograms = useMemo(() => {
    return greekPrograms.filter((g) => g.status === 'published')
  }, [greekPrograms])

  // Quantidade total de um código específico no carrinho
  const getProductQtyInCart = (code: string): number => {
    return cartItems
      .filter((item) => item.codigo === code)
      .reduce((acc, item) => acc + item.quantidade, 0)
  }

  // Adicionar ao carrinho (abre personalização se houver variantes/adicionais ou adiciona rápido)
  const handleAddProductClick = (product: ExtendedProduct) => {
    if (!canProductBePurchased(product)) return
    setCustomizingProduct(product)
  }

  const handleIncrementInCart = (product: ExtendedProduct) => {
    if (!canProductBePurchased(product)) return
    const existingItem = cartItems.find((item) => item.codigo === product.codigo)
    if (existingItem) {
      const updated = updateCartItemQuantity(
        cartItems,
        existingItem.id,
        existingItem.quantidade + 1
      )
      handleUpdateCart(updated)
    } else {
      const snapshot = createCartItemSnapshot({
        product,
        quantidade: 1,
      })
      if (snapshot) {
        handleUpdateCart(addItemToCart(cartItems, snapshot))
      }
    }
  }

  const handleDecrementInCart = (code: string) => {
    const matchingItems = cartItems.filter((item) => item.codigo === code)
    if (matchingItems.length === 0) return
    const lastItem = matchingItems[matchingItems.length - 1]
    const updated = updateCartItemQuantity(cartItems, lastItem.id, lastItem.quantidade - 1)
    handleUpdateCart(updated)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fdfbf7] pb-36 shadow-sm md:max-w-2xl">
      {/* Top Banner de Identidade Visual Inspirado no Folheto Oficial */}
      <div className="bg-[#991b1b] px-4 py-2 text-center text-xs font-extrabold text-amber-200 tracking-wide border-b border-amber-500/30">
        {storeIdentity.avisoTopo || '🔥 O VERDADEIRO SABOR DA BRASA QUE REÚNE A FAMÍLIA!'}
      </div>

      {/* Cabeçalho da Marca com Logotipo Oficial */}
      <header className="border-b border-stone-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logotipo Oficial Fornecido */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400 bg-black shadow-md shadow-amber-900/10">
              <Image
                src={storeIdentity.logoUrl || '/images/brand/logo-oficial.jpg'}
                alt="Logotipo Oficial Brasa Caipira"
                fill
                priority
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900 leading-none">
                {storeIdentity.nome || 'BRASA CAIPIRA'}
              </h1>
              <p className="mt-1 text-xs text-stone-600 font-medium">
                {storeIdentity.endereco}, {storeIdentity.numero} — {storeIdentity.bairro}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {storeOpenStatus.isOpen ? (
                  <span
                    title={storeOpenStatus.reason}
                    className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                  >
                    ● {storeOpenStatus.statusText || 'Cardápio Aberto'}
                  </span>
                ) : (
                  <span
                    title={storeOpenStatus.reason}
                    className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-inset ring-amber-600/20"
                  >
                    ● {storeOpenStatus.statusText}
                  </span>
                )}
                <span className="text-[11px] text-stone-400">•</span>
                <span className="text-[11px] font-semibold text-orange-700">
                  {storeIdentity.cidadeEstado || 'Leme / SP'}
                </span>
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

        {/* Informações Oficiais de Atendimento e Rota Google Maps */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-700">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/60">
            <Clock className="h-4 w-4 shrink-0 text-amber-700" />
            <div className="leading-tight">
              <span className="font-bold block text-stone-900">Horários</span>
              <span className="text-[11px] text-stone-600">
                Qua a Sáb 18h–23h
                <br />
                Dom 10h–14h
              </span>
            </div>
          </div>
          <a
            href={
              storeIdentity.googleMapsUrl ||
              'https://www.google.com/maps/dir/?api=1&destination=Rua+dos+Crisantemos,+350,+Jardim+Nova+Leme,+Leme+-+SP'
            }
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir rota no Google Maps"
            className="flex items-center justify-between gap-1.5 rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/60 hover:border-amber-400 hover:bg-amber-100/50 transition"
          >
            <div className="flex items-center gap-2 leading-tight">
              <MapPin className="h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <span className="font-bold block text-stone-900">Localização</span>
                <span className="text-[11px] text-stone-600">
                  {storeIdentity.pontoReferencia || 'Em frente ao Mercado do Angu'}
                </span>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          </a>
        </div>

        {/* Links Oficiais em Evidência (WhatsApp & Instagram) */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs">
          <a
            href={`https://wa.me/${storeIdentity.telefoneWhatsapp || '5519998107666'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 px-3 font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>{storeIdentity.telefoneExibicao || '(19) 99810-7666'}</span>
          </a>

          <a
            href={storeIdentity.instagramUrl || 'https://instagram.com/brasa.caipira'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2 px-3 font-bold text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
          >
            <InstagramIcon className="h-4 w-4 text-rose-600" />
            <span>{storeIdentity.instagramHandle || '@brasa.caipira'}</span>
          </a>
        </div>

        {/* Barra de Busca Dinâmica */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar espetinho, churrasco grego, lanche, porção, massa..."
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

      {/* BANNER DE NOVIDADES & CARROSSEL DE 3 SLIDES (Preservando 100% do visual aprovado) */}
      <HeroBannerCarousel
        config={bannerConfig}
        onZoomPhoto={setSelectedPhotoZoom}
        onSelectCategory={(cat) => {
          if (categories.includes(cat)) {
            setSelectedCategory(cat)
          }
        }}
      />

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

      {/* Destaque de Programação do Churrasco Grego quando aplicável */}
      {selectedCategory.toLowerCase().includes('grego') && publishedGreekPrograms.length > 0 && (
        <section className="px-4 pt-3">
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Programação Oficial do Churrasco Grego</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {publishedGreekPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#c21e1e]">{prog.diaSemana}</span>
                    <span className="text-[10px] font-semibold text-stone-500">{prog.horario}</span>
                  </div>
                  <p className="font-bold text-stone-900 mt-0.5">{prog.carnePrincipal}</p>
                  <p className="text-[11px] text-stone-600 mt-0.5">{prog.descricaoReceita}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Listagem de Produtos com Área Proporcional de Foto */}
      <section className="px-4 py-4 space-y-3.5">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1 font-medium">
          <span>{filteredProducts.length} itens comerciais encontrados</span>
          {selectedCategory !== 'Todas' && (
            <span className="font-bold text-[#c21e1e]">{selectedCategory}</span>
          )}
        </div>

        {filteredProducts.map((p) => {
          const qtyInCart = getProductQtyInCart(p.codigo)
          const photos = productPhotos[p.codigo] || []
          const primaryPhoto = photos.find((x) => x.isPrimary) || photos[0]
          const isPurchasable = canProductBePurchased(p)
          const isOutOfStock = p.observacoes?.includes('ESGOTADO') || p.status === 'paused'

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
                    <img
                      src={primaryPhoto.url}
                      alt={p.produto}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
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
                    {p.preco !== null && p.preco > 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-extrabold text-stone-900">
                          {formatCentsToBRL(Math.round(p.preco * 100))}
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-800 border border-orange-200">
                        Preço a cadastrar pelo admin
                      </span>
                    )}
                  </div>

                  {isOutOfStock ? (
                    <span className="inline-flex items-center rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 border border-rose-200 cursor-not-allowed">
                      Esgotado hoje
                    </span>
                  ) : !isPurchasable ? (
                    <span className="inline-flex items-center rounded-xl bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-400 border border-stone-200 cursor-not-allowed">
                      Sob consulta
                    </span>
                  ) : qtyInCart > 0 ? (
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-300 px-2 py-1">
                      <button
                        onClick={() => handleDecrementInCart(p.codigo)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-orange-700 shadow-xs hover:bg-orange-100 transition"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-extrabold text-orange-950 px-1">
                        {qtyInCart}
                      </span>
                      <button
                        onClick={() => handleIncrementInCart(p)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#c21e1e] text-white shadow-xs hover:bg-red-700 transition"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddProductClick(p)}
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
            <div className="relative h-72 w-full overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
              <img
                src={selectedPhotoZoom.url}
                alt={selectedPhotoZoom.title}
                className="max-h-full max-w-full object-contain"
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

      {/* Rodapé Informativo Institucional do Brasa Caipira (Sincronizado com Fonte Única da Verdade) */}
      <footer className="mt-8 border-t border-stone-200 bg-white px-5 py-6 text-center text-xs text-stone-600">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300 bg-black p-1 shadow-xs">
          <Image
            src={storeIdentity.logoUrl || '/images/brand/logo-oficial.jpg'}
            alt={storeIdentity.nome || 'Brasa Caipira'}
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <p className="mt-3 font-bold text-stone-900">
          {storeIdentity.nome || 'BRASA CAIPIRA'}
        </p>
        <p className="text-[11px] text-stone-500 mt-0.5">
          {storeIdentity.slogan || 'O verdadeiro sabor da brasa que reúne a família!'}
        </p>
        <p className="mt-2 text-[11px] text-stone-500">
          {storeIdentity.endereco}, {storeIdentity.numero} — {storeIdentity.bairro} —{' '}
          {storeIdentity.cidadeEstado} ({storeIdentity.pontoReferencia})
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
          <a
            href={`https://wa.me/${storeIdentity.telefoneWhatsapp || '5519998107666'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline flex items-center gap-1"
          >
            <MessageCircle className="h-3.5 w-3.5" />{' '}
            {storeIdentity.telefoneExibicao || '(19) 99810-7666'}
          </a>
          <a
            href={storeIdentity.instagramUrl || 'https://instagram.com/brasa.caipira'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-700 hover:underline flex items-center gap-1"
          >
            <InstagramIcon className="h-3.5 w-3.5" />{' '}
            {storeIdentity.instagramHandle || '@brasa.caipira'}
          </a>
          <a
            href={
              storeIdentity.googleMapsUrl ||
              'https://www.google.com/maps/dir/?api=1&destination=Rua+dos+Crisantemos,+350,+Jardim+Nova+Leme,+Leme+-+SP'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-800 hover:underline flex items-center gap-1"
          >
            <MapPin className="h-3.5 w-3.5" /> Como Chegar (Maps)
          </a>
        </div>
      </footer>

      {/* Carrinho Flutuante, Personalização de Adicionais/Variantes e Gaveta de Checkout */}
      <CartAndCheckoutDrawer
        cart={cartItems}
        onUpdateCart={handleUpdateCart}
        catalog={products}
        storeConfig={storeIdentity}
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        customizingProduct={customizingProduct}
        onCloseCustomize={() => setCustomizingProduct(null)}
        showFloatingBar={true}
      />
    </main>
  )
}
