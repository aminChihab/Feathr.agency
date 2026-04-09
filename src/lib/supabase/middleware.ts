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
  const isPublicRoute = publicRoutes.some(route => path === route) || path.startsWith('/_next') || path.startsWith('/api/webhook')

  // Not logged in on a protected route → redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in on login/signup → redirect based on profile status
  if (user && (path === '/login' || path === '/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.status === 'active' || profile?.status === 'paused') {
      url.pathname = '/'
    } else {
      url.pathname = '/onboarding'
    }
    return NextResponse.redirect(url)
  }

  // Logged in but not yet active → redirect to onboarding (except on onboarding itself)
  if (user && !path.startsWith('/onboarding') && path !== '/login' && path !== '/signup') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (profile?.status === 'onboarding' || profile?.status === 'setup') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
