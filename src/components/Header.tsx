import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <>
      {/* Scroll Progress Indicator */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-600 to-blue-600 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Modern Header - Inspired by Magic AI */}
      <nav className="fixed w-full z-50 bg-black/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
                <Link to="/">PartFinder AI</Link>
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
                { name: 'SECURITY', href: '/security' }
              ].map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    item.active 
                      ? 'text-white bg-gray-800/50' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  variant="ghost" 
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50 font-medium"
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
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
                  asChild
                >
                  <Link to="/register">Get PartFinder AI</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header; 