import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center bg-muted/30 px-4 py-12 dark:bg-background">
        <div className="flex max-w-md flex-col items-center text-center">
          <img
            src="/Illustrations/404.svg"
            alt="Page not found"
            className="mb-6 w-full max-w-[280px] object-contain sm:max-w-[320px]"
          />
          <h1 className="mb-2 text-4xl font-bold text-foreground sm:text-5xl">404</h1>
          <p className="mb-6 text-lg text-muted-foreground sm:text-xl">Oops! Page not found</p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            Return to Home
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
