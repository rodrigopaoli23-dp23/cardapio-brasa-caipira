'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Mail,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Database,
  X,
} from 'lucide-react'
import {
  verifyAdminCredentials,
  requestPasswordRecoveryToken,
  resetPasswordWithToken,
  getPersistenceAuditReport,
  getRegisteredAdminEmail,
  loadAdminAuthRecord,
   PersistenceAuditReport,
} from '@/lib/securityAndAuth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Estado de Auditoria de Persistência e Credencial Customizada
  const [auditReport, setAuditReport] = useState<PersistenceAuditReport>(() =>
    getPersistenceAuditReport()
  )
  const [hasCustomPassword, setHasCustomPassword] = useState(false)

  // Estados do Modal/Painel "Esqueci minha senha"
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)

  useEffect(() => {
    const report = getPersistenceAuditReport()
    setAuditReport(report)
    const authRecord = loadAdminAuthRecord()
    if (authRecord?.isCustomPassword) {
      setHasCustomPassword(true)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessNotice(null)

    const verification = verifyAdminCredentials(email, password)

    if (verification.authenticated) {
      // Define cookie de sessão administrativa
      document.cookie =
        'admin_session=authenticated; path=/; max-age=86400; SameSite=Lax'
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 400)
    } else {
      setIsLoading(false)
      setError(
        verification.error ||
          'E-mail ou senha incorretos. Verifique suas credenciais ou utilize "Esqueci minha senha".'
      )
    }
  }

  const handleOpenRecovery = () => {
    setIsRecoveryOpen(true)
    setRecoveryError(null)
    setRecoveryMessage(null)
    setGeneratedToken(null)
    setTokenInput('')
    setNewPassword('')
    setConfirmNewPassword('')
    setRecoveryEmail(email || getRegisteredAdminEmail())
  }

  const handleRequestToken = (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError(null)
    setRecoveryMessage(null)

    const result = requestPasswordRecoveryToken(recoveryEmail)
    if (!result.success || !result.token) {
      setRecoveryError(result.message)
      return
    }

    setGeneratedToken(result.token)
    setTokenInput(result.token)
    setRecoveryMessage(result.message)
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError(null)

    if (newPassword !== confirmNewPassword) {
      setRecoveryError('A confirmação de senha não coincide com a nova senha digitada.')
      return
    }

    const result = resetPasswordWithToken(tokenInput, newPassword)
    if (!result.success) {
      setRecoveryError(result.error || 'Não foi possível redefinir a senha.')
      return
    }

    // Atualiza estado da tela de login para uso imediato da nova senha
    setHasCustomPassword(true)
    setEmail(recoveryEmail.trim().toLowerCase())
    setPassword(newPassword)
    setError(null)
    setSuccessNotice(
      'Senha redefinida com sucesso! O token temporário foi invalidado e sua nova senha já está ativa para acesso.'
    )
    setIsRecoveryOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfbf7] px-4 py-10">
      {/* Botão de Retorno ao Cardápio */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-orange-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Cardápio Público
        </Link>

        {/* Identificação discreta e explícita do Modo Demonstrativo Local vs Produção */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
            auditReport.mode === 'local_demo'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          title={
            auditReport.mode === 'local_demo'
              ? 'Persistência ativa via localStorage no navegador atual'
              : 'Conectado ao Supabase Cloud'
          }
        >
          <Database className="h-3 w-3" />
          {auditReport.mode === 'local_demo'
            ? 'Modo Demonstrativo Local'
            : 'Supabase Produção'}
        </span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="mx-auto relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-amber-400 bg-black shadow-md shadow-amber-900/10">
            <Image
              src="/images/brand/logo-oficial.jpg"
              alt="Logotipo Oficial Brasa Caipira"
              fill
              priority
              className="object-contain p-0.5"
            />
          </div>
          <h1 className="mt-3 text-lg font-bold tracking-tight text-stone-900">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Gestão do Cardápio — <strong className="text-stone-800">BRASA CAIPIRA</strong>
          </p>
        </div>



        {/* Aviso de Sucesso ao Redefinir Senha */}
        {successNotice && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              E-mail do Administrador
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-10 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                Senha de Acesso
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-10 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            {/* Link "Esqueci minha senha" logo abaixo do campo de senha */}
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={handleOpenRecovery}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-600 py-3 text-xs font-semibold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Entrando no painel...' : 'Entrar no Painel'}
          </button>
        </form>

        {/* Painel / Modal Integrado de Recuperação de Senha Segura */}
        {isRecoveryOpen && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-stone-800 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <RefreshCw className="h-3.5 w-3.5 text-orange-600" />
                <span>Recuperação Segura de Senha</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-amber-100/60 hover:text-stone-700 transition"
                aria-label="Fechar recuperação de senha"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-stone-600 leading-relaxed">
              Por segurança, a senha antiga <strong>jamais é exibida</strong>. Gere um
              token temporário de uso único (válido por 15 minutos) para definir uma
              nova senha.
            </p>

            {recoveryError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                {recoveryError}
              </div>
            )}

            {/* Etapa 1: Solicitar Token pelo E-mail */}
            {!generatedToken ? (
              <form onSubmit={handleRequestToken} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Confirme o E-mail Administrativo
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="admin@brasacaipira.com.br"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-stone-900 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition"
                >
                  Enviar Token Temporário (15 min)
                </button>
              </form>
            ) : (
              /* Etapa 2: Exibir Banner de Simulação Local (se aplicável) e Redefinir Senha */
              <form onSubmit={handleResetPassword} className="space-y-2.5">
                {recoveryMessage && (
                  <div className="rounded-lg border border-amber-300 bg-white p-2.5 text-[11px] text-stone-700">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Simulação Local de E-mail (Modo Demonstrativo):</span>
                    </div>
                    <p className="mt-1 text-[10px] text-stone-600">
                      Como o provedor SMTP/Supabase Auth ainda não está conectado, utilize
                      o token temporário gerado abaixo:
                    </p>
                    <div className="mt-1.5 rounded bg-amber-50 px-2 py-1 font-mono text-xs font-bold text-orange-700 border border-amber-200 text-center select-all">
                      {generatedToken}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Token de Recuperação
                  </label>
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-mono text-xs text-stone-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Nova Senha (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setGeneratedToken(null)}
                    className="flex-1 rounded-lg border border-stone-200 bg-white py-2 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 transition"
                  >
                    Novo Token
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700 transition"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Rodapé Seguro + Transparência de Persistência */}
        <div className="mt-5 border-t border-stone-100 pt-3 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Painel protegido com controle de sessões e hash SHA-256</span>
          </div>
          {auditReport.mode === 'local_demo' && (
            <p className="text-[10px] text-stone-400 leading-tight">
              Ambiente em <strong>Modo Demonstrativo Local</strong>: alterações de senha
              e catálogo são salvas no navegador atual (<code>localStorage</code>) até a
              conexão das credenciais do Supabase.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
