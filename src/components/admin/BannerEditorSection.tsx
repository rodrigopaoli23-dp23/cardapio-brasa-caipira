'use client'

import React, { useState, useRef } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Check,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react'
import { HeroBannerConfig } from '@/types/phase3.types'
import {
  DEFAULT_HERO_BANNER,
  updateBannerTexts,
  addCarouselSlide,
  updateCarouselSlide,
  removeCarouselSlide,
  reorderCarouselSlides,
} from '@/lib/bannerCarouselManager'

interface BannerEditorSectionProps {
  config: HeroBannerConfig
  onChange: (updated: HeroBannerConfig) => void
  onNotify?: (msg: string) => void
}

const OFFICIAL_IMAGE_OPTIONS = [
  { label: 'Cartaz Oficial 1: Espetinhos na Brasa', url: '/images/brand/banner-espetinhos.png' },
  { label: 'Cartaz Oficial 2: Massas Frescas (Talharim)', url: '/images/brand/banner-massas.png' },
  { label: 'Cartaz Oficial 3: Churrasco Grego', url: '/images/brand/banner-grego.png' },
  { label: 'Logotipo Oficial Brasa Caipira', url: '/images/brand/logo-oficial.jpg' },
  { label: 'Sem fotografia (Usar Arte Oficial da Marca)', url: '' },
]

export default function BannerEditorSection({
  config,
  onChange,
  onNotify,
}: BannerEditorSectionProps) {
  const [newSlideTitulo, setNewSlideTitulo] = useState('')
  const [newSlideSelo, setNewSlideSelo] = useState('Destaque da Casa')
  const [newSlideDescricao, setNewSlideDescricao] = useState('')
  const [newSlideCategoria, setNewSlideCategoria] = useState('Espetinhos')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleTextChange = (field: keyof Omit<HeroBannerConfig, 'slides'>, value: string | number) => {
    const updated = updateBannerTexts(config, { [field]: value })
    onChange(updated)
  }

  const handleSlideUpload = (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = updateCarouselSlide(config, slideId, { imagemUrl: reader.result })
        onChange(updated)
        onNotify?.('Imagem do slide atualizada com sucesso!')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAddSlide = () => {
    if (!newSlideTitulo.trim()) {
      setErrorMsg('Informe o título do novo slide antes de adicionar.')
      return
    }
    setErrorMsg(null)
    const updated = addCarouselSlide(config, {
      ativo: true,
      selo: newSlideSelo || 'Destaque Oficial',
      titulo: newSlideTitulo,
      descricao:
        newSlideDescricao ||
        'Especialidade preparada no capricho. Peça pelo WhatsApp ou no balcão!',
      imagemUrl: null,
      categoriaAlvo: newSlideCategoria || 'Todas',
    })
    onChange(updated)
    setNewSlideTitulo('')
    setNewSlideDescricao('')
    onNotify?.('Novo slide adicionado ao carrossel!')
  }

  const handleRemoveSlide = (slideId: string) => {
    const res = removeCarouselSlide(config, slideId)
    if (!res.removed) {
      setErrorMsg(res.error || 'Não foi possível remover o slide.')
      return
    }
    setErrorMsg(null)
    onChange(res.config)
    onNotify?.('Slide removido do carrossel.')
  }

  const handleRestoreDefaults = () => {
    onChange(structuredClone(DEFAULT_HERO_BANNER))
    onNotify?.('Banner e carrossel restaurados para o padrão oficial!')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase text-stone-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#c21e1e]" />
              Destaques da Página Inicial & Carrossel Oficial
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Edite o selo amarelo, títulos, blocos clicáveis e gerencie os slides do banner principal sem alterar o layout aprovado.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão Oficial
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {errorMsg}
          </div>
        )}

        {/* Textos Gerais e Blocos de Destaque */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-500">
              Selo Amarelo Padrão
            </label>
            <input
              type="text"
              value={config.seloPadrao}
              onChange={(e) => handleTextChange('seloPadrao', e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-900"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-stone-500">
              Título &ldquo;Destaques da Semana&rdquo;
            </label>
            <input
              type="text"
              value={config.tituloDestaquesSemana}
              onChange={(e) => handleTextChange('tituloDestaquesSemana', e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase text-stone-500">
              Texto Descritivo Padrão do Banner
            </label>
            <textarea
              rows={2}
              value={config.textoDescritivoPrincipal}
              onChange={(e) => handleTextChange('textoDescritivoPrincipal', e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900"
            />
          </div>

          {/* Bloco 1: Massas Frescas */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-900">
              Bloco de Destaque 1 (Esquerda)
            </span>
            <div>
              <label className="text-[10px] font-bold text-stone-600">Título do Bloco 1</label>
              <input
                type="text"
                value={config.bloco1Titulo}
                onChange={(e) => handleTextChange('bloco1Titulo', e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600">Descrição do Bloco 1</label>
              <input
                type="text"
                value={config.bloco1Descricao}
                onChange={(e) => handleTextChange('bloco1Descricao', e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Bloco 2: Churrasco Grego */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-900">
              Bloco de Destaque 2 (Direita)
            </span>
            <div>
              <label className="text-[10px] font-bold text-stone-600">Título do Bloco 2</label>
              <input
                type="text"
                value={config.bloco2Titulo}
                onChange={(e) => handleTextChange('bloco2Titulo', e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600">
                Descrição da Carne / Quinta-feira
              </label>
              <input
                type="text"
                value={config.bloco2Descricao}
                onChange={(e) => handleTextChange('bloco2Descricao', e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gerenciador de Slides do Carrossel */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-stone-900">
              Slides do Carrossel ({config.slides.length} cadastrados)
            </h3>
            <p className="text-[11px] text-stone-500">
              Slide 1: Espetinhos • Slide 2: Massas • Slide 3: Churrasco Grego (ou novos slides personalizados)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {config.slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="rounded-xl border border-stone-200 bg-[#fdfbf7] p-3.5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#c21e1e] px-2 py-0.5 text-[10px] font-black text-white">
                    Slide #{idx + 1}
                  </span>
                  <span className="text-xs font-black text-stone-800">{slide.titulo}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 mr-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slide.ativo}
                      onChange={(e) =>
                        onChange(updateCarouselSlide(config, slide.id, { ativo: e.target.checked }))
                      }
                      className="rounded border-stone-300 text-[#15803d]"
                    />
                    Ativo
                  </label>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onChange(reorderCarouselSlides(config, slide.id, 'up'))}
                    className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                    title="Subir slide"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === config.slides.length - 1}
                    onClick={() => onChange(reorderCarouselSlides(config, slide.id, 'down'))}
                    className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                    title="Descer slide"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlide(slide.id)}
                    className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    title="Remover slide"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Selo Amarelo do Slide
                  </label>
                  <input
                    type="text"
                    value={slide.selo}
                    onChange={(e) =>
                      onChange(updateCarouselSlide(config, slide.id, { selo: e.target.value }))
                    }
                    className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Título Principal (Ex: A Brasa Tem Escolha!)
                  </label>
                  <input
                    type="text"
                    value={slide.titulo}
                    onChange={(e) =>
                      onChange(updateCarouselSlide(config, slide.id, { titulo: e.target.value }))
                    }
                    className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Categoria Alvo ao Clicar
                  </label>
                  <input
                    type="text"
                    value={slide.categoriaAlvo}
                    onChange={(e) =>
                      onChange(
                        updateCarouselSlide(config, slide.id, { categoriaAlvo: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Descrição do Slide
                  </label>
                  <input
                    type="text"
                    value={slide.descricao}
                    onChange={(e) =>
                      onChange(
                        updateCarouselSlide(config, slide.id, { descricao: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-stone-500">
                    Foto Oficial ou Upload
                  </label>
                  <div className="mt-0.5 flex gap-1.5">
                    <select
                      value={slide.imagemUrl || ''}
                      onChange={(e) =>
                        onChange(
                          updateCarouselSlide(config, slide.id, {
                            imagemUrl: e.target.value ? e.target.value : null,
                          })
                        )
                      }
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
                    >
                      {OFFICIAL_IMAGE_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.url}>
                          {opt.label}
                        </option>
                      ))}
                      {slide.imagemUrl &&
                        !OFFICIAL_IMAGE_OPTIONS.some((o) => o.url === slide.imagemUrl) && (
                          <option value={slide.imagemUrl}>Foto Enviada Personalizada</option>
                        )}
                    </select>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[slide.id] = el
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleSlideUpload(slide.id, e)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[slide.id]?.click()}
                      className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-stone-800"
                      title="Enviar foto do dispositivo"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Foto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar Novo Slide */}
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-3.5 space-y-2.5">
          <span className="text-[11px] font-black uppercase text-stone-700 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-[#c21e1e]" />
            Adicionar Novo Slide ao Carrossel
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Selo (ex: Novidade)"
              value={newSlideSelo}
              onChange={(e) => setNewSlideSelo(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Título do Slide"
              value={newSlideTitulo}
              onChange={(e) => setNewSlideTitulo(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
            />
            <input
              type="text"
              placeholder="Descrição resumida"
              value={newSlideDescricao}
              onChange={(e) => setNewSlideDescricao(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleAddSlide}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#15803d] px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Slide
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
