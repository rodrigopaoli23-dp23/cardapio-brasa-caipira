import { NextResponse, type NextRequest } from 'next/server'

/**
 * BRASA CAIPIRA — Middleware de Segurança
 * Protege todas as rotas administrativas (/admin/*), exigindo sessão autenticada.
 * Redireciona usuários não autenticados para a tela de login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Se a rota for da área administrativa mas não for a tela de login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Verifica cookie de autenticação do Supabase
    const authToken = request.cookies.get('sb-access-token')?.value || 
                      request.cookies.get('supabase-auth-token')?.value

    // Se estiver em modo de desenvolvimento sem credenciais configuradas, permite inspecionar layout
    const isDevMock = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!authToken && !isDevMock) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
