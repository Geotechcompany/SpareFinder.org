import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { parseAIResponse } from "@/lib/markdown-parser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import EnhancedSupplierDisplay from "./EnhancedSupplierDisplay";

interface FlatAnalysisData {
  success: boolean;
  status: string;
  filename?: string;
  class_name?: string;
  category?: string;
  precise_part_name?: string;
  material_composition?: string;
  manufacturer?: string;
  confidence_score?: number;
  confidence_explanation?: string;
  estimated_price?: {
    new: string;
    used: string;
    refurbished: string;
  };
  description?: string;
  full_analysis?: string; // Add this field for the complete analysis
  technical_data_sheet?: {
    part_type: string;
    material: string;
    common_specs: string;
    load_rating: string;
    weight: string;
    reusability: string;
    finish: string;
    temperature_tolerance: string;
  };
  compatible_vehicles?: string[];
  engine_types?: string[];
  buy_links?: Record<string, string>;
  suppliers?: Array<{
    name: string;
    url: string;
    price_range?: string;
    shipping_region?: string;
    contact?: string;
  }>;
  fitment_tips?: string;
  additional_instructions?: string;
  processing_time_seconds?: number;
  model_version?: string;
}

interface PartAnalysisDisplayProps {
  analysisData: FlatAnalysisData;
  imagePreview?: string;
  className?: string;
}

export const FlatPartAnalysisDisplay: React.FC<PartAnalysisDisplayProps> = ({
  analysisData,
  imagePreview,
  className = "",
}) => {
  // Debug logging
  console.log("📊 PartAnalysisDisplay - analysisData:", analysisData);
  console.log("📝 Full analysis exists:", !!analysisData?.full_analysis);
  if (analysisData?.full_analysis) {
    console.log("📝 Full analysis length:", analysisData.full_analysis.length);
    console.log(
      "📝 Full analysis preview:",
      analysisData.full_analysis.substring(0, 100)
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Full AI Analysis - Rich Markdown Content */}
      {analysisData?.full_analysis &&
      !analysisData.full_analysis.includes(
        "I'm sorry, I can't assist with that request."
      ) &&
      !analysisData.full_analysis.includes("I cannot assist") &&
      analysisData.full_analysis.length > 100 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Complete Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none analysis-markdown">
              <div
                className="analysis-content space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: parseAIResponse(analysisData.full_analysis),
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisData?.description && (
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-300">{analysisData.description}</p>
                </div>
              )}
              {analysisData?.precise_part_name && (
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">Part</h3>
                  <p className="text-gray-300">
                    {analysisData.precise_part_name}
                  </p>
                </div>
              )}
              {analysisData?.confidence_explanation && (
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">
                    Confidence
                  </h3>
                  <p className="text-gray-300">
                    {analysisData.confidence_explanation}
                  </p>
                </div>
              )}
              {!analysisData?.description &&
                !analysisData?.precise_part_name &&
                !analysisData?.confidence_explanation && (
                  <div className="text-center text-gray-400">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                    <p className="text-lg font-medium">
                      No detailed analysis available
                    </p>
                    <p className="text-sm mt-2">
                      The AI analysis content could not be loaded
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Supplier Display with Contact Scraping */}
      {(analysisData?.suppliers?.length > 0 || analysisData?.buy_links) && (
        <EnhancedSupplierDisplay
          suppliers={analysisData?.suppliers || []}
          buyLinks={analysisData?.buy_links || {}}
          partName={
            analysisData?.precise_part_name ||
            analysisData?.class_name ||
            "this part"
          }
          showScraper={true}
        />
      )}

      {/* Charts are rendered inside the Market Chart Data markdown section via parser */}
    </div>
  );
};

interface PartAnalysisDisplayModalProps extends PartAnalysisDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const PartAnalysisDisplayModal: React.FC<
  PartAnalysisDisplayModalProps
> = ({
  open,
  onOpenChange,
  analysisData,
  imagePreview,
  className = "",
  title,
}) => {
  const modalTitle =
    title ||
    analysisData?.precise_part_name ||
    analysisData?.class_name ||
    "Analysis Details";

  const handleDownloadPdf = async () => {
    try {
      const wrapper = document.createElement("div");
      wrapper.style.padding = "24px";
      wrapper.style.background = "#111827";
      const clone = document
        .querySelector(".analysis-markdown")
        ?.parentElement?.cloneNode(true) as HTMLElement | null;
      if (!clone) {
        // fallback capture the modal section
        const modal = document.querySelector(
          "[role='dialog']"
        ) as HTMLElement | null;
        if (!modal) return;
        const canvas = await html2canvas(modal, {
          backgroundColor: "#111827",
          scale: 2,
          useCORS: true,
        });
        const pdf = new jsPDF("p", "mm", "a4");
        const imgData = canvas.toDataURL("image/png");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(
          pageWidth / canvas.width,
          pageHeight / canvas.height
        );
        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          canvas.width * ratio,
          canvas.height * ratio,
          undefined,
          "FAST"
        );
        pdf.save(
          `analysis_${
            analysisData?.filename || analysisData?.class_name || "result"
          }.pdf`
        );
        return;
      }
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      const canvas = await html2canvas(wrapper, {
        backgroundColor: "#111827",
        scale: 2,
        useCORS: true,
      });
      document.body.removeChild(wrapper);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(
        pageWidth / canvas.width,
        pageHeight / canvas.height
      );
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageWidth - imgW) / 2;
      const y = 10;
      pdf.addImage(imgData, "PNG", x, y, imgW, imgH, undefined, "FAST");
      pdf.save(
        `analysis_${
          analysisData?.filename || analysisData?.class_name || "result"
        }.pdf`
      );
    } catch {}
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl p-0 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{modalTitle}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                Download PDF
              </Button>
            </div>
          </div>
          {(analysisData?.filename ||
            analysisData?.model_version ||
            analysisData?.processing_time_seconds) && (
            <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-3">
              {analysisData?.filename && (
                <span>
                  Job:{" "}
                  <span className="text-gray-300 font-mono">
                    {analysisData.filename}
                  </span>
                </span>
              )}
              {analysisData?.model_version && (
                <span>
                  Model:{" "}
                  <span className="text-gray-300">
                    {analysisData.model_version}
                  </span>
                </span>
              )}
              {typeof analysisData?.processing_time_seconds !== "undefined" && (
                <span>
                  Time:{" "}
                  <span className="text-gray-300">
                    {analysisData.processing_time_seconds}s
                  </span>
                </span>
              )}
            </div>
          )}
        </DialogHeader>
        <div className="mt-4 max-h-[75vh] sm:max-h-[80vh] overflow-y-auto px-4 sm:px-0">
          <FlatPartAnalysisDisplay
            analysisData={analysisData}
            imagePreview={imagePreview}
            className={className}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlatPartAnalysisDisplay;
