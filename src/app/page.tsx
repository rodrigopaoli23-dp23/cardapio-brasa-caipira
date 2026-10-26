import Link from 'next/link'
import { Flame, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#fdfbf7] pb-24 shadow-sm md:max-w-2xl">
      {/* Top Banner Informativo */}
      <div className="bg-amber-900 px-4 py-2 text-center text-xs font-medium text-amber-100">
        🔥 O verdadeiro sabor da brasa — Leme/SP
      </div>

      {/* Cabeçalho da Marca */}
      <header className="border-b border-stone-200 bg-white px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20">
            <Flame className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">BRASA CAIPIRA</h1>
            <p className="text-xs text-stone-500">Rua dos Crisântemos, 350 — Jd. Nova Leme</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Atendimento Oficial
              </span>
            </div>
          </div>
        </div>

        {/* Informações Rápidas */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-stone-600">
          <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 p-2.5">
            <Clock className="h-4 w-4 shrink-0 text-orange-600" />
            <span>Qua a Sáb 18h–23h<br />Dom 10h–14h</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 p-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-orange-600" />
            <span>Em frente ao<br />Mercado do Angu</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Inicial de Preparação do Ambiente */}
      <section className="p-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Fase 1: Ambiente Local Preparado</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            O catálogo com os 87 itens originais da planilha está estruturado com segurança no banco de dados relacional.
            Todos os itens estão preservados em rascunho com controle independente de dias e horários.
          </p>
          <div className="mt-4 border-t border-stone-100 pt-3">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800 active:scale-[0.98]"
            >
              Acesso ao Painel Administrativo
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
