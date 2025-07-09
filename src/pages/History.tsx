import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  Download,
  Search,
  Cpu,
  Database,
  Activity,
  Menu,
  Trash2
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { dashboardApi } from '@/lib/api';

const History = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalUploads: 0,
    completed: 0,
    avgConfidence: '0.0',
    avgProcessingTime: '0s'
  });

  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardApi.getRecentUploads();
      
      if (response.success && response.data) {
        setUploads(response.data.uploads.map(upload => ({
          id: upload.id,
          name: upload.image_name,
          date: format(new Date(upload.created_at), 'PPp'),
          confidence: Math.round(upload.confidence_score * 100)
        })));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch uploads',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardApi.getStats();
      if (response.success && response.data) {
        const data = response.data;
        setStats({
          totalUploads: data.totalUploads,
          completed: data.successfulUploads,
          avgConfidence: (data.avgConfidence || 0).toFixed(1),
          avgProcessingTime: `${data.avgProcessTime || 0}s`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard stats',
        variant: 'destructive'
      });
    }
  };

  const handleExportHistory = async () => {
    try {
      const response = await dashboardApi.exportHistory('csv');
      if (response.success) {
        toast({
          title: 'Export Successful',
          description: 'History exported successfully',
        });
        // Handle file download if needed
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export history',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      const response = await dashboardApi.deleteUpload(uploadId);
      if (response.success) {
        toast({
          title: 'Upload Deleted',
          description: 'Upload successfully removed',
        });
        // Refresh uploads list
        fetchUploads();
      }
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: 'Unable to delete upload',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUploads();
    fetchDashboardStats();
    }
  }, [user?.id]);

  // Render method would follow here, using the state variables defined above
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Render your history page content here */}
    </div>
  );
};

export default History;
