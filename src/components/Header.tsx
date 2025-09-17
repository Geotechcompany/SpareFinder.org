import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, Menu, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* Scroll Progress Indicator */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-600 to-blue-600 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-black/95 backdrop-blur-xl border-l border-white/20 z-50 lg:hidden"
            >
              <div className="p-6">
                {/* Close Button */}
                <div className="flex justify-end mb-8">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Logo */}
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">SpareFinder</span>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-4 mb-8">
                  {[
                    { name: 'HOME', href: '/' },
                    { name: 'FEATURES', href: '/#features' },
                    { name: 'AI CAPABILITIES', href: '/#capabilities' },
                    { name: 'INDUSTRIES', href: '/#industries' },
                    { name: 'PRICING', href: '/#pricing' },
                    { name: 'REVIEWS', href: '/reviews' },
                    { name: 'CONTACT', href: '/contact' }
                  ].map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block py-3 px-4 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </nav>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {!isLoading && (
                    <>
                      {!isAuthenticated ? (
                        // Show Sign In and Get SpareFinder buttons for non-authenticated users
                        <>
                          <Link to="/login" className="block">
                            <Button 
                              variant="ghost" 
                              className="w-full text-white hover:bg-white/10 rounded-xl justify-start"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              Sign In
                            </Button>
                          </Link>
                          <Link to="/register" className="block">
                            <Button 
                              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 rounded-xl"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              Get SpareFinder
                              <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                          </Link>
                        </>
                      ) : (
                        // Show Dashboard button for authenticated users
                        <Link to="/dashboard" className="block">
                          <Button 
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 rounded-xl justify-start"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Dashboard
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Header - Enhanced with Glass Effect */}
      <nav className="fixed top-4 left-4 right-4 z-50 backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl shadow-2xl shadow-black/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to="/">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
              <motion.span 
                className="text-xl font-bold text-white"
                whileHover={{ scale: 1.02 }}
              >
                <Link to="/">SpareFinder</Link>
              </motion.span>
            </motion.div>

            {/* Navigation Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {[
                { name: 'HOME', href: '/', active: true },
                { name: 'FEATURES', href: '/#features' },
                { name: 'AI CAPABILITIES', href: '/#capabilities' },
                { name: 'INDUSTRIES', href: '/#industries' },
                { name: 'PRICING', href: '/#pricing' },
                { name: 'REVIEWS', href: '/reviews' },
                { name: 'CONTACT', href: '/contact' }
              ].map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    item.active 
                      ? 'text-white bg-white/10' 
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -1 }}
                >
                  {item.name}
                </motion.a>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Desktop Buttons */}
              <div className="hidden lg:flex items-center space-x-3">
                {!isLoading && (
                  <>
                    {!isAuthenticated ? (
                      // Show Sign In and Get SpareFinder buttons for non-authenticated users
                      <>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Button 
                            variant="ghost" 
                            className="text-gray-400 hover:text-white hover:bg-white/10 font-medium rounded-xl"
                            asChild
                          >
                            <Link to="/login">Sign In</Link>
                          </Button>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 rounded-xl"
                            asChild
                          >
                            <Link to="/register">Get SpareFinder</Link>
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      // Show Dashboard button for authenticated users
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 rounded-xl"
                          asChild
                        >
                          <Link to="/dashboard">
                            Dashboard
                          </Link>
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header; 