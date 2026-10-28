/**
 * BRASA CAIPIRA — Sincronização com a Nuvem (Supabase)
 *
 * Estratégia:
 * - Cada módulo continua salvando no localStorage (cache rápido do aparelho).
 * - Toda gravação também é espelhada na tabela `store_settings` (coluna `data` JSONB,
 *   identificada pela coluna `key`), tornando-se a fonte oficial para TODOS os aparelhos.
 * - Fotos em Base64 (data:image/...) são comprimidas e enviadas ao bucket público
 *   `product-images`; no JSON fica apenas a URL pública (leve e rápida).
 * - Pedidos são gravados um por linha (`order:<id>`) para evitar conflitos entre clientes.
 * - O login administrativo usa o Supabase Auth (senha verificada no servidor).
 *
 * Sem as variáveis NEXT_PUBLIC_SUPABASE_* (ex.: testes locais), tudo vira no-op.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbaefutcpkplpggtkzxu.supabase.co'
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_nMJT4dF_UqZ-hzQ46VxOOw_j6_aWMtB'

export const PHOTOS_STORAGE_KEY = 'brasa_caipira_product_photos_v1'
export const ORDERS_CLOUD_LOCAL_KEY = 'brasa_caipira_orders_v1'
const ORDER_KEY_PREFIX = 'order:'
const SETTINGS_TABLE = 'store_settings'
const IMAGES_BUCKET = 'product-images'

/** Chaves do localStorage espelhadas integralmente na nuvem. */
export const SYNCED_KEYS = [
  'brasa_caipira_catalog_v1',
  'brasa_caipira_categories_v1',
  'brasa_caipira_store_identity_v1',
  'brasa_caipira_weekly_schedule_v1',
  'brasa_caipira_greek_bbq_v1',
  'brasa_caipira_hero_banner_v1',
  PHOTOS_STORAGE_KEY,
] as const

export type CloudStatus =
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; message: string }

export const CLOUD_STATUS_EVENT = 'brasa-cloud-status'
export const CLOUD_DATA_EVENT = 'brasa-cloud-data'

export function isCloudEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY) && typeof window !== 'undefined'
}

let clientPromise: Promise<SupabaseClient> | null = null

export function getCloudClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@/lib/supabase/client').then(
      (mod) => mod.createClient() as unknown as SupabaseClient
    )
  }
  return clientPromise
}

function emit(eventName: string, detail: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
  } catch {
    // Ambiente sem CustomEvent
  }
}

function describeError(err: unknown): string {
  if (!err) return 'Erro desconhecido'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

// ==============================================================================
// FOTOS: compressão + upload para o Storage
// ==============================================================================

const uploadedCache = new Map<string, string>()

function dataUrlFingerprint(dataUrl: string): string {
  return `${dataUrl.length}:${dataUrl.slice(30, 120)}:${dataUrl.slice(-96)}`
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Reduz fotos de câmera (3–8 MB) para ~200–500 KB mantendo boa qualidade.
 * PNG (ex.: logotipo com transparência) vira WebP para preservar o fundo transparente.
 */
async function compressImage(dataUrl: string, maxDim = 1600): Promise<Blob> {
  const original = dataUrlToBlob(dataUrl)
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(original.type)) return original

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Falha ao ler a imagem'))
      el.src = dataUrl
    })

    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return original
    ctx.drawImage(img, 0, 0, width, height)

    const isPng = /png/i.test(original.type)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, isPng ? 'image/webp' : 'image/jpeg', 0.82)
    )
    if (!blob) return original
    return blob.size < original.size ? blob : original
  } catch {
    return original
  }
}

async function uploadDataUrl(dataUrl: string): Promise<string> {
  const fp = dataUrlFingerprint(dataUrl)
  const cached = uploadedCache.get(fp)
  if (cached) return cached

  const supabase = await getCloudClient()
  const blob = await compressImage(dataUrl)
  const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg'
  const now = new Date()
  const path = `uploads/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}/${now.getTime()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(`Falha no envio da foto: ${error.message}`)

  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path)
  uploadedCache.set(fp, data.publicUrl)
  return data.publicUrl
}

/** Percorre qualquer JSON e troca fotos Base64 por URLs públicas do Storage. */
async function replaceDataUrls(value: unknown): Promise<{ value: unknown; replaced: boolean }> {
  let replaced = false

  const walk = async (node: unknown): Promise<unknown> => {
    if (typeof node === 'string') {
      if (node.startsWith('data:image/')) {
        replaced = true
        return uploadDataUrl(node)
      }
      return node
    }
    if (Array.isArray(node)) {
      const out: unknown[] = []
      for (const item of node) out.push(await walk(item))
      return out
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = await walk(v)
      }
      return out
    }
    return node
  }

  const result = await walk(value)
  return { value: result, replaced }
}

// ==============================================================================
// GRAVAÇÃO (localStorage -> nuvem)
// ==============================================================================

const pendingValues = new Map<string, unknown>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
let inFlight = 0

async function flushKey(key: string): Promise<void> {
  if (!pendingValues.has(key)) return
  const value = pendingValues.get(key)
  pendingValues.delete(key)
  inFlight += 1
  emit(CLOUD_STATUS_EVENT, { state: 'saving' } satisfies CloudStatus)

  try {
    const supabase = await getCloudClient()
    const { value: cleaned, replaced } = await replaceDataUrls(value)

    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert(
        { key, data: cleaned, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    if (error) throw error

    if (replaced) {
      try {
        window.localStorage.setItem(key, JSON.stringify(cleaned))
      } catch {
        // Ignora quota
      }
      emit(CLOUD_DATA_EVENT, { key })
    }

    inFlight -= 1
    if (inFlight === 0) emit(CLOUD_STATUS_EVENT, { state: 'saved' } satisfies CloudStatus)
  } catch (err) {
    inFlight -= 1
    const message = describeError(err)
    const friendly = /row-level security|permission|JWT|not authorized|401|403/i.test(message)
      ? 'Sessão de administrador expirada ou sem permissão. Saia e entre novamente no painel.'
      : message
    emit(CLOUD_STATUS_EVENT, { state: 'error', message: friendly } satisfies CloudStatus)
  }
}

/**
 * Agenda o envio de uma chave para a nuvem (debounce de 400 ms por chave).
 * Seguro para chamar em qualquer ambiente: sem Supabase configurado não faz nada.
 */
export function pushToCloud(key: string, value: unknown): void {
  if (!isCloudEnabled()) return
  pendingValues.set(key, value)
  const existing = pendingTimers.get(key)
  if (existing) clearTimeout(existing)
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingTimers.delete(key)
      void flushKey(key)
    }, 400)
  )
}

/** Registra um novo pedido feito pelo cliente (insert simples — permitido para visitantes). */
export function pushNewOrderToCloud(order: { id: string }): void {
  if (!isCloudEnabled() || !order?.id) return
  void (async () => {
    try {
      const supabase = await getCloudClient()
      await supabase.from(SETTINGS_TABLE).insert({
        key: `${ORDER_KEY_PREFIX}${order.id}`,
        data: order,
        updated_at: new Date().toISOString(),
      })
    } catch {
      // O pedido segue normalmente pelo WhatsApp mesmo se a nuvem falhar
    }
  })()
}

/** Atualiza pedidos existentes (uso do administrador autenticado). */
export function pushOrdersToCloud(orders: { id: string; updatedAt?: string }[]): void {
  if (!isCloudEnabled() || !Array.isArray(orders) || orders.length === 0) return
  void (async () => {
    try {
      const supabase = await getCloudClient()
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) return // Visitantes não alteram pedidos existentes
      const rows = orders.map((o) => ({
        key: `${ORDER_KEY_PREFIX}${o.id}`,
        data: o,
        updated_at: o.updatedAt || new Date().toISOString(),
      }))
      const { error } = await supabase.from(SETTINGS_TABLE).upsert(rows, { onConflict: 'key' })
      if (error) throw error
    } catch (err) {
      emit(CLOUD_STATUS_EVENT, { state: 'error', message: describeError(err) } satisfies CloudStatus)
    }
  })()
}

// ==============================================================================
// LEITURA (nuvem -> localStorage)
// ==============================================================================

/**
 * Baixa a versão oficial da nuvem e grava no localStorage do aparelho.
 * Retorna `true` se algum dado local foi alterado.
 */
export async function pullCloudToLocal(options: { includeOrders?: boolean } = {}): Promise<boolean> {
  if (!isCloudEnabled()) return false
  let changed = false

  try {
    const supabase = await getCloudClient()
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('key,data')
      .in('key', SYNCED_KEYS as unknown as string[])
    if (error) throw error

    for (const row of data || []) {
      if (row?.data === null || row?.data === undefined) continue
      const serialized = JSON.stringify(row.data)
      try {
        if (window.localStorage.getItem(row.key) !== serialized) {
          window.localStorage.setItem(row.key, serialized)
          changed = true
        }
      } catch {
        // Ignora quota
      }
    }

    if (options.includeOrders) {
      const { data: orderRows, error: ordersError } = await supabase
        .from(SETTINGS_TABLE)
        .select('key,data')
        .like('key', `${ORDER_KEY_PREFIX}%`)
        .order('updated_at', { ascending: false })
        .limit(1000)
      if (!ordersError && orderRows) {
        type OrderLike = { id: string; createdAt?: string; updatedAt?: string }
        let localOrders: OrderLike[] = []
        try {
          const raw = window.localStorage.getItem(ORDERS_CLOUD_LOCAL_KEY)
          const parsed = raw ? JSON.parse(raw) : []
          localOrders = Array.isArray(parsed) ? parsed : []
        } catch {
          localOrders = []
        }

        const merged = new Map<string, OrderLike>()
        for (const o of localOrders) if (o?.id) merged.set(o.id, o)
        for (const row of orderRows) {
          const cloudOrder = row.data as OrderLike
          if (!cloudOrder?.id) continue
          const local = merged.get(cloudOrder.id)
          const cloudTime = new Date(cloudOrder.updatedAt || cloudOrder.createdAt || 0).getTime()
          const localTime = local ? new Date(local.updatedAt || local.createdAt || 0).getTime() : -1
          if (!local || cloudTime >= localTime) merged.set(cloudOrder.id, cloudOrder)
        }

        const list = Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        const serialized = JSON.stringify(list)
        try {
          if (window.localStorage.getItem(ORDERS_CLOUD_LOCAL_KEY) !== serialized) {
            window.localStorage.setItem(ORDERS_CLOUD_LOCAL_KEY, serialized)
            changed = true
          }
        } catch {
          // Ignora quota
        }
      }
    }
  } catch (err) {
    emit(CLOUD_STATUS_EVENT, {
      state: 'error',
      message: `Não foi possível carregar os dados da nuvem: ${describeError(err)}`,
    } satisfies CloudStatus)
  }

  return changed
}

// ==============================================================================
// AUTENTICAÇÃO REAL DO ADMINISTRADOR (Supabase Auth)
// ==============================================================================

export async function cloudSignIn(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await getCloudClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      return {
        ok: false,
        error: /invalid login credentials/i.test(error.message)
          ? 'E-mail ou senha incorretos.'
          : error.message,
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}

export async function cloudHasSession(): Promise<boolean> {
  if (!isCloudEnabled()) return false
  try {
    const supabase = await getCloudClient()
    const { data } = await supabase.auth.getSession()
    return Boolean(data.session)
  } catch {
    return false
  }
}

export async function cloudSignOut(): Promise<void> {
  if (!isCloudEnabled()) return
  try {
    const supabase = await getCloudClient()
    await supabase.auth.signOut()
  } catch {
    // Ignora
  }
}

export async function cloudChangePassword(
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' }
  }
  try {
    const supabase = await getCloudClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}
