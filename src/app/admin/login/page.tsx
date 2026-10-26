'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Lock, Mail, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Simulação informativa para a fase atual
    setTimeout(() => {
      setIsLoading(false)
      setMessage(
        'Fase 1 concluída: A infraestrutura do Supabase Auth e o schema com controle de administradores (RLS) estão preparados. Na Fase 4, conectaremos a validação do login real com a chave do Supabase.'
      )
    }, 600)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfbf7] px-4 py-12">
      {/* Botão de Retorno ao Cardápio */}
      <div className="w-full max-w-sm mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-orange-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o Cardápio Público
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20">
            <Flame className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-lg font-bold tracking-tight text-stone-900">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Acesso exclusivo para gerenciar o cardápio do <br />
            <strong className="text-stone-700">BRASA CAIPIRA</strong>
          </p>
        </div>

        {/* Mensagem de Feedback */}
        {message && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">{message}</p>
            </div>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              E-mail do Administrador
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brasacaipira.com.br"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-600 py-3 text-xs font-semibold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Verificando credenciais...' : 'Entrar no Painel'}
          </button>
        </form>

        {/* Nota de Segurança */}
        <div className="mt-6 border-t border-stone-100 pt-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Autenticação criptografada com Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  )
}
