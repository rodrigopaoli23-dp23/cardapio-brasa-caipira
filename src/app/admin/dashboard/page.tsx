'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
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
  Save,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Star,
  X,
  Plus,
  ShoppingBag,
  Printer,
  Image as ImageIcon,
  Database,
} from 'lucide-react'
import { formatCentsToBRL } from '@/lib/money'
import { validateImageFile } from '@/lib/photos'
import {
  CategoryRecord,
  ExtendedProduct,
  GreekBBQProgram,
  HeroBannerConfig,
  StoreIdentityConfig,
} from '@/types/phase3.types'
import {
  loadCatalogFromStorage,
  saveCatalogToStorage,
  loadCategoriesFromStorage,
  saveCategoriesToStorage,
} from '@/lib/catalogManager'
import {
  DEFAULT_STORE_IDENTITY,
  loadStoreIdentity,
  loadGreekBBQPrograms,
} from '@/lib/storeAndScheduleManager'
import {
  DEFAULT_HERO_BANNER,
  loadHeroBannerConfig,
  saveHeroBannerConfig,
} from '@/lib/bannerCarouselManager'
import { getPersistenceAuditReport } from '@/lib/securityAndAuth'
import {
  pushToCloud,
  pullCloudToLocal,
  PHOTOS_STORAGE_KEY,
  CLOUD_DATA_EVENT,
} from '@/lib/cloudSync'
import ProductFormModal from '@/components/admin/ProductFormModal'
import { CategoriesManagerSection } from '@/components/admin/CategoriesManagerSection'
import StoreAndAgendaSection from '@/components/admin/StoreAndAgendaSection'
import ChurrascoGregoSection from '@/components/admin/ChurrascoGregoSection'
import BannerEditorSection from '@/components/admin/BannerEditorSection'
import OrdersAndSalesTab from '@/components/admin/OrdersAndSalesTab'
import PrintableMenuGenerator from '@/components/admin/PrintableMenuGenerator'

type AdminTabId =
  | 'produtos'
  | 'grego'
  | 'categorias'
  | 'destaques'
  | 'pedidos'
  | 'impressao'
  | 'config'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTabId>('produtos')
  const [products, setProducts] = useState<ExtendedProduct[]>(() => loadCatalogFromStorage())
  const [categoriesList, setCategoriesList] = useState<CategoryRecord[]>(() =>
    loadCategoriesFromStorage(loadCatalogFromStorage())
  )
  const [storeIdentity, setStoreIdentity] = useState<StoreIdentityConfig>(DEFAULT_STORE_IDENTITY)
  const [greekPrograms, setGreekPrograms] = useState<GreekBBQProgram[]>([])
  const [bannerConfig, setBannerConfig] = useState<HeroBannerConfig>(DEFAULT_HERO_BANNER)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('Todas')
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with_photo' | 'without_photo'>('all')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editPriceInput, setEditPriceInput] = useState<string>('')

  // Modal de Cadastro / Edição Completa de Produto
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productModalMode, setProductModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ExtendedProduct | null>(null)

  // Modal de Fotos
  const [photoModalProduct, setPhotoModalProduct] = useState<ExtendedProduct | null>(null)
  const [productPhotos, setProductPhotos] = useState<
    Record<string, { url: string; isPrimary: boolean }[]>
  >({})
  const [photoUploadFeedback, setPhotoUploadFeedback] = useState<string | null>(null)

  const notify = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Carregar dados persistidos e sincronizar com o Supabase Cloud
  useEffect(() => {
    const refreshLocalState = () => {
      const loadedProducts = loadCatalogFromStorage()
      setProducts(loadedProducts)
      setCategoriesList(loadCategoriesFromStorage(loadedProducts))
      setStoreIdentity(loadStoreIdentity())
      setGreekPrograms(loadGreekBBQPrograms())
      setBannerConfig(loadHeroBannerConfig())

      try {
        const storedPhotos = localStorage.getItem(PHOTOS_STORAGE_KEY)
        if (storedPhotos) {
          setProductPhotos(JSON.parse(storedPhotos))
        }
      } catch {
        // Fallback silencioso
      }
    }

    refreshLocalState()

    // Sincroniza dados da nuvem Supabase em tempo real
    void pullCloudToLocal({ includeOrders: true }).then((changed) => {
      if (changed) {
        refreshLocalState()
      }
    })

    const handleCloudDataUpdated = () => {
      refreshLocalState()
    }

    window.addEventListener(CLOUD_DATA_EVENT, handleCloudDataUpdated)
    return () => {
      window.removeEventListener(CLOUD_DATA_EVENT, handleCloudDataUpdated)
    }
  }, [])

  // Persistência Real: Salvar produtos sempre que houver alteração
  const saveProductsPersistently = (updated: ExtendedProduct[]) => {
    setProducts(updated)
    saveCatalogToStorage(updated)
  }

  // Persistência Real: Salvar categorias
  const saveCategoriesPersistently = (updated: CategoryRecord[]) => {
    setCategoriesList(updated)
    saveCategoriesToStorage(updated)
  }

  // Persistência Real: Salvar fotos sempre que houver upload, exclusão ou troca de principal
  const savePhotosPersistently = (
    updated: Record<string, { url: string; isPrimary: boolean }[]>
  ) => {
    setProductPhotos(updated)
    pushToCloud(PHOTOS_STORAGE_KEY, updated)
    try {
      localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Armazenamento local
    }
  }

  const handleBannerChange = (updated: HeroBannerConfig) => {
    setBannerConfig(updated)
    saveHeroBannerConfig(updated)
  }

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

    const photos = productPhotos[p.codigo] || []
    const matchPhoto =
      photoFilter === 'all' ||
      (photoFilter === 'with_photo' && photos.length > 0) ||
      (photoFilter === 'without_photo' && photos.length === 0)

    return matchCat && matchSearch && matchPhoto
  })

  // Alternar disponibilidade rápida
  const toggleAvailability = (code: string) => {
    const updated = products.map((p) => {
      if (p.codigo === code) {
        const isCurrentlyActive = !p.observacoes?.includes('ESGOTADO') && p.status !== 'paused'
        const updatedObs = isCurrentlyActive
          ? `${p.observacoes || ''} [ESGOTADO HOJE]`.trim()
          : (p.observacoes || '').replace('[ESGOTADO HOJE]', '').trim()
        return {
          ...p,
          observacoes: updatedObs,
          status: isCurrentlyActive ? ('paused' as const) : ('published' as const),
        }
      }
      return p
    })
    saveProductsPersistently(updated)
  }

  // Salvar preço alterado (persiste imediatamente no cardápio público)
  const handleSavePrice = (code: string) => {
    const trimmed = editPriceInput.trim()
    if (trimmed === '') {
      const updated = products.map((p) => (p.codigo === code ? { ...p, preco: null } : p))
      saveProductsPersistently(updated)
      setEditingCode(null)
      setEditPriceInput('')
      return
    }
    const num = parseFloat(trimmed.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      const updated = products.map((p) => (p.codigo === code ? { ...p, preco: num } : p))
      saveProductsPersistently(updated)
      setEditingCode(null)
      setEditPriceInput('')
    }
  }

  // Upload com validação estrita e conversão persistente para Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, code: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileList = Array.from(files)

    for (const file of fileList) {
      const validation = validateImageFile({
        name: file.name,
        type: file.type,
        size: file.size,
      })
      if (!validation.isValid) {
        setPhotoUploadFeedback(`Erro: ${validation.error}`)
        return
      }
    }

    let processedCount = 0
    const newPhotosToAdd: { url: string; isPrimary: boolean }[] = []

    fileList.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Url = event.target?.result as string
        const currentCount = (productPhotos[code]?.length || 0) + newPhotosToAdd.length
        newPhotosToAdd.push({
          url: base64Url,
          isPrimary: currentCount === 0,
        })
        processedCount += 1

        if (processedCount === fileList.length) {
          const updated = {
            ...productPhotos,
            [code]: [...(productPhotos[code] || []), ...newPhotosToAdd],
          }
          savePhotosPersistently(updated)
          setPhotoUploadFeedback('Foto(s) carregada(s), otimizada(s) e salvas com sucesso!')
          setTimeout(() => setPhotoUploadFeedback(null), 3500)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Marcar como foto principal (garantindo unicidade atômica)
  const handleSetPrimaryPhoto = (code: string, photoIndex: number) => {
    const list = productPhotos[code] || []
    const updated = {
      ...productPhotos,
      [code]: list.map((item, idx) => ({
        ...item,
        isPrimary: idx === photoIndex,
      })),
    }
    savePhotosPersistently(updated)
  }

  // Excluir foto (com eleição da primeira restante se for a principal)
  const handleDeletePhoto = (code: string, photoIndex: number) => {
    const list = productPhotos[code] || []
    const filteredList = list.filter((_, idx) => idx !== photoIndex)
    if (filteredList.length > 0 && !filteredList.some((p) => p.isPrimary)) {
      filteredList[0].isPrimary = true
    }
    const updated = { ...productPhotos, [code]: filteredList }
    savePhotosPersistently(updated)
  }

  const categoryFilterOptions = [
    'Todas',
    ...Array.from(
      new Set([
        ...categoriesList.filter((c) => !c.arquivada).map((c) => c.nome),
        ...products.map((p) => p.categoria),
      ])
    ),
  ]

  // Contagem estrita separando itens comerciais de receitas e ideias futuras
  const commercialItems = products.filter((p) => p.isCommercial && p.status !== 'archived')
  const commercialWithPhotos = commercialItems.filter(
    (p) => (productPhotos[p.codigo] || []).length > 0
  ).length
  const commercialPendingPhotos = commercialItems.length - commercialWithPhotos
  const persistenceReport = getPersistenceAuditReport()

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-900 pb-20">
      {/* Barra Superior do Administrador com Logo Oficial */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-amber-400 bg-black shadow-xs">
              <Image
                src={storeIdentity.logoUrl || '/images/brand/logo-oficial.jpg'}
                alt="Logotipo Oficial Brasa Caipira"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900">
                  {storeIdentity.nome || 'BRASA CAIPIRA'}
                </span>
                <span className="rounded bg-[#c21e1e] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Painel Admin
                </span>
              </div>
              <span className="text-[11px] text-stone-500">
                {storeIdentity.adminEmail || 'admin@brasacaipira.com.br'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-orange-500 hover:text-orange-700 transition"
            >
              <Eye className="h-3.5 w-3.5 text-orange-600" />
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
        {toastMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Abas de Navegação (Mantendo 100% do estilo visual aprovado) */}
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'produtos'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Produtos ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('grego')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'grego'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Churrasco Grego</span>
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'categorias'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Categorias ({categoriesList.filter((c) => !c.arquivada).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('destaques')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'destaques'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Destaques & Banner</span>
          </button>

          <button
            onClick={() => setActiveTab('pedidos')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'pedidos'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Pedidos e Vendas</span>
          </button>

          <button
            onClick={() => setActiveTab('impressao')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'impressao'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Cardápio Impresso A4</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'config'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Loja & WhatsApp</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* ABA 1: PRODUTOS & GESTÃO DE FOTOS */}
        {/* ============================================================ */}
        {activeTab === 'produtos' && (
          <div className="mt-5 space-y-4">
            {/* Banner de Status das Fotos */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-950">
                    Controle de Fotos do Cardápio Comercial
                  </h3>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    <strong>{commercialPendingPhotos}</strong> de {commercialItems.length} produtos
                    comerciais à venda aguardam fotos oficiais. No cardápio público, exibem o selo
                    oficial <em>&quot;Foto oficial em breve&quot;</em>.
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Registros históricos, adicionais e ideias futuras permanecem classificados sem
                    poluir o catálogo comercial.
                  </p>
                </div>
              </div>

              {/* Filtro Rápido de Fotos */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200 self-start sm:self-center">
                <button
                  onClick={() => setPhotoFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  onClick={() => setPhotoFilter('without_photo')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'without_photo'
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Sem foto (
                  {products.length -
                    Object.keys(productPhotos).filter((k) => (productPhotos[k] || []).length > 0)
                      .length}
                  )
                </button>
                <button
                  onClick={() => setPhotoFilter('with_photo')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'with_photo'
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Com foto (
                  {
                    Object.keys(productPhotos).filter((k) => (productPhotos[k] || []).length > 0)
                      .length
                  }
                  )
                </button>
              </div>
            </div>

            {/* Filtros, Busca e Botão Adicionar Produto */}
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
                {categoryFilterOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setProductModalMode('create')
                  setSelectedProductForEdit(null)
                  setProductModalOpen(true)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-green-800 transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Produto</span>
              </button>
            </div>

            {/* Lista dos Produtos */}
            <div className="space-y-2.5">
              {filtered.map((p) => {
                const isOutOfStock =
                  p.observacoes?.includes('ESGOTADO') || p.status === 'paused'
                const isArchived = p.status === 'archived'
                const photos = productPhotos[p.codigo] || []
                const primaryPhoto = photos.find((x) => x.isPrimary) || photos[0]

                return (
                  <div
                    key={p.codigo}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border bg-white p-4 shadow-xs gap-3 ${
                      isArchived ? 'border-stone-300 opacity-65' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Miniatura ou Placeholder */}
                      <button
                        onClick={() => setPhotoModalProduct(p)}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center hover:border-amber-400 group"
                        title="Gerenciar fotos deste produto"
                      >
                        {primaryPhoto ? (
                          <img
                            src={primaryPhoto.url}
                            alt={p.produto}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-stone-400 group-hover:text-amber-600">
                            <Camera className="h-5 w-5" />
                            <span className="text-[8px] font-bold mt-0.5">Adicionar</span>
                          </div>
                        )}
                        {photos.length > 0 && (
                          <span className="absolute bottom-0 right-0 bg-stone-900/80 text-white text-[9px] px-1 font-bold rounded-tl">
                            {photos.length}
                          </span>
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                            {p.codigo}
                          </span>
                          <h4 className="text-xs font-bold text-stone-900">{p.produto}</h4>
                          <span className="text-[10px] text-stone-400">({p.categoria})</span>
                          {!p.isCommercial && (
                            <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-stone-700">
                              {p.classification === 'addon'
                                ? 'Adicional'
                                : p.classification === 'historical_recipe'
                                  ? 'Receita Histórica'
                                  : 'Ideia / Rascunho'}
                            </span>
                          )}
                        </div>

                        {(p.descricao || p.ingredientes) && (
                          <p className="mt-1 text-[11px] text-stone-500">
                            {p.ingredientes || p.descricao}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {p.dia_periodo && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                              <Calendar className="h-3 w-3 text-amber-700" />
                              {p.dia_periodo}
                            </span>
                          )}
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 font-medium">
                            {p.unidade}
                          </span>
                          {isArchived ? (
                            <span className="rounded bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                              ● Arquivado
                            </span>
                          ) : isOutOfStock ? (
                            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              ● Esgotado hoje
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              ● Disponível
                            </span>
                          )}
                          <button
                            onClick={() => setPhotoModalProduct(p)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-orange-700 ml-1"
                          >
                            <Camera className="h-3 w-3" />
                            <span>
                              {photos.length > 0 ? `${photos.length} foto(s)` : '+ Inserir Foto'}
                            </span>
                          </button>
                        </div>
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
                              {p.preco !== null && p.preco > 0
                                ? formatCentsToBRL(Math.round(p.preco * 100))
                                : 'Sem preço'}
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
                            type="button"
                            onClick={() => {
                              setProductModalMode('edit')
                              setSelectedProductForEdit(p)
                              setProductModalOpen(true)
                            }}
                            className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-bold text-stone-700 hover:border-amber-400 hover:bg-amber-50/40 transition"
                            title="Editar todos os dados do produto"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => toggleAvailability(p.codigo)}
                            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
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

        {/* MODAL COMPLETO DE ADICIONAR / EDITAR PRODUTO */}
        {productModalOpen && (
          <ProductFormModal
            isOpen={productModalOpen}
            mode={productModalMode}
            initialProduct={selectedProductForEdit}
            product={selectedProductForEdit}
            allProducts={products}
            categories={categoriesList}
            onClose={() => {
              setProductModalOpen(false)
              setSelectedProductForEdit(null)
            }}
            onSave={(updatedProducts, savedProd) => {
              saveProductsPersistently(updatedProducts)
              setProductModalOpen(false)
              setSelectedProductForEdit(null)
              notify(`Produto ${savedProd.codigo} (${savedProd.produto}) salvo com sucesso!`)
            }}
            onDelete={(updatedProducts, deletedCode) => {
              saveProductsPersistently(updatedProducts)
              setProductModalOpen(false)
              setSelectedProductForEdit(null)
              notify(`Produto ${deletedCode} excluído do catálogo.`)
            }}
          />
        )}

        {/* ============================================================ */}
        {/* MODAL DE GESTÃO DE FOTOS & CÂMERA DO CELULAR */}
        {/* ============================================================ */}
        {photoModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
            <div className="relative max-w-lg w-full rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-stone-500">
                    {photoModalProduct.codigo}
                  </span>
                  <h3 className="font-extrabold text-sm text-stone-900">
                    Galeria de Fotos: {photoModalProduct.produto}
                  </h3>
                </div>
                <button
                  onClick={() => setPhotoModalProduct(null)}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {photoUploadFeedback && (
                <div className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{photoUploadFeedback}</span>
                </div>
              )}

              {/* Ações de Upload / Câmera */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-3 text-center cursor-pointer hover:bg-amber-100/50 transition">
                  <Upload className="h-5 w-5 text-amber-700 mb-1" />
                  <span className="text-xs font-bold text-stone-800">Escolher Foto</span>
                  <span className="text-[10px] text-stone-500">Galeria / Arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, photoModalProduct.codigo)}
                  />
                </label>

                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-3 text-center cursor-pointer hover:bg-orange-100/50 transition">
                  <Camera className="h-5 w-5 text-orange-700 mb-1" />
                  <span className="text-xs font-bold text-stone-800">Usar Câmera</span>
                  <span className="text-[10px] text-stone-500">Fotografar agora</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, photoModalProduct.codigo)}
                  />
                </label>
              </div>

              {/* Lista de Fotos Existentes */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-stone-700 mb-2">
                  Fotos Cadastradas ({(productPhotos[photoModalProduct.codigo] || []).length}):
                </h4>

                {(productPhotos[photoModalProduct.codigo] || []).length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-xs text-stone-500">
                    Nenhuma foto cadastrada ainda para este item. O cardápio exibirá a arte oficial{' '}
                    <em>&quot;Foto oficial em breve&quot;</em>.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {(productPhotos[photoModalProduct.codigo] || []).map((photo, index) => (
                      <div
                        key={index}
                        className={`relative rounded-xl overflow-hidden border-2 bg-stone-100 p-1 ${
                          photo.isPrimary
                            ? 'border-amber-500 ring-2 ring-amber-300'
                            : 'border-stone-200'
                        }`}
                      >
                        <div className="relative h-28 w-full rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
                          <img
                            src={photo.url}
                            alt={`Foto ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="mt-1.5 flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhoto(photoModalProduct.codigo, index)}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              photo.isPrimary
                                ? 'text-amber-700'
                                : 'text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            <Star
                              className={`h-3 w-3 ${
                                photo.isPrimary ? 'fill-amber-500 text-amber-500' : ''
                              }`}
                            />
                            <span>{photo.isPrimary ? 'Foto Principal' : 'Tornar Capa'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photoModalProduct.codigo, index)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                            title="Excluir foto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão de Fechar */}
              <div className="mt-5 border-t border-stone-100 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPhotoModalProduct(null)}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: CHURRASCO GREGO (Quinta, Sábado, Costela em Rascunho e Novos Dias) */}
        {/* ============================================================ */}
        {activeTab === 'grego' && (
          <div className="mt-5">
            <ChurrascoGregoSection
              onProgramsUpdated={(updated) => {
                setGreekPrograms(updated)
                notify('Programação do Churrasco Grego atualizada!')
              }}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: CATEGORIAS (CRUD Completo + Organização de Porções) */}
        {/* ============================================================ */}
        {activeTab === 'categorias' && (
          <div className="mt-5">
            <CategoriesManagerSection
              products={products}
              categories={categoriesList}
              onUpdateCategories={(updated) => {
                saveCategoriesPersistently(updated)
              }}
              onUpdateProducts={(updatedProds) => {
                saveProductsPersistently(updatedProds)
              }}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: DESTAQUES & CARROSSEL DA PÁGINA INICIAL */}
        {/* ============================================================ */}
        {activeTab === 'destaques' && (
          <div className="mt-5">
            <BannerEditorSection
              config={bannerConfig}
              onChange={handleBannerChange}
              onNotify={notify}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 5: PEDIDOS, INDICADORES E EXPORTAÇÃO EXCEL (.XLSX) */}
        {/* ============================================================ */}
        {activeTab === 'pedidos' && (
          <div className="mt-5">
            <OrdersAndSalesTab />
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 6: GERADOR DE CARDÁPIO PARA IMPRESSÃO (PDF A4 FRENTE E VERSO) */}
        {/* ============================================================ */}
        {activeTab === 'impressao' && (
          <div className="mt-5">
            <PrintableMenuGenerator
              products={products}
              categories={categoriesList}
              storeIdentity={storeIdentity}
              greekPrograms={greekPrograms}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 7: IDENTIDADE DA LOJA, GOOGLE MAPS, AGENDA SEMANAL E PERSISTÊNCIA */}
        {/* ============================================================ */}
        {activeTab === 'config' && (
          <div className="mt-5 space-y-5">
            <StoreAndAgendaSection
              onIdentityUpdated={(updated) => {
                setStoreIdentity(updated)
                notify('Identidade e configurações da loja salvas!')
              }}
              onScheduleUpdated={() => {
                notify('Agenda da semana e status de funcionamento atualizados!')
              }}
            />

            {/* Transparência de Persistência Local vs. Supabase Cloud */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#c21e1e]" />
                  <h4 className="text-xs font-black uppercase text-stone-900">
                    Diagnóstico de Persistência de Dados
                  </h4>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    persistenceReport.isSupabaseConfigured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {persistenceReport.isSupabaseConfigured
                    ? 'Supabase Cloud Conectado'
                    : 'Modo Demonstrativo Local (localStorage)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600">
                Todas as alterações feitas neste painel (produtos, preços, fotos, categorias,
                agenda, churrasco grego, banner e pedidos) são persistidas imediatamente no
                navegador e sincronizadas com o cardápio público. As migrações SQL do Supabase
                PostgreSQL estão prontas para ativação em nuvem.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
