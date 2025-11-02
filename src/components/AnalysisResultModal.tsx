/**
 * Analysis Result Modal Component
 *
 * Displays comprehensive analysis results in a modal with:
 * - Full analysis text
 * - Technical specifications
 * - Suppliers information
 * - Download PDF option
 */

import React from "react";
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
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Globe,
  X,
  Search,
  Share2,
} from "lucide-react";

interface AnalysisResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: any;
  onDownloadPDF?: () => void;
  onShare?: () => void;
}

export const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onDownloadPDF,
  onShare,
}) => {
  if (!analysis) return null;

  const resultData = analysis.result_data;
  const reportText = resultData?.report_text || "";

  // Parse sections from report text
  const parseSection = (sectionName: string): string => {
    const regex = new RegExp(
      `#{1,4}\\s*${sectionName}[\\s\\S]*?(?=#{1,4}|$)`,
      "i"
    );
    const match = reportText.match(regex);
    return match ? match[0] : "";
  };

  const identifiedPart = parseSection("IDENTIFIED PART DETAILS");
  const technicalSpecs = parseSection("TECHNICAL SPECIFICATIONS");
  const suppliers = parseSection("TOP.*SUPPLIERS");
  const alternatives = parseSection("ALTERNATIVE");
  const conclusion = parseSection("CONCLUSION");

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
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea
          className="flex-1 px-6 py-4"
          style={{ maxHeight: "calc(90vh - 180px)" }}
        >
          <div className="space-y-6">
            {/* Keywords Badge for keyword-only searches */}
            {!analysis.image_url && analysis.keywords && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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

            {/* Image Section */}
            {analysis.image_url && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Analyzed Image
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={analysis.image_url}
                    alt="Analyzed part"
                    className="w-full h-auto max-h-64 object-contain bg-gray-50"
                  />
                </div>
              </div>
            )}

            {/* Identified Part Details */}
            {identifiedPart && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Identified Part Details
                </h3>
                <div className="prose prose-sm max-w-none bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {identifiedPart}
                  </pre>
                </div>
              </div>
            )}

            {/* Technical Specifications */}
            {technicalSpecs && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Technical Specifications
                </h3>
                <div className="prose prose-sm max-w-none bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {technicalSpecs}
                  </pre>
                </div>
              </div>
            )}

            {/* Suppliers */}
            {suppliers && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Suppliers
                </h3>
                <div className="prose prose-sm max-w-none bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {suppliers}
                  </pre>
                </div>
              </div>
            )}

            {/* Alternatives */}
            {alternatives && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Alternative Options
                </h3>
                <div className="prose prose-sm max-w-none bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {alternatives}
                  </pre>
                </div>
              </div>
            )}

            {/* Conclusion */}
            {conclusion && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Conclusion
                </h3>
                <div className="prose prose-sm max-w-none bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {conclusion}
                  </pre>
                </div>
              </div>
            )}

            {/* Full Report Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                📋 Full Analysis Report
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert p-6 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700">
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
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
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
                        className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider"
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
                        className="text-xl font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed"
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-bold text-blue-600 dark:text-blue-400"
                        {...props}
                      />
                    ),
                    em: ({ node, ...props }) => (
                      <em
                        className="italic text-gray-600 dark:text-gray-400"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block bg-gray-200 dark:bg-gray-700 p-4 rounded-lg text-sm font-mono overflow-x-auto"
                          {...props}
                        />
                      ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4"
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
                  {reportText || "No report text available"}
                </ReactMarkdown>
              </div>
            </div>

            {/* Metadata */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">User Email</p>
                <p className="font-medium">{analysis.user_email}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created At</p>
                <p className="font-medium">
                  {new Date(analysis.created_at).toLocaleString()}
                </p>
              </div>
              {analysis.completed_at && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Completed At
                  </p>
                  <p className="font-medium">
                    {new Date(analysis.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              {analysis.keywords && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Keywords</p>
                  <p className="font-medium">{analysis.keywords}</p>
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
                  className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
              {onShare && (
                <Button
                  variant="outline"
                  onClick={onShare}
                  className="flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-950 border-green-200 dark:border-green-800"
                >
                  <Share2 className="h-4 w-4" />
                  Share Link
                </Button>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
