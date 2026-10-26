import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BRASA CAIPIRA — O verdadeiro sabor da brasa',
  description:
    'Cardápio digital oficial do Brasa Caipira. Espetinhos artesanais, X-Espeto, Churrasco Grego, frangos assados e porções em Leme/SP.',
  keywords: ['Brasa Caipira', 'Cardápio Digital', 'Espetinhos Leme', 'Churrasco Grego', 'Leme SP'],
  openGraph: {
    title: 'BRASA CAIPIRA — O verdadeiro sabor da brasa',
    description: 'Faça seu pedido direto pelo cardápio digital oficial.',
    url: 'https://brasacaipira.com.br',
    siteName: 'Brasa Caipira',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#fdfbf7] text-stone-900 antialiased selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
