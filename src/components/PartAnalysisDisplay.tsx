import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';
import { parseAIResponse } from '@/lib/markdown-parser';

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
  full_analysis?: string;  // Add this field for the complete analysis
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
  className = ""
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Full AI Analysis - Rich Markdown Content */}
      {analysisData.full_analysis ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Complete AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none analysis-markdown">
              <div 
                className="analysis-content space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: parseAIResponse(analysisData.full_analysis) 
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center text-gray-400">
              <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
              <p className="text-lg font-medium">No detailed analysis available</p>
              <p className="text-sm mt-2">The AI analysis content could not be loaded</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlatPartAnalysisDisplay; 