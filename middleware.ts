import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define which routes are protected and require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/calendar',
  '/search',
  // Add other protected routes here
];

// Define public routes that should never redirect to login
const publicRoutes = [
  '/login',
  '/signup',
  '/',
  // Add other public routes here
];

export function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname;
  
  // Check if this path should be protected
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(`${route}/`)
  );
  
  // If this is not a protected route, proceed normally
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // For Firebase authentication in Next.js, we check for the Firebase session cookie
  // This may be different based on your Firebase setup
  const token = request.cookies.get('firebase-auth-token')?.value;
  
  // Also check for local storage auth (as a fallback)
  // This isn't ideal for security but helps with the transition
  const authFromLocalStorage = request.cookies.has('userHasSession');
  
  // If no token is found and the route is protected, redirect to login
  if (!token && !authFromLocalStorage) {
    // Create a new URL for the login page, preserve the original URL as a "from" parameter
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    
    return NextResponse.redirect(loginUrl);
  }
  
  // If token exists, proceed normally
  return NextResponse.next();
}

export const config = {
  // Specify which paths this middleware should run on
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (for serverless functions)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 