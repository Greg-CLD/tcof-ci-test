import { Link } from "wouter";
import { UserMenu } from "@/components/auth-buttons";
import { useAuth } from "@/contexts/AuthContext";
import { PropsWithChildren } from "react";

export function MainLayout({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b shadow-sm bg-white">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link to="/">
              <h1 className="text-2xl font-bold text-tcof-primary">TCOF Toolkit</h1>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-700 hover:text-tcof-primary transition-colors">
                Home
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/organisations" className="text-gray-700 hover:text-tcof-primary transition-colors">
                    Organisations
                  </Link>
                  <Link to="/projects" className="text-gray-700 hover:text-tcof-primary transition-colors">
                    Projects
                  </Link>
                </>
              )}
              <Link to="/tools" className="text-gray-700 hover:text-tcof-primary transition-colors">
                Tools
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <UserMenu />
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-6 px-4">
        {children}
      </main>
      
      <footer className="bg-gray-100 border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-600">© {new Date().getFullYear()} The Connected Outcomes Framework</p>
            </div>
            <div className="flex space-x-6">
              <Link to="/about" className="text-gray-600 hover:text-tcof-primary transition-colors">
                About
              </Link>
              <Link to="/privacy" className="text-gray-600 hover:text-tcof-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-gray-600 hover:text-tcof-primary transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}