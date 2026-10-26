/**
 * BRASA CAIPIRA — Módulo de Horários e Disponibilidade
 * Fuso horário: America/Sao_Paulo
 * 
 * Regra de Negócio Obrigatória:
 * Produtos sem dias ou horários expressamente cadastrados NÃO são considerados
 * disponíveis todos os dias. Devem ser tratados como "Horário sob consulta" e
 * ter a compra direta desativada até que o administrador configure seus dias de venda.
 */

import { Product, DayOfWeek } from '@/types/database.types'

const TIMEZONE = 'America/Sao_Paulo'

export interface AvailabilityResult {
  isAvailable: boolean
  badgeText: string
  reason?: string
}

/**
 * Mapeia o índice do getDay() do JavaScript (0 = domingo, 1 = segunda, etc.)
 * para o enum DayOfWeek.
 */
export function getDayOfWeekFromIndex(index: number): DayOfWeek {
  const map: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  return map[index] ?? 'monday'
}

/**
 * Traduz o DayOfWeek para exibição em português.
 */
export function translateDayOfWeek(day: DayOfWeek): string {
  const map: Record<DayOfWeek, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  }
  return map[day]
}

/**
 * Retorna data/hora atual no fuso de São Paulo.
 */
export function getCurrentSaoPauloDateTime(customDate?: Date): {
  dayOfWeek: DayOfWeek
  currentMinutes: number // Minutos desde 00:00 (0 a 1439)
  timeString: string
} {
  const now = customDate ?? new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  let weekdayStr = ''
  let hour = 0
  let minute = 0

  for (const part of parts) {
    if (part.type === 'weekday') weekdayStr = part.value.toLowerCase()
    if (part.type === 'hour') hour = parseInt(part.value, 10)
    if (part.type === 'minute') minute = parseInt(part.value, 10)
  }

  const dayMap: Record<string, DayOfWeek> = {
    sunday: 'sunday',
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
  }

  const currentMinutes = hour * 60 + minute
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  return {
    dayOfWeek: dayMap[weekdayStr] ?? 'wednesday',
    currentMinutes,
    timeString,
  }
}

/**
 * Converte string "HH:MM" para minutos desde o início do dia.
 */
export function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10))
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

/**
 * Avalia se um produto está efetivamente disponível para compra no momento.
 */
export function checkProductAvailability(
  product: Product,
  currentDate?: Date
): AvailabilityResult {
  // 1. Verificação de Tipo
  if (product.product_type !== 'commercial') {
    return {
      isAvailable: false,
      badgeText: 'Não comercializável',
      reason: 'Item interno, adicional ou receita histórica.',
    }
  }

  // 2. Verificação de Publicação
  if (product.status !== 'published') {
    return {
      isAvailable: false,
      badgeText: 'Não publicado',
      reason: 'Produto ainda não liberado pelo administrador.',
    }
  }

  // 3. Verificação de Preço
  if (product.base_price_cents === null || product.base_price_cents <= 0) {
    return {
      isAvailable: false,
      badgeText: 'Preço a confirmar',
      reason: 'Produto com precificação pendente.',
    }
  }

  // 4. Verificação de Estoque Operacional
  if (product.availability_status === 'out_of_stock') {
    return {
      isAvailable: false,
      badgeText: 'Esgotado hoje',
      reason: 'Item pausado manualmente pelo estabelecimento.',
    }
  }

  if (product.availability_status === 'pre_order_only') {
    return {
      isAvailable: true,
      badgeText: 'Apenas sob encomenda',
      reason: 'Este item requer reserva antecipada.',
    }
  }

  // 5. REGRA RESTRITIVA OBRIGATÓRIA: Checagem de Dias Configurados
  const days = product.schedule.available_days
  if (!days || days.length === 0) {
    return {
      isAvailable: false,
      badgeText: 'Horário sob consulta',
      reason: 'Dias de venda não configurados para este produto.',
    }
  }

  const { dayOfWeek, currentMinutes } = getCurrentSaoPauloDateTime(currentDate)

  // Verifica se hoje é um dos dias permitidos
  if (!days.includes(dayOfWeek)) {
    const formattedDays = days.map(translateDayOfWeek).join(', ')
    return {
      isAvailable: false,
      badgeText: `Vende apenas: ${formattedDays}`,
      reason: `Disponível em: ${formattedDays}`,
    }
  }

  // 6. Checagem de Horários (se houver restrição horária)
  if (product.schedule.is_time_restricted) {
    const startMin = parseTimeToMinutes(product.schedule.start_time)
    const endMin = parseTimeToMinutes(product.schedule.end_time)

    if (startMin !== null && endMin !== null) {
      if (currentMinutes < startMin || currentMinutes > endMin) {
        return {
          isAvailable: false,
          badgeText: `Horário: ${product.schedule.start_time} às ${product.schedule.end_time}`,
          reason: `Disponível apenas entre ${product.schedule.start_time} e ${product.schedule.end_time}.`,
        }
      }
    }
  }

  // Produto 100% elegível e disponível no momento!
  return {
    isAvailable: true,
    badgeText: 'Disponível',
  }
}
