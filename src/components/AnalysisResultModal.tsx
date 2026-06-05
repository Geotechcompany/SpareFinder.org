/**
 * Analysis Result Modal — full report view with regional currency conversion.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileText,
  CheckCircle,
  Package,
  Search,
  Share2,
  RefreshCw,
  MapPinOff,
} from "lucide-react";
import {
  convertReportPrices,
  resolveReportCurrency,
} from "@/lib/currency";

interface AnalysisResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: any;
  onDownloadPDF?: () => void;
  onShare?: () => void;
  onRetryGlobal?: (analysis: { id: string; keywords?: string }) => void;
}

function resolveTargetCurrency(
  reportText: string,
  resultData: Record<string, unknown> | undefined
): string {
  const region = String(resultData?.search_region ?? "");
  if (/kenya/i.test(region)) return "KES";
  return resolveReportCurrency(
    reportText,
    (resultData?.search_currency as string) ?? null
  );
}

export const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onDownloadPDF,
  onShare,
  onRetryGlobal,
}) => {
  if (!analysis) return null;

  const resultData = analysis.result_data as Record<string, unknown> | undefined;
  const reportText = String(resultData?.report_text ?? "");
  const noRegionalSuppliers = !!resultData?.no_regional_suppliers;

  const displayReport = useMemo(() => {
    if (!reportText) return "No report text available";
    const target = resolveTargetCurrency(reportText, resultData);
    return convertReportPrices(reportText, target);
  }, [reportText, resultData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                Analysis Results
              </DialogTitle>
              <DialogDescription className="mt-2">
                Job ID: {analysis.id?.substring(0, 8)}...
              </DialogDescription>
            </div>
            <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea
          className="flex-1 px-6 py-4"
          style={{ maxHeight: "calc(90vh - 180px)" }}
        >
          <div className="space-y-6">
            {noRegionalSuppliers && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MapPinOff className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      No suppliers found in your region
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      Retry with global search or change your region in Settings →
                      Preferences.
                    </p>
                  </div>
                </div>
                {onRetryGlobal && (analysis.keywords || analysis.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    onClick={() =>
                      onRetryGlobal({
                        id: analysis.id,
                        keywords: analysis.keywords,
                      })
                    }
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry without region
                  </Button>
                )}
              </div>
            )}

            {!analysis.image_url && analysis.keywords && (
              <div className="bg-gradient-to-r from-blue-50 to-brand-50 dark:from-blue-950 dark:to-brand-dark border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white rounded-full p-2">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Keyword-Based Analysis
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Search Keywords:{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {analysis.keywords}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {analysis.image_url && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Package className="h-5 w-5" />
                  Analyzed Image
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={analysis.image_url}
                    alt="Analyzed part"
                    className="w-full h-auto max-h-64 object-contain bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                Full Analysis Report
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert p-6 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-6">
                        <table
                          className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead
                        className="bg-gradient-to-r from-brand-dark to-brand-dark text-white"
                        {...props}
                      />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody
                        className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
                        {...props}
                      />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        {...props}
                      />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-white"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
                        {...props}
                      />
                    ),
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b-2 border-blue-500 pb-2"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-2xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-100"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-xl font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed"
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside mb-4 space-y-2 text-gray-800 dark:text-gray-200"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside mb-4 space-y-2 text-gray-800 dark:text-gray-200"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4 text-gray-800 dark:text-gray-200" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-bold text-gray-900 dark:text-white"
                        {...props}
                      />
                    ),
                    em: ({ node, ...props }) => (
                      <em
                        className="italic text-gray-700 dark:text-gray-300"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-red-700 dark:text-red-400"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto text-gray-900 dark:text-gray-100"
                          {...props}
                        />
                      ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 my-4"
                        {...props}
                      />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        {...props}
                      />
                    ),
                  }}
                >
                  {displayReport}
                </ReactMarkdown>
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">User Email</p>
                <p className="font-medium text-foreground">{analysis.user_email}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created At</p>
                <p className="font-medium text-foreground">
                  {new Date(analysis.created_at).toLocaleString()}
                </p>
              </div>
              {analysis.completed_at && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Completed At</p>
                  <p className="font-medium text-foreground">
                    {new Date(analysis.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              {analysis.keywords && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Keywords</p>
                  <p className="font-medium text-foreground">{analysis.keywords}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {analysis.pdf_url && (
                <Button
                  variant="outline"
                  onClick={onDownloadPDF}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
              {onShare && (
                <Button
                  variant="outline"
                  onClick={onShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share Link
                </Button>
              )}
            </div>
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
