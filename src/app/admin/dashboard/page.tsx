'use client'

import { useState } from 'react'
import Image from 'next/image'
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
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  Star,
  X,
} from 'lucide-react'
import { INITIAL_PRODUCTS, InitialProduct } from '@/data/initialCatalog'
import { formatCentsToBRL } from '@/lib/money'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'produtos' | 'grego' | 'categorias' | 'config'>('produtos')
  const [products, setProducts] = useState<InitialProduct[]>(INITIAL_PRODUCTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('Todas')
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with_photo' | 'without_photo'>('all')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editPriceInput, setEditPriceInput] = useState<string>('')
  
  // Modal de Fotos
  const [photoModalProduct, setPhotoModalProduct] = useState<InitialProduct | null>(null)
  const [productPhotos, setProductPhotos] = useState<Record<string, { url: string; isPrimary: boolean }[]>>({})
  const [photoUploadFeedback, setPhotoUploadFeedback] = useState<string | null>(null)

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
    
    const photos = productPhotos[p.codigo] || []
    const matchPhoto =
      photoFilter === 'all' ||
      (photoFilter === 'with_photo' && photos.length > 0) ||
      (photoFilter === 'without_photo' && photos.length === 0)

    return matchCat && matchSearch && matchPhoto
  })

  // Alternar disponibilidade rápida
  const toggleAvailability = (code: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.codigo === code) {
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

  // Upload local simulado de fotos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, code: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newPhotos = Array.from(files).map((file, idx) => ({
      url: URL.createObjectURL(file),
      isPrimary: (productPhotos[code]?.length || 0) + idx === 0, // primeira é primária
    }))

    setProductPhotos((prev) => ({
      ...prev,
      [code]: [...(prev[code] || []), ...newPhotos],
    }))

    setPhotoUploadFeedback('Foto carregada com sucesso e otimizada!')
    setTimeout(() => setPhotoUploadFeedback(null), 3000)
  }

  // Marcar como foto principal
  const handleSetPrimaryPhoto = (code: string, photoIndex: number) => {
    setProductPhotos((prev) => {
      const list = prev[code] || []
      return {
        ...prev,
        [code]: list.map((item, idx) => ({
          ...item,
          isPrimary: idx === photoIndex,
        })),
      }
    })
  }

  // Excluir foto
  const handleDeletePhoto = (code: string, photoIndex: number) => {
    setProductPhotos((prev) => {
      const list = prev[code] || []
      const updated = list.filter((_, idx) => idx !== photoIndex)
      if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
        updated[0].isPrimary = true
      }
      return { ...prev, [code]: updated }
    })
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
  const totalWithoutPhoto = products.filter((p) => (productPhotos[p.codigo] || []).length === 0).length

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-900 pb-20">
      {/* Barra Superior do Administrador com Logo Oficial */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-amber-400 bg-black shadow-xs">
              <Image
                src="/images/brand/logo-oficial.jpg"
                alt="Logotipo Oficial Brasa Caipira"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900">BRASA CAIPIRA</span>
                <span className="rounded bg-[#c21e1e] px-1.5 py-0.5 text-[10px] font-bold text-white">
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
        {/* Abas de Navegação */}
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'grego'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Carne da Quinta (Grego)</span>
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'categorias'
                ? 'bg-[#c21e1e] text-white shadow-sm shadow-red-900/20'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Categorias (17)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
                    Controle de Fotos do Cardápio
                  </h3>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    <strong>{totalWithoutPhoto}</strong> de {products.length} itens ainda aguardam fotos oficiais. No cardápio público, eles exibem o selo seguro <em>&quot;Foto em breve&quot;</em>.
                  </p>
                </div>
              </div>

              {/* Filtro Rápido de Fotos */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200 self-start sm:self-center">
                <button
                  onClick={() => setPhotoFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'all' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setPhotoFilter('without_photo')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'without_photo' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Sem foto ({totalWithoutPhoto})
                </button>
                <button
                  onClick={() => setPhotoFilter('with_photo')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    photoFilter === 'with_photo' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Com foto ({products.length - totalWithoutPhoto})
                </button>
              </div>
            </div>

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

            {/* Lista dos Produtos */}
            <div className="space-y-2.5">
              {filtered.map((p) => {
                const isOutOfStock = p.observacoes?.includes('ESGOTADO')
                const photos = productPhotos[p.codigo] || []
                const primaryPhoto = photos.find((x) => x.isPrimary) || photos[0]

                return (
                  <div
                    key={p.codigo}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Miniatura ou Placeholder */}
                      <button
                        onClick={() => setPhotoModalProduct(p)}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center hover:border-amber-400 group"
                        title="Gerenciar fotos deste produto"
                      >
                        {primaryPhoto ? (
                          <Image
                            src={primaryPhoto.url}
                            alt={p.produto}
                            fill
                            className="object-cover"
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
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                              <Calendar className="h-3 w-3 text-amber-700" />
                              {p.dia_periodo}
                            </span>
                          )}
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 font-medium">
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
                          <button
                            onClick={() => setPhotoModalProduct(p)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-orange-700 ml-1"
                          >
                            <Camera className="h-3 w-3" />
                            <span>{photos.length > 0 ? `${photos.length} foto(s)` : '+ Inserir Foto'}</span>
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
                    Nenhuma foto cadastrada ainda para este item. O cardápio exibirá a arte oficial <em>&quot;Foto oficial em breve&quot;</em>.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {(productPhotos[photoModalProduct.codigo] || []).map((photo, index) => (
                      <div
                        key={index}
                        className={`relative rounded-xl overflow-hidden border-2 bg-stone-100 p-1 ${
                          photo.isPrimary ? 'border-amber-500 ring-2 ring-amber-300' : 'border-stone-200'
                        }`}
                      >
                        <div className="relative h-28 w-full rounded-lg overflow-hidden">
                          <Image
                            src={photo.url}
                            alt={`Foto ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="mt-1.5 flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhoto(photoModalProduct.codigo, index)}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              photo.isPrimary ? 'text-amber-700' : 'text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            <Star className={`h-3 w-3 ${photo.isPrimary ? 'fill-amber-500 text-amber-500' : ''}`} />
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
