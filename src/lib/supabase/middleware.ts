import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/signup', '/features', '/pricing', '/waitlist', '/privacy', '/terms']
  const isPublicRoute = publicRoutes.some(route => path === route) || path.startsWith('/_next') || path.startsWith('/api/webhook') || path.startsWith('/api/agent')

  // Not logged in on a protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // All remaining checks require a logged-in user with a profile
  if (user) {
    const isAuthPage = path === '/login' || path === '/signup'
    const isOnboarding = path.startsWith('/onboarding')

    // Fetch profile once for all redirect decisions
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    const isActive = profile?.status === 'active' || profile?.status === 'paused'
    const needsOnboarding = profile?.status === 'onboarding' || profile?.status === 'setup'

    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = isActive ? '/' : '/onboarding'
      return NextResponse.redirect(url)
    }

    if (needsOnboarding && !isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
