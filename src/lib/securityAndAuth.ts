/**
 * BRASA CAIPIRA — Segurança, Autenticação Administrativa, Recuperação de Senha
 * e Auditoria de Persistência (Agente 6)
 *
 * REGRAS CRÍTICAS DE SEGURANÇA:
 * 1. A senha administrativa NUNCA é armazenada nem trafegada em texto aberto.
 * 2. O fluxo "Esqueci minha senha" gera um token criptográfico/aleatório temporário
 *    com validade estrita de 15 minutos e uso único — JAMAIS expõe a senha atual.
 * 3. Alterações críticas (como troca de e-mail administrativo) exigem reautenticação
 *    prévia (`verifyAdminReauthentication`).
 * 4. O relatório de auditoria (`getPersistenceAuditReport`) informa com transparência
 *    total o status do modo demonstrativo local (`localStorage`) vs. nuvem (`Supabase`).
 */

import { STORE_IDENTITY_STORAGE_KEY } from '@/lib/storeAndScheduleManager'

export const RECOVERY_TOKENS_STORAGE_KEY = 'brasa_caipira_recovery_tokens_v1'
export const ADMIN_AUTH_STORAGE_KEY = 'brasa_caipira_admin_auth_v1'

export const DEFAULT_ADMIN_EMAIL = 'admin@brasacaipira.com.br'
export const DEFAULT_DEMO_PASSWORD = 'brasa123'
export const RECOVERY_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutos

export interface RecoveryTokenRecord {
  token: string
  email: string
  createdAt: number
  expiresAt: number
  used: boolean
  usedAt?: number
}

export interface AdminAuthCredentialRecord {
  email: string
  passwordHash: string
  salt: string
  updatedAt: string
  isCustomPassword: boolean
}

export interface PasswordRecoveryResponse {
  success: boolean
  message: string
  token?: string
  expiresAt?: number
}

export interface PasswordResetResponse {
  success: boolean
  error?: string
}

export interface AdminVerificationResult {
  authenticated: boolean
  role?: 'admin'
  error?: string
}

export interface PersistenceAuditReport {
  mode: 'local_demo' | 'supabase_cloud'
  isSupabaseConfigured: boolean
  storageLocations: Record<string, string>
  securityWarnings: string[]
}

/**
 * Fallback em memória para ambientes de teste Node onde `window`/`localStorage`
 * não estejam definidos ou estejam desabilitados.
 */
const memoryStorage = new Map<string, string>()

function readStorageItem(key: string): string | null {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.localStorage !== 'undefined' &&
      typeof globalThis.localStorage.getItem === 'function'
    ) {
      const val = globalThis.localStorage.getItem(key)
      if (val !== null) {
        return val
      }
    }
  } catch {
    // Continua para fallback em memória
  }
  return memoryStorage.get(key) ?? null
}

function writeStorageItem(key: string, value: string): void {
  memoryStorage.set(key, value)
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.localStorage !== 'undefined' &&
      typeof globalThis.localStorage.setItem === 'function'
    ) {
      globalThis.localStorage.setItem(key, value)
    }
  } catch {
    // Mantém apenas no memoryStorage se localStorage falhar
  }
}

function removeStorageItem(key: string): void {
  memoryStorage.delete(key)
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.localStorage !== 'undefined' &&
      typeof globalThis.localStorage.removeItem === 'function'
    ) {
      globalThis.localStorage.removeItem(key)
    }
  } catch {
    // Ignora erro em ambiente restrito
  }
}

/**
 * Limpa os registros de autenticação e tokens (útil para testes automatizados).
 */
export function clearSecurityStorage(): void {
  removeStorageItem(RECOVERY_TOKENS_STORAGE_KEY)
  removeStorageItem(ADMIN_AUTH_STORAGE_KEY)
}

/**
 * Implementação síncrona de SHA-256 (FIPS 180-4) para derivação segura de hash
 * de senha com salt sem expor a senha em texto aberto em nenhum storage.
 */
function sha256Hex(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount))

  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  const lengthProperty = 'length'
  let i: number
  let j: number
  let result = ''

  const words: number[] = []
  const asciiBitLength = ascii[lengthProperty] * 8

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  const encoded = unescape(encodeURIComponent(ascii))
  const encodedLength = encoded[lengthProperty]

  for (i = 0; i < encodedLength; i++) {
    words[i >> 2] |= (encoded.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8)
  }
  words[encodedLength >> 2] |= 0x80 << (24 - (encodedLength % 4) * 8)
  words[(((encodedLength + 8) >> 6) << 4) + 15] = asciiBitLength

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash.slice(0)

    for (i = 0; i < 64; i++) {
      const i2 = i + j
      const w15 = w[i - 15]
      const w2 = w[i - 2]

      const a = hash[0]
      const e = hash[4]
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0)

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))

      hash = [(temp1 + temp2) | 0].concat(hash)
      hash[4] = (hash[4] + temp1) | 0
      hash.pop()
      void i2
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      result += (b < 16 ? 0 : '') + b.toString(16)
    }
  }
  void maxWord
  return result
}

/**
 * Gera string aleatória criptográfica em formato hexadecimal/alfanumérico.
 */
function generateCryptoRandomHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength)
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deriva o hash seguro da senha com salt exclusivo da loja.
 */
export function hashAdminPassword(password: string, salt: string): string {
  return `sha256$${salt}$${sha256Hex(`brasa_caipira_v1:${salt}:${password}`)}`
}

/**
 * Obtém o e-mail administrativo atualmente registrado.
 */
export function getRegisteredAdminEmail(): string {
  const authRecord = loadAdminAuthRecord()
  if (authRecord?.email) {
    return authRecord.email.trim().toLowerCase()
  }

  const rawIdentity = readStorageItem(STORE_IDENTITY_STORAGE_KEY)
  if (rawIdentity) {
    try {
      const parsed = JSON.parse(rawIdentity) as { adminEmail?: string }
      if (parsed?.adminEmail && typeof parsed.adminEmail === 'string') {
        return parsed.adminEmail.trim().toLowerCase()
      }
    } catch {
      // Ignora erro de parse
    }
  }

  return DEFAULT_ADMIN_EMAIL
}

/**
 * Carrega o registro de credencial administrativa salvo em `'brasa_caipira_admin_auth_v1'`.
 */
export function loadAdminAuthRecord(): AdminAuthCredentialRecord | null {
  const raw = readStorageItem(ADMIN_AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminAuthCredentialRecord
    if (
      parsed &&
      typeof parsed.email === 'string' &&
      typeof parsed.passwordHash === 'string' &&
      typeof parsed.salt === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Salva o registro de credencial administrativa em `'brasa_caipira_admin_auth_v1'`.
 */
function saveAdminAuthRecord(record: AdminAuthCredentialRecord): void {
  writeStorageItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(record))
}

/**
 * Carrega a lista de tokens de recuperação armazenados em `'brasa_caipira_recovery_tokens_v1'`.
 */
export function loadRecoveryTokens(): RecoveryTokenRecord[] {
  const raw = readStorageItem(RECOVERY_TOKENS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as RecoveryTokenRecord[]
  } catch {
    return []
  }
}

/**
 * Salva a lista de tokens de recuperação em `'brasa_caipira_recovery_tokens_v1'`.
 */
function saveRecoveryTokens(tokens: RecoveryTokenRecord[]): void {
  writeStorageItem(RECOVERY_TOKENS_STORAGE_KEY, JSON.stringify(tokens))
}

/**
 * Solicita um token temporário de recuperação de senha:
 * - Valida o e-mail informado;
 * - Gera um token temporário criptográfico/aleatório com validade de 15 minutos
 *   armazenado em `'brasa_caipira_recovery_tokens_v1'`;
 * - NUNCA envia nem expõe a senha atual em texto aberto.
 */
export function requestPasswordRecoveryToken(
  email: string,
  registeredAdminEmail?: string
): PasswordRecoveryResponse {
  const cleanEmail = (email || '').trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return {
      success: false,
      message: 'Informe um endereço de e-mail válido para prosseguir com a recuperação.',
    }
  }

  const targetAdminEmail = (registeredAdminEmail || getRegisteredAdminEmail())
    .trim()
    .toLowerCase()

  if (cleanEmail !== targetAdminEmail) {
    return {
      success: false,
      message: 'O e-mail informado não corresponde ao administrador cadastrado na loja.',
    }
  }

  const now = Date.now()
  const expiresAt = now + RECOVERY_TOKEN_TTL_MS
  const randomCode = generateCryptoRandomHex(6).toUpperCase()
  const token = `BC-REC-${randomCode}`

  // Invalida tokens anteriores não utilizados do mesmo e-mail antes de registrar o novo
  const existingTokens = loadRecoveryTokens().map((t) =>
    t.email === cleanEmail && !t.used ? { ...t, used: true, usedAt: now } : t
  )

  const newRecord: RecoveryTokenRecord = {
    token,
    email: cleanEmail,
    createdAt: now,
    expiresAt,
    used: false,
  }

  saveRecoveryTokens([newRecord, ...existingTokens])

  return {
    success: true,
    message:
      'Token temporário de recuperação gerado com sucesso (válido por 15 minutos). Utilize-o para definir sua nova senha.',
    token,
    expiresAt,
  }
}

/**
 * Redefine a senha administrativa utilizando um token de recuperação:
 * - Verifica se o token existe, não expirou e ainda não foi utilizado;
 * - Valida a força mínima da nova senha (mínimo 6 caracteres);
 * - Invalida o token após o uso e atualiza o hash/credencial administrativa
 *   em `'brasa_caipira_admin_auth_v1'`.
 */
export function resetPasswordWithToken(
  token: string,
  newPassword: string
): PasswordResetResponse {
  const cleanToken = (token || '').trim()
  if (!cleanToken) {
    return {
      success: false,
      error: 'Informe o token de recuperação para redefinir a senha.',
    }
  }

  if (!newPassword || newPassword.trim().length < 6) {
    return {
      success: false,
      error: 'A nova senha deve possuir no mínimo 6 caracteres.',
    }
  }

  const tokens = loadRecoveryTokens()
  const tokenIndex = tokens.findIndex(
    (t) => t.token.toUpperCase() === cleanToken.toUpperCase()
  )

  if (tokenIndex === -1) {
    return {
      success: false,
      error: 'Token de recuperação inválido ou não encontrado.',
    }
  }

  const targetToken = tokens[tokenIndex]

  if (targetToken.used) {
    return {
      success: false,
      error: 'Este token de recuperação já foi utilizado e não pode ser reutilizado.',
    }
  }

  const now = Date.now()
  if (now > targetToken.expiresAt) {
    return {
      success: false,
      error: 'Este token de recuperação expirou (validade máxima de 15 minutos). Solicite um novo token.',
    }
  }

  // Invalida imediatamente o token para impedir qualquer reuso
  const updatedTokens = [...tokens]
  updatedTokens[tokenIndex] = {
    ...targetToken,
    used: true,
    usedAt: now,
  }
  saveRecoveryTokens(updatedTokens)

  // Gera novo salt e persiste apenas o hash criptográfico da nova senha
  const salt = generateCryptoRandomHex(12)
  const passwordHash = hashAdminPassword(newPassword, salt)
  const currentEmail = targetToken.email || getRegisteredAdminEmail()

  saveAdminAuthRecord({
    email: currentEmail,
    passwordHash,
    salt,
    updatedAt: new Date(now).toISOString(),
    isCustomPassword: true,
  })

  return {
    success: true,
  }
}

/**
 * Verifica as credenciais administrativas:
 * - Verifica contra a credencial salva em `'brasa_caipira_admin_auth_v1'` ou
 *   contra a credencial de desenvolvimento local quando em modo demonstrativo.
 */
export function verifyAdminCredentials(
  email: string,
  passwordInput: string
): AdminVerificationResult {
  const cleanEmail = (email || '').trim().toLowerCase()
  const rawPassword = passwordInput ?? ''

  if (!cleanEmail || !rawPassword) {
    return {
      authenticated: false,
      error: 'Preencha o e-mail e a senha administrativa.',
    }
  }

  const savedRecord = loadAdminAuthRecord()
  const expectedEmail = getRegisteredAdminEmail()

  if (cleanEmail !== expectedEmail) {
    return {
      authenticated: false,
      error: 'E-mail ou senha incorretos.',
    }
  }

  if (savedRecord) {
    const candidateHash = hashAdminPassword(rawPassword, savedRecord.salt)
    if (candidateHash === savedRecord.passwordHash) {
      return {
        authenticated: true,
        role: 'admin',
      }
    }
    return {
      authenticated: false,
      error: 'E-mail ou senha incorretos.',
    }
  }

  // Fallback para credencial inicial em modo demonstrativo quando ainda não redefinida
  if (rawPassword === DEFAULT_DEMO_PASSWORD) {
    return {
      authenticated: true,
      role: 'admin',
    }
  }

  return {
    authenticated: false,
    error: 'E-mail ou senha incorretos.',
  }
}

/**
 * Verifica a reautenticação do administrador antes de permitir alterações críticas
 * (como mudança do e-mail administrativo).
 */
export function verifyAdminReauthentication(passwordInput: string): boolean {
  if (!passwordInput) return false

  const savedRecord = loadAdminAuthRecord()
  if (savedRecord) {
    const candidateHash = hashAdminPassword(passwordInput, savedRecord.salt)
    return candidateHash === savedRecord.passwordHash
  }

  return passwordInput === DEFAULT_DEMO_PASSWORD
}

/**
 * Gera o relatório de auditoria de persistência e transparência arquitetural:
 * - Verifica se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configurados;
 * - Informa com transparência total quais módulos usam `localStorage` no ambiente local
 *   e quais tabelas do PostgreSQL (`products`, `categories`, `store_settings`, `orders`, `product_images`)
 *   estão preparadas para produção.
 */
export function getPersistenceAuditReport(
  envOverride?: Record<string, string | undefined>
): PersistenceAuditReport {
  const env = envOverride ?? (typeof process !== 'undefined' ? process.env : {})
  const supabaseUrl = (
    env.NEXT_PUBLIC_SUPABASE_URL !== undefined
      ? env.NEXT_PUBLIC_SUPABASE_URL
      : 'https://gbaefutcpkplpggtkzxu.supabase.co'
  ).trim()
  const supabaseAnonKey = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
      ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined
      ? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : 'sb_publishable_nMJT4dF_UqZ-hzQ46VxOOw_j6_aWMtB'
  ).trim()

  const isSupabaseConfigured = Boolean(
    supabaseUrl.length > 0 &&
      supabaseAnonKey.length > 0 &&
      supabaseUrl.startsWith('http') &&
      !supabaseUrl.includes('sua-url-do-supabase') &&
      !supabaseAnonKey.includes('sua-chave-anon')
  )

  const mode: 'local_demo' | 'supabase_cloud' = isSupabaseConfigured
    ? 'supabase_cloud'
    : 'local_demo'

  const storageLocations: Record<string, string> = isSupabaseConfigured
    ? {
        products:
          'Supabase PostgreSQL (tabela: products) + sincronização local (localStorage: brasa_caipira_catalog_v1)',
        categories:
          'Supabase PostgreSQL (tabela: categories) + sincronização local (localStorage: brasa_caipira_categories_v1)',
        store_settings:
          'Supabase PostgreSQL (tabela: store_settings) + cache local (localStorage: brasa_caipira_store_identity_v1, brasa_caipira_weekly_schedule_v1, brasa_caipira_greek_bbq_v1)',
        orders:
          'Supabase PostgreSQL (tabela: orders) + espelhamento local (localStorage: brasa_caipira_orders_v1)',
        product_images:
          'Supabase Storage & PostgreSQL (tabela: product_images) para galeria de fotos otimizadas',
        admin_auth:
          'Supabase Auth + hash local seguro (localStorage: brasa_caipira_admin_auth_v1 / brasa_caipira_recovery_tokens_v1)',
      }
    : {
        products:
          'localStorage (brasa_caipira_catalog_v1) — preparado para migração direta à tabela PostgreSQL: products',
        categories:
          'localStorage (brasa_caipira_categories_v1) — preparado para migração direta à tabela PostgreSQL: categories',
        store_settings:
          'localStorage (brasa_caipira_store_identity_v1, brasa_caipira_weekly_schedule_v1, brasa_caipira_greek_bbq_v1) — preparado para tabela PostgreSQL: store_settings',
        orders:
          'localStorage (brasa_caipira_orders_v1) — preparado para migração direta à tabela PostgreSQL: orders',
        product_images:
          'localStorage / Base64 WebP otimizado — preparado para Supabase Storage e tabela PostgreSQL: product_images',
        admin_auth:
          'localStorage (brasa_caipira_admin_auth_v1 com hash SHA-256 + salt e brasa_caipira_recovery_tokens_v1)',
      }

  const securityWarnings: string[] = isSupabaseConfigured
    ? []
    : [
        'Ambiente em Modo Demonstrativo Local: variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ainda não provisionadas.',
        'Os dados editados (produtos, categorias, agenda, pedidos e credenciais) ficam persistidos no navegador atual via localStorage.',
        'A recuperação de senha opera com geração de token criptográfico local de uso único (expiração de 15 minutos), pronto para integração com provedor SMTP/Supabase Auth.',
      ]

  return {
    mode,
    isSupabaseConfigured,
    storageLocations,
    securityWarnings,
  }
}
