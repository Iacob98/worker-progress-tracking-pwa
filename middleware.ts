import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check authentication for protected routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/projects') ||
    request.nextUrl.pathname.startsWith('/appointments') ||
    request.nextUrl.pathname.startsWith('/entries') ||
    request.nextUrl.pathname.startsWith('/nvt') ||
    request.nextUrl.pathname.startsWith('/segments') ||
    request.nextUrl.pathname.startsWith('/dashboard')

  // Since session is stored in localStorage (client-side only),
  // we can't verify it in middleware. The client-side SessionProvider
  // will handle redirects. Here we just pass through.

  // For basic protection, we can check if the user is likely authenticated
  // by checking a cookie that we set on login (optional)

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - sw.js, workbox files (service worker)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js|workbox).*)',
  ],
}
