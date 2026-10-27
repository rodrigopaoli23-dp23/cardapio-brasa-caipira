import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  RECOVERY_TOKENS_STORAGE_KEY,
  ADMIN_AUTH_STORAGE_KEY,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_DEMO_PASSWORD,
  RECOVERY_TOKEN_TTL_MS,
  clearSecurityStorage,
  requestPasswordRecoveryToken,
  resetPasswordWithToken,
  verifyAdminCredentials,
  verifyAdminReauthentication,
  getPersistenceAuditReport,
  loadAdminAuthRecord,
  loadRecoveryTokens,
} from '../src/lib/securityAndAuth'

describe('Agente 6 — Segurança, Recuperação de Senha e Auditoria de Persistência', () => {
  beforeEach(() => {
    clearSecurityStorage()
    vi.useRealTimers()
  })

  afterEach(() => {
    clearSecurityStorage()
    vi.useRealTimers()
  })

  describe('Solicitação de Token de Recuperação (requestPasswordRecoveryToken)', () => {
    it('deve gerar token temporário com validade de 15 minutos e JAMAIS expor a senha atual em texto aberto', () => {
      const now = Date.now()
      const res = requestPasswordRecoveryToken(DEFAULT_ADMIN_EMAIL)

      expect(res.success).toBe(true)
      expect(res.token).toBeDefined()
      expect(res.token).toMatch(/^BC-REC-[0-9A-F]{12}$/)
      expect(res.expiresAt).toBeDefined()
      expect(res.expiresAt! - now).toBeGreaterThanOrEqual(RECOVERY_TOKEN_TTL_MS - 1000)
      expect(res.expiresAt! - now).toBeLessThanOrEqual(RECOVERY_TOKEN_TTL_MS + 2000)

      // Garante que a resposta NUNCA contém a senha atual em texto aberto
      expect(JSON.stringify(res)).not.toContain(DEFAULT_DEMO_PASSWORD)

      // Verifica que foi salvo na chave brasa_caipira_recovery_tokens_v1
      const storedTokens = loadRecoveryTokens()
      expect(storedTokens.length).toBe(1)
      expect(storedTokens[0].token).toBe(res.token)
      expect(storedTokens[0].used).toBe(false)
      expect(RECOVERY_TOKENS_STORAGE_KEY).toBe('brasa_caipira_recovery_tokens_v1')
    })

    it('deve rejeitar e-mail inválido ou diferente do e-mail administrativo cadastrado', () => {
      const invalidFormat = requestPasswordRecoveryToken('email-invalido')
      expect(invalidFormat.success).toBe(false)
      expect(invalidFormat.token).toBeUndefined()

      const wrongEmail = requestPasswordRecoveryToken('outro@dominio.com.br')
      expect(wrongEmail.success).toBe(false)
      expect(wrongEmail.token).toBeUndefined()
    })
  })

  describe('Redefinição de Senha com Token (resetPasswordWithToken) e Login (verifyAdminCredentials)', () => {
    it('deve redefinir a senha com token válido, salvar apenas hash em brasa_caipira_admin_auth_v1 e invalidar o token para reuso', () => {
      // Antes da redefinição, credencial padrão funciona
      expect(
        verifyAdminCredentials(DEFAULT_ADMIN_EMAIL, DEFAULT_DEMO_PASSWORD).authenticated
      ).toBe(true)

      const recovery = requestPasswordRecoveryToken(DEFAULT_ADMIN_EMAIL)
      expect(recovery.success).toBe(true)
      const token = recovery.token!

      // Redefine para nova senha segura
      const resetRes = resetPasswordWithToken(token, 'NovaBrasa@2026')
      expect(resetRes.success).toBe(true)

      // Verifica que a senha antiga NÃO autentica mais e a nova autentica imediatamente
      expect(
        verifyAdminCredentials(DEFAULT_ADMIN_EMAIL, DEFAULT_DEMO_PASSWORD).authenticated
      ).toBe(false)
      const newLogin = verifyAdminCredentials(DEFAULT_ADMIN_EMAIL, 'NovaBrasa@2026')
      expect(newLogin.authenticated).toBe(true)
      expect(newLogin.role).toBe('admin')

      // Verifica que o registro salvo em brasa_caipira_admin_auth_v1 NUNCA guarda a senha em texto aberto
      expect(ADMIN_AUTH_STORAGE_KEY).toBe('brasa_caipira_admin_auth_v1')
      const savedAuth = loadAdminAuthRecord()
      expect(savedAuth).not.toBeNull()
      expect(savedAuth!.passwordHash).toContain('sha256$')
      expect(savedAuth!.passwordHash).not.toContain('NovaBrasa@2026')
      expect(JSON.stringify(savedAuth)).not.toContain('NovaBrasa@2026')

      // Tentativa de reutilizar o mesmo token deve falhar imediatamente
      const reuseAttempt = resetPasswordWithToken(token, 'OutraSenha999')
      expect(reuseAttempt.success).toBe(false)
      expect(reuseAttempt.error).toContain('já foi utilizado')
    })

    it('deve rejeitar token inexistente, token expirado (> 15 min) ou nova senha fraca (< 6 caracteres)', () => {
      vi.useFakeTimers()
      const start = new Date('2026-10-26T20:00:00Z').getTime()
      vi.setSystemTime(start)

      const recovery = requestPasswordRecoveryToken(DEFAULT_ADMIN_EMAIL)
      const token = recovery.token!

      // Senha curta (< 6 caracteres)
      const weakPass = resetPasswordWithToken(token, '12345')
      expect(weakPass.success).toBe(false)
      expect(weakPass.error).toContain('mínimo 6 caracteres')

      // Token inválido
      const badToken = resetPasswordWithToken('BC-REC-000000000000', 'SenhaValida123')
      expect(badToken.success).toBe(false)
      expect(badToken.error).toContain('inválido')

      // Avança o relógio em 16 minutos para expirar o token
      vi.setSystemTime(start + 16 * 60 * 1000)
      const expiredAttempt = resetPasswordWithToken(token, 'SenhaValida123')
      expect(expiredAttempt.success).toBe(false)
      expect(expiredAttempt.error).toContain('expirou')
    })
  })

  describe('Reautenticação Administrativa para Alterações Críticas (verifyAdminReauthentication)', () => {
    it('deve validar a senha ativa antes e depois da redefinição de senha', () => {
      // Estado inicial (modo demo padrão)
      expect(verifyAdminReauthentication(DEFAULT_DEMO_PASSWORD)).toBe(true)
      expect(verifyAdminReauthentication('senha_errada')).toBe(false)
      expect(verifyAdminReauthentication('')).toBe(false)

      // Após redefinir a senha via token
      const { token } = requestPasswordRecoveryToken(DEFAULT_ADMIN_EMAIL)
      resetPasswordWithToken(token!, 'SegredoForte#99')

      expect(verifyAdminReauthentication(DEFAULT_DEMO_PASSWORD)).toBe(false)
      expect(verifyAdminReauthentication('SegredoForte#99')).toBe(true)
    })
  })

  describe('Relatório de Auditoria de Persistência (getPersistenceAuditReport)', () => {
    it('deve identificar claramente o modo demonstrativo local (local_demo) quando Supabase não está configurado', () => {
      const report = getPersistenceAuditReport({
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      })

      expect(report.mode).toBe('local_demo')
      expect(report.isSupabaseConfigured).toBe(false)
      expect(report.securityWarnings.length).toBeGreaterThan(0)

      // Verifica mapeamento explícito das 5 tabelas PostgreSQL preparadas + localStorage
      expect(report.storageLocations.products).toContain('localStorage')
      expect(report.storageLocations.products).toContain('products')
      expect(report.storageLocations.categories).toContain('categories')
      expect(report.storageLocations.store_settings).toContain('store_settings')
      expect(report.storageLocations.orders).toContain('orders')
      expect(report.storageLocations.product_images).toContain('product_images')
    })

    it('deve identificar o modo supabase_cloud quando NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configurados', () => {
      const cloudReport = getPersistenceAuditReport({
        NEXT_PUBLIC_SUPABASE_URL: 'https://xyzcompany.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validkey',
      })

      expect(cloudReport.mode).toBe('supabase_cloud')
      expect(cloudReport.isSupabaseConfigured).toBe(true)
      expect(cloudReport.securityWarnings).toEqual([])
      expect(cloudReport.storageLocations.products).toContain('Supabase PostgreSQL')
      expect(cloudReport.storageLocations.orders).toContain('orders')
    })
  })
})
