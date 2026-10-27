'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Flame, Sparkles, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { HeroBannerConfig } from '@/types/phase3.types'
import { DEFAULT_HERO_BANNER } from '@/lib/bannerCarouselManager'

interface HeroBannerCarouselProps {
  config?: HeroBannerConfig
  onZoomPhoto: (photo: { url: string; title: string; desc: string }) => void
  onSelectCategory?: (category: string) => void
}

export default function HeroBannerCarousel({
  config = DEFAULT_HERO_BANNER,
  onZoomPhoto,
  onSelectCategory,
}: HeroBannerCarouselProps) {
  const activeSlides = (config.slides || DEFAULT_HERO_BANNER.slides).filter((s) => s.ativo)
  const slidesToRender = activeSlides.length > 0 ? activeSlides : DEFAULT_HERO_BANNER.slides

  const [currentIndex, setCurrentIndex] = useState(0)
  const safeIndex = currentIndex < slidesToRender.length ? currentIndex : 0
  const currentSlide = slidesToRender[safeIndex]

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? slidesToRender.length - 1 : prev - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === slidesToRender.length - 1 ? 0 : prev + 1))
  }

  const handleSelectBlock = (targetSlideIndex: number, fallbackCategory: string) => {
    if (targetSlideIndex >= 0 && targetSlideIndex < slidesToRender.length) {
      setCurrentIndex(targetSlideIndex)
      const slideCat = slidesToRender[targetSlideIndex]?.categoriaAlvo
      if (onSelectCategory && slideCat) {
        onSelectCategory(slideCat)
      }
    } else if (onSelectCategory) {
      onSelectCategory(fallbackCategory)
    }
  }

  return (
    <section className="px-4 pt-3">
      <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-[#991b1b] via-[#b91c1c] to-[#7f1d1d] overflow-hidden text-white shadow-md">
        {/* Foto Principal / Slide do Carrossel Oficial Brasa Caipira */}
        <div
          onClick={() => {
            if (currentSlide.imagemUrl) {
              onZoomPhoto({
                url: currentSlide.imagemUrl,
                title: currentSlide.titulo,
                desc: currentSlide.descricao,
              })
            }
          }}
          className={`relative h-52 sm:h-64 w-full ${
            currentSlide.imagemUrl ? 'cursor-pointer' : 'cursor-default'
          } group bg-black/30`}
        >
          {currentSlide.imagemUrl ? (
            <Image
              src={currentSlide.imagemUrl}
              alt={currentSlide.titulo}
              fill
              priority
              className="object-cover group-hover:scale-102 transition duration-300"
            />
          ) : (
            /* Arte Oficial Brasa Caipira quando o slide não possui fotografia (sem inventar foto falsa) */
            <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-[#7f1d1d] to-stone-900 flex flex-col items-center justify-center p-6 text-center">
              <div className="h-14 w-14 rounded-full border-2 border-amber-400/80 bg-black/40 flex items-center justify-center mb-2 shadow-inner">
                <Flame className="h-7 w-7 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90">
                Especialidade Brasa Caipira • Foto Oficial em Breve
              </span>
            </div>
          )}

          {/* Setas discretas de navegação do carrossel */}
          {slidesToRender.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Slide anterior"
                onClick={handlePrev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/45 hover:bg-black/70 text-white p-1.5 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próximo slide"
                onClick={handleNext}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/45 hover:bg-black/70 text-white p-1.5 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-stone-950">
                  {currentSlide.selo || config.seloPadrao}
                </span>
                <h2 className="mt-1 text-sm sm:text-base font-black text-white drop-shadow-md">
                  {currentSlide.titulo}
                </h2>
              </div>
              {currentSlide.imagemUrl && (
                <span className="bg-black/60 text-white rounded-full p-2 group-hover:scale-110 transition shadow-sm">
                  <Maximize2 className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Três indicadores discretos abaixo da imagem */}
        {slidesToRender.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 bg-black/25 py-1.5 border-b border-white/10">
            {slidesToRender.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ir para slide ${idx + 1}: ${slide.titulo}`}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === safeIndex
                    ? 'w-5 bg-amber-400'
                    : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>{config.tituloDestaquesSemana}</span>
          </div>

          <p className="mt-1 text-xs text-amber-100/90 leading-snug">
            {currentSlide.descricao || config.textoDescritivoPrincipal}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectBlock(config.bloco1SlideIndex ?? 1, 'Massas')}
              className={`text-left rounded-xl p-2 border transition cursor-pointer ${
                safeIndex === (config.bloco1SlideIndex ?? 1)
                  ? 'bg-black/50 border-amber-400 shadow-xs'
                  : 'bg-black/30 border-white/10 hover:border-amber-300/60'
              }`}
            >
              <span className="font-bold text-amber-300 block">{config.bloco1Titulo}</span>
              <span className="text-[10px] text-stone-200">{config.bloco1Descricao}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSelectBlock(config.bloco2SlideIndex ?? 2, 'Churrasco Grego — Quinta')
              }
              className={`text-left rounded-xl p-2 border transition cursor-pointer ${
                safeIndex === (config.bloco2SlideIndex ?? 2)
                  ? 'bg-black/50 border-amber-400 shadow-xs'
                  : 'bg-black/30 border-white/10 hover:border-amber-300/60'
              }`}
            >
              <span className="font-bold text-amber-300 block">{config.bloco2Titulo}</span>
              <span className="text-[10px] text-stone-200">{config.bloco2Descricao}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
