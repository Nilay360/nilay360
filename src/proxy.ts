import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Runs on every non-static request.  Calling getUser() causes @supabase/ssr
// to silently rotate the access token when it is close to expiry and write
// the refreshed token back as a Set-Cookie header on the response — so the
// browser always holds a valid session across page navigations.
export async function proxy(request: NextRequest) {
  // Start with a plain "pass through" response.  We may augment its cookies
  // below when the token is refreshed.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // When Supabase rotates the token it calls setAll.  We must write the
        // new cookies onto both the outgoing request (so subsequent middleware
        // in the same request sees them) and the response (so the browser
        // stores them).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() triggers the token refresh — do not remove it.
  const { data: { user } } = await supabase.auth.getUser()

  // Gate /admin routes — only admin and super_admin roles allowed.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as { role: string | null } | null)?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
