import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Coins, 
  AlertTriangle, 
  RefreshCw, 
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreditsDisplayProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onCreditChange?: (credits: number) => void;
}

export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({
  className = '',
  size = 'medium',
  onCreditChange
}) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetchedOnceRef = React.useRef(false);

  const fetchCredits = async () => {
    try {
      const response = await api.credits.getBalance();
      if (response.success && typeof (response as any).credits === 'number') {
        setCredits((response as any).credits);
        onCreditChange?.((response as any).credits);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      toast.error('Failed to load credit balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshCredits = async () => {
    setRefreshing(true);
    await fetchCredits();
  };

  useEffect(() => {
    if (hasFetchedOnceRef.current) {
      // Avoid duplicate fetch in StrictMode double-invoke
      return;
    }
    hasFetchedOnceRef.current = true;
    fetchCredits();
  }, []);

  const getStatusColor = () => {
    if (credits === null) return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    if (credits === 0) return 'from-red-500/20 to-red-600/20 border-red-500/40';
    if (credits <= 3) return 'from-orange-500/20 to-yellow-500/20 border-orange-500/40';
    return 'from-emerald-500/20 to-green-500/20 border-green-500/40';
  };

  const getIcon = () => {
    const iconSize = size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4';
    
    if (loading || refreshing) {
      return <Loader2 className={`${iconSize} animate-spin text-gray-400`} />;
    }
    
    if (credits === 0) {
      return <AlertTriangle className={`${iconSize} text-red-400`} />;
    }
    
    return <Coins className={`${iconSize} text-emerald-400`} />;
  };

  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-1.5 text-xs',
          credit: 'text-sm font-semibold',
          gap: 'space-x-1.5'
        };
      case 'large':
        return {
          container: 'px-4 py-3 text-base',
          credit: 'text-xl font-bold',
          gap: 'space-x-3'
        };
      default:
        return {
          container: 'px-3 py-2 text-sm',
          credit: 'text-lg font-semibold',
          gap: 'space-x-2'
        };
    }
  };

  const sizes = getSizes();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center bg-gradient-to-r ${getStatusColor()} 
                  backdrop-blur-sm rounded-full border ${sizes.container} ${sizes.gap} ${className}`}
    >
      {getIcon()}
      
      <span className={`text-white ${sizes.credit}`}>
        {loading ? '...' : credits}
      </span>
      
      {size !== 'small' && (
        <span className="text-white/70">
          credit{credits !== 1 ? 's' : ''}
        </span>
      )}

      {!loading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshCredits}
          disabled={refreshing}
          className={`p-0 h-auto hover:bg-white/10 ${size === 'small' ? 'ml-1' : 'ml-2'}`}
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      )}

      {!loading && (credits === null || credits === 0) && (
        <Button
          variant="outline"
          size="sm"
          className={`ml-2 bg-white/5 hover:bg-white/10 text-white border-white/20 ${size === 'small' ? 'px-2 py-1' : 'px-3 py-1.5'}`}
          onClick={() => {
            window.location.href = '/dashboard/billing';
          }}
        >
          Upgrade plan to get credits
        </Button>
      )}
    </motion.div>
  );
};

export default CreditsDisplay; 