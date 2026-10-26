'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Flame, Lock, Mail, ArrowLeft, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@brasacaipira.com.br')
  const [password, setPassword] = useState('brasa123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validação de credenciais de teste local
    if (
      email.toLowerCase().trim() === 'admin@brasacaipira.com.br' &&
      password === 'brasa123'
    ) {
      // Define cookie de sessão administrativa
      document.cookie = 'admin_session=authenticated; path=/; max-age=86400; SameSite=Lax'
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 400)
    } else {
      setIsLoading(false)
      setError('E-mail ou senha incorretos. Utilize as credenciais de teste indicadas abaixo.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfbf7] px-4 py-10">
      {/* Botão de Retorno ao Cardápio */}
      <div className="w-full max-w-sm mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-orange-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Cardápio Público
        </Link>
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

        {/* Card Destaque com o Login e Senha para Teste */}
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <KeyRound className="h-4 w-4 text-emerald-700" />
            <span>Credenciais de Teste Local:</span>
          </div>
          <div className="mt-2 space-y-1 font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-emerald-100">
            <p><span className="text-stone-500 font-sans">E-mail:</span> admin@brasacaipira.com.br</p>
            <p><span className="text-stone-500 font-sans">Senha:</span> brasa123</p>
          </div>
          <p className="mt-2 text-[10px] text-emerald-700 leading-tight">
            Os campos já foram pré-preenchidos abaixo para facilitar o seu acesso imediato.
          </p>
        </div>

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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Senha de Acesso
            </label>
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-600 py-3 text-xs font-semibold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Entrando no painel...' : 'Entrar no Painel'}
          </button>
        </form>

        {/* Rodapé Seguro */}
        <div className="mt-5 border-t border-stone-100 pt-3 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Painel protegido com controle de sessões</span>
          </div>
        </div>
      </div>
    </div>
  )
}
