import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  FileText,
  CheckCircle,
  Package,
  Home,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';

const SharedAnalysis = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/reports/shared/${token}`
        );

        if (!response.ok) {
          throw new Error('Analysis not found or no longer available');
        }

        const data = await response.json();
        setAnalysis(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared analysis');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedAnalysis();
    }
  }, [token]);

  const handleDownloadPDF = async () => {
    if (!analysis?.pdf_url) return;

    try {
      const filename = analysis.pdf_url.split('/').pop() || 'report.pdf';
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:4000';

      // Fetch PDF as blob to avoid browser security warnings
      const response = await fetch(`${apiBaseUrl}/api/reports/pdf/${filename}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-red-500/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Analysis Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error || 'This shared analysis is no longer available or the link is invalid.'}
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const reportText = analysis.result_data?.report_text || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📋 Shared Part Analysis Report
              </h1>
              <p className="text-gray-400">
                This analysis has been shared publicly
              </p>
            </div>
            <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>

          {/* Keywords Badge */}
          {analysis.keywords && (
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white rounded-full p-2">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">
                    Search Keywords
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="font-medium text-blue-400">{analysis.keywords}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Image Section */}
          {analysis.image_url && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                <Package className="h-5 w-5" />
                Analyzed Image
              </h3>
              <div className="border border-white/10 rounded-lg overflow-hidden bg-gray-900">
                <img
                  src={analysis.image_url}
                  alt="Analyzed part"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Report Content */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            Full Analysis Report
          </h2>

          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-blue-400">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden shadow-sm" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600" {...props} />
                ),
                tbody: ({ node, ...props }) => (
                  <tbody className="bg-gray-800 divide-y divide-gray-700" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="hover:bg-gray-750 transition-colors" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-white" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-6 py-4 text-sm text-gray-100" {...props} />
                ),
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4 text-white border-b-2 border-blue-500 pb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-100" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-200" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-blue-400" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-blue-400 hover:underline" {...props} />
                ),
              }}
            >
              {reportText || 'No report text available'}
            </ReactMarkdown>
          </div>

          <Separator className="my-6 bg-gray-700" />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Created At</p>
              <p className="font-medium text-gray-200">
                {new Date(analysis.created_at).toLocaleString()}
              </p>
            </div>
            {analysis.completed_at && (
              <div>
                <p className="text-gray-400">Completed At</p>
                <p className="font-medium text-gray-200">
                  {new Date(analysis.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-6 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex gap-2">
            {analysis.pdf_url && (
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="border-blue-500/50 hover:bg-blue-500/20 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to SpareFinder
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedAnalysis;

