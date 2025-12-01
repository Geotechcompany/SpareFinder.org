import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const SearchHistoryAnalytics: React.FC = () => {
  const [uploads, setUploads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUploads = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const response = await dashboardApi.getRecentUploads();
        
        if (response.success && response.data) {
          const data = response.data as { uploads: any[] };
          setUploads(data.uploads || []);
        } else {
          toast.error('Failed to fetch upload history');
        }
      } catch (error) {
        console.error('Error fetching uploads:', error);
        toast.error('Failed to fetch upload history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUploads();
  }, [user]);

  const handleExportHistory = async () => {
    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:4000";

      const response = await fetch(
        `${apiBaseUrl}/api/history/export?format=csv`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to export history: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "upload_history.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success("History exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export history");
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      const response = await dashboardApi.deleteUpload(uploadId);
      setUploads(prev => prev.filter(upload => upload.id !== uploadId));
      toast.success('Upload deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete upload');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            onClick={handleExportHistory}
            disabled={uploads.length === 0}
          >
            Export History
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Confidence Score</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : uploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No upload history</TableCell>
              </TableRow>
            ) : (
              uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>{upload.image_name}</TableCell>
                  <TableCell>{new Date(upload.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{(upload.confidence_score * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteUpload(upload.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}; 