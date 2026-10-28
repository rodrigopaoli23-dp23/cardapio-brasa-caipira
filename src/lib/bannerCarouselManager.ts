import { HeroBannerConfig, CarouselSlide } from '@/types/phase3.types'
import { pushToCloud } from '@/lib/cloudSync'

export const HERO_BANNER_STORAGE_KEY = 'brasa_caipira_hero_banner_v1'

export const DEFAULT_HERO_BANNER: HeroBannerConfig = {
  seloPadrao: 'Foto & Cartaz Oficial',
  tituloDestaquesSemana: 'Destaques da Semana no Brasa Caipira',
  textoDescritivoPrincipal:
    'Espetos tradicionais assados na brasa, acompanhados de farofa artesanal caipira e molhos especiais da casa. Faça seu pedido direto no balcão ou via WhatsApp!',
  bloco1Titulo: 'Massas Frescas',
  bloco1Descricao: 'Talharim à bolonhesa no pote',
  bloco1SlideIndex: 1,
  bloco2Titulo: 'Churrasco Grego',
  bloco2Descricao: 'Às quintas: fraldinha ou lombo',
  bloco2SlideIndex: 2,
  slides: [
    {
      id: 'slide-espetinhos',
      ordem: 1,
      ativo: true,
      selo: 'Foto & Cartaz Oficial',
      titulo: 'A BRASA TEM ESCOLHA!',
      descricao:
        'Espetos tradicionais assados na brasa, acompanhados de farofa artesanal caipira e molhos especiais da casa. Faça seu pedido direto no balcão ou via WhatsApp!',
      imagemUrl: '/images/brand/banner-espetinhos.png',
      categoriaAlvo: 'Espetinhos',
    },
    {
      id: 'slide-massas',
      ordem: 2,
      ativo: true,
      selo: 'Massas Frescas',
      titulo: 'SABOR QUE CONQUISTA NA PRIMEIRA GARFADA!',
      descricao:
        'Talharim à bolonhesa no pote preparado na casa. Consulte disponibilidade e peça pelo WhatsApp!',
      imagemUrl: '/images/brand/banner-massas.png',
      categoriaAlvo: 'Massas',
    },
    {
      id: 'slide-grego',
      ordem: 3,
      ativo: true,
      selo: 'Tradição da Casa',
      titulo: 'TODA QUINTA TEM CHURRASCO GREGO!',
      descricao:
        'Às quintas e sábados: carnes selecionadas na brasa (em lanches e também na porção).',
      imagemUrl: '/images/brand/banner-grego.png',
      categoriaAlvo: 'Churrasco Grego — Quinta',
    },
  ],
}

export function loadHeroBannerConfig(): HeroBannerConfig {
  if (typeof window === 'undefined') {
    return structuredClone(DEFAULT_HERO_BANNER)
  }
  try {
    const raw = window.localStorage.getItem(HERO_BANNER_STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_HERO_BANNER)
    const parsed = JSON.parse(raw) as HeroBannerConfig
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return structuredClone(DEFAULT_HERO_BANNER)
    }
    return parsed
  } catch {
    return structuredClone(DEFAULT_HERO_BANNER)
  }
}

export function saveHeroBannerConfig(config: HeroBannerConfig): void {
  if (typeof window === 'undefined') return
  pushToCloud(HERO_BANNER_STORAGE_KEY, config, { immediate: true })
  try {
    window.localStorage.setItem(HERO_BANNER_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage quota errors
  }
}

export function updateBannerTexts(
  config: HeroBannerConfig,
  partialTexts: Partial<Omit<HeroBannerConfig, 'slides'>>
): HeroBannerConfig {
  return {
    ...config,
    ...partialTexts,
  }
}

export function addCarouselSlide(
  config: HeroBannerConfig,
  slideData: Omit<CarouselSlide, 'id' | 'ordem'> & { id?: string }
): HeroBannerConfig {
  const maxOrdem = config.slides.reduce((acc, s) => Math.max(acc, s.ordem), 0)
  const newSlide: CarouselSlide = {
    id: slideData.id || `slide-${Date.now()}`,
    ordem: maxOrdem + 1,
    ativo: slideData.ativo ?? true,
    selo: slideData.selo.trim() || 'Destaque Oficial',
    titulo: slideData.titulo.trim() || 'NOVO DESTAQUE BRASA CAIPIRA',
    descricao: slideData.descricao.trim(),
    imagemUrl: slideData.imagemUrl ?? null,
    categoriaAlvo: slideData.categoriaAlvo || 'Todas',
  }
  return {
    ...config,
    slides: [...config.slides, newSlide].sort((a, b) => a.ordem - b.ordem),
  }
}

export function updateCarouselSlide(
  config: HeroBannerConfig,
  slideId: string,
  slideData: Partial<Omit<CarouselSlide, 'id'>>
): HeroBannerConfig {
  const updated = config.slides.map((s) => (s.id === slideId ? { ...s, ...slideData } : s))
  return {
    ...config,
    slides: updated.sort((a, b) => a.ordem - b.ordem),
  }
}

export function removeCarouselSlide(
  config: HeroBannerConfig,
  slideId: string
): { config: HeroBannerConfig; removed: boolean; error?: string } {
  if (config.slides.length <= 1) {
    return {
      config,
      removed: false,
      error: 'O carrossel deve manter pelo menos 1 slide ativo.',
    }
  }
  const filtered = config.slides
    .filter((s) => s.id !== slideId)
    .map((s, idx) => ({ ...s, ordem: idx + 1 }))

  return {
    config: {
      ...config,
      slides: filtered,
    },
    removed: true,
  }
}

export function reorderCarouselSlides(
  config: HeroBannerConfig,
  slideId: string,
  direction: 'up' | 'down'
): HeroBannerConfig {
  const sorted = [...config.slides].sort((a, b) => a.ordem - b.ordem)
  const idx = sorted.findIndex((s) => s.id === slideId)
  if (idx === -1) return config

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= sorted.length) return config

  const temp = sorted[idx]
  sorted[idx] = sorted[swapIdx]
  sorted[swapIdx] = temp

  const normalized = sorted.map((s, index) => ({
    ...s,
    ordem: index + 1,
  }))

  return {
    ...config,
    slides: normalized,
  }
}
