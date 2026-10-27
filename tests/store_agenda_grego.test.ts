import { describe, it, expect } from 'vitest'
import {
  DEFAULT_STORE_IDENTITY,
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_GREEK_BBQ_PROGRAMS,
  HISTORICAL_GREEK_RECIPES,
  buildAndValidateGoogleMapsUrl,
  createManualOverrideConfig,
  evaluateStoreOpenStatus,
  applyHistoricalRecipeToProgram,
} from '../src/lib/storeAndScheduleManager'
import { WeeklyScheduleConfig } from '../src/types/phase3.types'

describe('Agente 2 — Identidade da Loja e Validação do Google Maps', () => {
  it('deve possuir os dados oficiais padrão do Brasa Caipira (Leme/SP)', () => {
    expect(DEFAULT_STORE_IDENTITY.nome).toBe('BRASA CAIPIRA')
    expect(DEFAULT_STORE_IDENTITY.endereco).toBe('Rua dos Crisântemos')
    expect(DEFAULT_STORE_IDENTITY.numero).toBe('350')
    expect(DEFAULT_STORE_IDENTITY.bairro).toBe('Jd. Nova Leme')
    expect(DEFAULT_STORE_IDENTITY.cidadeEstado).toBe('Leme / SP')
    expect(DEFAULT_STORE_IDENTITY.telefoneWhatsapp).toBe('5519998107666')
    expect(DEFAULT_STORE_IDENTITY.instagramHandle).toBe('@brasa.caipira')
    expect(DEFAULT_STORE_IDENTITY.modalidadesAtivas).toEqual({
      delivery: true,
      mesa: true,
      retirada: true,
    })
  })

  it('deve validar endereço e construir URL oficial do Google Maps quando sem customUrl', () => {
    const res = buildAndValidateGoogleMapsUrl(
      'Rua dos Crisântemos',
      '350',
      'Jd. Nova Leme',
      'Leme / SP'
    )
    expect(res.isValid).toBe(true)
    expect(res.url).toContain('https://www.google.com/maps/dir/?api=1&destination=')
    expect(res.url).toContain('350')
  })

  it('deve rejeitar endereço sem rua ou sem cidade/UF', () => {
    const noStreet = buildAndValidateGoogleMapsUrl('', '350', 'Centro', 'Leme / SP')
    expect(noStreet.isValid).toBe(false)
    expect(noStreet.error).toBeDefined()

    const noCity = buildAndValidateGoogleMapsUrl('Rua dos Crisântemos', '350', 'Jd. Nova Leme', '')
    expect(noCity.isValid).toBe(false)
    expect(noCity.error).toBeDefined()
  })

  it('deve aceitar URL customizada válida do Google Maps e rejeitar domínios inválidos', () => {
    const validCustom = buildAndValidateGoogleMapsUrl(
      'Rua dos Crisântemos',
      '350',
      'Jd. Nova Leme',
      'Leme / SP',
      'https://maps.app.goo.gl/abc123XYZ'
    )
    expect(validCustom.isValid).toBe(true)
    expect(validCustom.url).toBe('https://maps.app.goo.gl/abc123XYZ')

    const invalidCustom = buildAndValidateGoogleMapsUrl(
      'Rua dos Crisântemos',
      '350',
      'Jd. Nova Leme',
      'Leme / SP',
      'https://example.com/rota-falsa'
    )
    expect(invalidCustom.isValid).toBe(false)
    expect(invalidCustom.error).toContain('Google Maps')
  })
})

describe('Agente 2 — Agenda Semanal e Status no Fuso America/Sao_Paulo', () => {
  it('deve indicar FECHADO na segunda-feira e terça-feira no fuso America/Sao_Paulo', () => {
    // 2026-10-26 é Segunda-feira (20:00 BRT = 23:00 UTC)
    const mondayNight = new Date('2026-10-26T20:00:00-03:00')
    const statusMon = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, mondayNight)
    expect(statusMon.isOpen).toBe(false)
    expect(statusMon.currentDaySchedule.dayIndex).toBe(1)

    // 2026-10-27 é Terça-feira (19:30 BRT)
    const tuesdayNight = new Date('2026-10-27T19:30:00-03:00')
    const statusTue = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, tuesdayNight)
    expect(statusTue.isOpen).toBe(false)
    expect(statusTue.currentDaySchedule.dayIndex).toBe(2)
  })

  it('deve indicar ABERTO de quarta a sábado entre 18:00 e 23:00 e FECHADO fora do horário', () => {
    // 2026-10-29 é Quinta-feira às 19:30 BRT -> ABERTO
    const thursdayOpen = new Date('2026-10-29T19:30:00-03:00')
    const statusOpen = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, thursdayOpen)
    expect(statusOpen.isOpen).toBe(true)
    expect(statusOpen.currentDaySchedule.dayIndex).toBe(4)

    // 2026-10-29 é Quinta-feira às 15:00 BRT -> FECHADO (antes das 18:00)
    const thursdayAfternoon = new Date('2026-10-29T15:00:00-03:00')
    const statusBefore = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, thursdayAfternoon)
    expect(statusBefore.isOpen).toBe(false)
    expect(statusBefore.statusText).toContain('18:00')

    // 2026-10-31 é Sábado às 23:15 BRT -> FECHADO (após as 23:00)
    const saturdayLate = new Date('2026-10-31T23:15:00-03:00')
    const statusAfter = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, saturdayLate)
    expect(statusAfter.isOpen).toBe(false)
  })

  it('deve indicar ABERTO no domingo entre 10:00 e 14:00 e FECHADO à noite', () => {
    // 2026-11-01 é Domingo às 11:30 BRT -> ABERTO
    const sundayLunch = new Date('2026-11-01T11:30:00-03:00')
    const statusSunOpen = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, sundayLunch)
    expect(statusSunOpen.isOpen).toBe(true)
    expect(statusSunOpen.currentDaySchedule.dayIndex).toBe(0)

    // 2026-11-01 é Domingo às 19:00 BRT -> FECHADO
    const sundayNight = new Date('2026-11-01T19:00:00-03:00')
    const statusSunClosed = evaluateStoreOpenStatus(DEFAULT_WEEKLY_SCHEDULE, sundayNight)
    expect(statusSunClosed.isOpen).toBe(false)
  })

  it('deve respeitar o override manual temporário e retornar automaticamente à programação após expiração', () => {
    // Segunda-feira às 20:00 BRT (normalmente fechado)
    const baseTime = new Date('2026-10-26T20:00:00-03:00')

    // Força abertura por 60 minutos (expira às 21:00 BRT)
    const manualOverride = createManualOverrideConfig(
      'force_open',
      60,
      'Evento especial na segunda',
      baseTime
    )
    const scheduleWithOverride: WeeklyScheduleConfig = {
      ...DEFAULT_WEEKLY_SCHEDULE,
      manualOverride,
    }

    // Às 20:30 BRT (ainda dentro dos 60 min) -> deve estar ABERTO
    const duringOverride = new Date('2026-10-26T20:30:00-03:00')
    const statusDuring = evaluateStoreOpenStatus(scheduleWithOverride, duringOverride)
    expect(statusDuring.isOpen).toBe(true)
    expect(statusDuring.reason).toContain('Evento especial na segunda')

    // Às 21:05 BRT (após expirar às 21:00) -> retorna automaticamente ao fechado de segunda-feira!
    const afterExpiry = new Date('2026-10-26T21:05:00-03:00')
    const statusAfterExpiry = evaluateStoreOpenStatus(scheduleWithOverride, afterExpiry)
    expect(statusAfterExpiry.isOpen).toBe(false)
  })
})

describe('Agente 2 — Programações de Churrasco Grego e Rascunho de Costela', () => {
  it('deve conter Quinta-feira, Sábado e o rascunho de Costela bovina fatiada sem preço/publicação automática', () => {
    const quinta = DEFAULT_GREEK_BBQ_PROGRAMS.find((p) => p.id === 'grego-quinta')
    const sabado = DEFAULT_GREEK_BBQ_PROGRAMS.find((p) => p.id === 'grego-sabado')
    const costelaDraft = DEFAULT_GREEK_BBQ_PROGRAMS.find(
      (p) => p.id === 'grego-costela-draft'
    )

    expect(quinta).toBeDefined()
    expect(quinta?.status).toBe('published')
    expect(quinta?.carnePrincipal).toContain('Lombo e Copa-Lombo')
    expect(quinta?.acompanhamentos).toEqual(
      expect.arrayContaining(['Arroz caipira', 'Vinagrete', 'Farofa da casa'])
    )

    expect(sabado).toBeDefined()
    expect(sabado?.status).toBe('published')
    expect(sabado?.carnePrincipal).toContain('Fraldinha Extra Grill')

    expect(costelaDraft).toBeDefined()
    expect(costelaDraft?.status).toBe('draft')
    expect(costelaDraft?.precoLanche).toBeNull()
    expect(costelaDraft?.precoPorcao).toBeNull()
    expect(costelaDraft?.carnePrincipal).toBe(
      'Costela bovina fatiada, porcionada com mandioca na manteiga, vinagrete e picles'
    )
  })

  it('deve permitir alternar receitas históricas (BC-069 a BC-072) sem recriar o cardápio', () => {
    expect(HISTORICAL_GREEK_RECIPES.map((r) => r.codigo)).toEqual([
      'BC-069',
      'BC-070',
      'BC-071',
      'BC-072',
    ])

    const quintaBase = DEFAULT_GREEK_BBQ_PROGRAMS[0]
    const updatedWithCupim = applyHistoricalRecipeToProgram(quintaBase, 'BC-070')

    expect(updatedWithCupim.carnePrincipal).toContain('Cupim')
    expect(updatedWithCupim.ingredientes).toContain('abacaxi ao mel')
    expect(updatedWithCupim.produtosAssociados).toContain('BC-070')
    expect(updatedWithCupim.opcoesLanche.length).toBe(quintaBase.opcoesLanche.length)
  })
})
