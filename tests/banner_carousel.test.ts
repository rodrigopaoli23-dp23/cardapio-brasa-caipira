import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HERO_BANNER,
  updateBannerTexts,
  addCarouselSlide,
  updateCarouselSlide,
  removeCarouselSlide,
  reorderCarouselSlides,
} from '../src/lib/bannerCarouselManager'

describe('Hero Banner & Carrossel Oficial (Etapa D — Agente 3)', () => {
  it('1. Deve iniciar com 3 slides oficiais (Espetinhos, Massas, Churrasco Grego) sem fotos falsas', () => {
    expect(DEFAULT_HERO_BANNER.slides).toHaveLength(3)
    expect(DEFAULT_HERO_BANNER.slides[0].titulo).toBe('A BRASA TEM ESCOLHA!')
    expect(DEFAULT_HERO_BANNER.slides[0].imagemUrl).toBe('/images/brand/banner-espetinhos.png')

    // Slides 2 e 3 utilizam null (arte oficial / placeholder) sem inventar fotografia falsa
    expect(DEFAULT_HERO_BANNER.slides[1].selo).toBe('Massas Frescas')
    expect(DEFAULT_HERO_BANNER.slides[1].imagemUrl).toBeNull()

    expect(DEFAULT_HERO_BANNER.slides[2].titulo).toContain('CHURRASCO GREGO')
    expect(DEFAULT_HERO_BANNER.slides[2].imagemUrl).toBeNull()
  })

  it('2. Deve permitir editar todos os textos e blocos de destaque do banner', () => {
    const updated = updateBannerTexts(DEFAULT_HERO_BANNER, {
      seloPadrao: 'Selo Especial Brasa',
      tituloDestaquesSemana: 'Novos Destaques da Semana',
      bloco1Titulo: 'Massas Artesanais',
      bloco1Descricao: 'Nhoque e Talharim',
      bloco2Titulo: 'Grego de Quinta e Sábado',
      bloco2Descricao: 'Fraldinha Extra Grill ou Lombo',
    })

    expect(updated.seloPadrao).toBe('Selo Especial Brasa')
    expect(updated.tituloDestaquesSemana).toBe('Novos Destaques da Semana')
    expect(updated.bloco1Titulo).toBe('Massas Artesanais')
    expect(updated.bloco2Descricao).toBe('Fraldinha Extra Grill ou Lombo')
  })

  it('3. Deve permitir adicionar, editar, reordenar e remover slides mantendo ao menos 1 ativo', () => {
    const withNew = addCarouselSlide(DEFAULT_HERO_BANNER, {
      id: 'slide-porcoes',
      ativo: true,
      selo: 'Porções da Casa',
      titulo: 'TÁBUA DE FRIOS E BATATA FRITA',
      descricao: 'Porções caprichadas para acompanhar',
      imagemUrl: null,
      categoriaAlvo: 'Porções',
    })

    expect(withNew.slides).toHaveLength(4)
    expect(withNew.slides[3].id).toBe('slide-porcoes')

    const edited = updateCarouselSlide(withNew, 'slide-porcoes', {
      titulo: 'PORÇÕES ESPECIAIS BRASA CAIPIRA',
    })
    expect(edited.slides[3].titulo).toBe('PORÇÕES ESPECIAIS BRASA CAIPIRA')

    const reordered = reorderCarouselSlides(edited, 'slide-porcoes', 'up')
    expect(reordered.slides[2].id).toBe('slide-porcoes')
    expect(reordered.slides[2].ordem).toBe(3)

    // Remove 3 slides e verifica proteção do último slide
    const r1 = removeCarouselSlide(reordered, 'slide-porcoes')
    expect(r1.removed).toBe(true)
    const r2 = removeCarouselSlide(r1.config, 'slide-grego')
    expect(r2.removed).toBe(true)
    const r3 = removeCarouselSlide(r2.config, 'slide-massas')
    expect(r3.removed).toBe(true)

    const r4 = removeCarouselSlide(r3.config, 'slide-espetinhos')
    expect(r4.removed).toBe(false)
    expect(r4.config.slides).toHaveLength(1)
  })
})
