import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

// Higher-order component to protect routes
export default function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  const AuthenticatedComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // Check auth state when component mounts and loading is done
      if (!loading && !user) {
        // Redirect to login if not authenticated
        router.push("/login");
      }
    }, [user, loading, router]);

    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // If not authenticated and not loading, don't render anything (will redirect)
    if (!user) {
      return null;
    }

    // If authenticated, render the component
    return <Component {...props} />;
  };

  // Copy getInitialProps if it exists
  if ((Component as any).getInitialProps) {
    (AuthenticatedComponent as any).getInitialProps = (
      Component as any
    ).getInitialProps;
  }

  return AuthenticatedComponent;
}
