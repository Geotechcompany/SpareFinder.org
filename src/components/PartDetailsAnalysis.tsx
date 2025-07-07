import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UploadResponse } from '@/hooks/useFileUpload';
import { 
  Target, 
  Info, 
  DollarSign, 
  CheckCircle,
  AlertTriangle,
  Zap,
  Layers,
  Truck,
  Sparkles
} from 'lucide-react';

// Utility function to handle missing or empty data
const formatValue = (value: string | string[] | undefined, fallback: string = 'Not available') => {
  if (!value) return fallback;
  return Array.isArray(value) 
    ? (value.length > 0 ? value.join(', ') : fallback)
    : value.trim() || fallback;
};

// Reusable Section Component with improved error handling
const Section: React.FC<{ 
  title: string, 
  icon?: React.ReactNode, 
  children: React.ReactNode,
  isEmpty?: boolean
}> = ({ title, icon, children, isEmpty = false }) => (
  <Card className={`${isEmpty ? 'opacity-50 bg-gray-900/30' : ''} transition-all duration-300`}>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </div>
        {isEmpty && (
          <Badge variant="destructive" className="flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            No Data
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isEmpty ? (
        <p className="text-gray-500 italic">No information available for this section.</p>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);

export const PartDetailsAnalysis: React.FC<{ 
  partInfo: NonNullable<UploadResponse['part_info']> 
}> = ({ partInfo }) => {
  // Destructure and parse the additional details from the part info
  const additionalDetails = partInfo.additional_details || {};

  // Determine if sections have meaningful data
  const hasIdentificationData = !!(
    partInfo.name || 
    partInfo.category || 
    partInfo.manufacturer
  );

  const hasTechnicalData = !!(
    additionalDetails['Detailed Component Description'] || 
    additionalDetails['Material Composition'] || 
    additionalDetails['Performance Characteristics']
  );

  const hasMarketData = !!(
    additionalDetails['Estimated Price Range'] || 
    additionalDetails['Typical Vehicle Models'] || 
    additionalDetails['Replacement Frequency']
  );

  const hasConfidenceData = !!(
    (partInfo.visual_match_confidence || 0) > 0 || 
    (partInfo.technical_identification_confidence || 0) > 0 || 
    partInfo.confidence_reasoning
  );

  return (
    <div className="space-y-6">
      {/* 1. Identified Part Summary */}
      <Section 
        title="Identified Part" 
        icon={<Target className="w-5 h-5 text-blue-400" />}
        isEmpty={!hasIdentificationData}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <strong className="block mb-1">Part Name:</strong>
            <Badge variant="default" className="w-full justify-start">
              {formatValue(partInfo.name, 'Unidentified Component')}
            </Badge>
          </div>
          <div>
            <strong className="block mb-1">Category:</strong>
            <Badge variant="secondary" className="w-full justify-start">
              {formatValue(partInfo.category, 'Automotive Component')}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <strong className="block mb-1">Potential Manufacturers:</strong>
            <Badge variant="outline" className="w-full justify-start">
              {formatValue(partInfo.manufacturer, 'Manufacturer Unknown')}
            </Badge>
          </div>
        </div>
      </Section>

      {/* 2. Technical Specifications */}
      <Section 
        title="Technical Specifications" 
        icon={<Layers className="w-5 h-5 text-green-400" />}
        isEmpty={!hasTechnicalData}
      >
        <div className="space-y-4">
          {additionalDetails['Detailed Component Description'] && (
            <div>
              <strong className="block mb-2">Detailed Description:</strong>
              <p className="text-muted-foreground">
                {additionalDetails['Detailed Component Description']}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {additionalDetails['Material Composition'] && (
              <div>
                <strong className="block mb-1">Material Composition:</strong>
                <p className="text-muted-foreground">
                  {additionalDetails['Material Composition']}
                </p>
              </div>
            )}
            {additionalDetails['Performance Characteristics'] && (
              <div>
                <strong className="block mb-1">Performance Characteristics:</strong>
                <p className="text-muted-foreground">
                  {additionalDetails['Performance Characteristics']}
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 3. Market Information */}
      <Section 
        title="Market Insights" 
        icon={<Truck className="w-5 h-5 text-green-400" />}
        isEmpty={!hasMarketData}
      >
        <div className="space-y-4">
          {additionalDetails['Estimated Price Range'] && (
            <div>
              <strong className="block mb-1">Estimated Price Range:</strong>
              <Badge variant="default" className="w-full justify-start">
                {additionalDetails['Estimated Price Range']}
              </Badge>
            </div>
          )}
          {additionalDetails['Typical Vehicle Models'] && (
            <div>
              <strong className="block mb-2">Compatible Vehicles:</strong>
              <ul className="list-disc list-inside text-muted-foreground">
                {additionalDetails['Typical Vehicle Models'].split(',').map((model, index) => (
                  <li key={index}>{model.trim()}</li>
                ))}
              </ul>
            </div>
          )}
          {additionalDetails['Replacement Frequency'] && (
            <div>
              <strong className="block mb-1">Replacement Frequency:</strong>
              <Badge variant="secondary" className="w-full justify-start">
                {additionalDetails['Replacement Frequency']}
              </Badge>
            </div>
          )}
        </div>
      </Section>

      {/* 4. Confidence Assessment */}
      <Section 
        title="Confidence Assessment" 
        icon={<CheckCircle className="w-5 h-5 text-green-400" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">Visual Match Confidence</div>
            <Badge 
              variant={
                (partInfo.visual_match_confidence || 0) > 80 
                  ? 'default' 
                  : (partInfo.visual_match_confidence || 0) > 60 
                  ? 'secondary' 
                  : 'destructive'
              }
            >
              {((partInfo.visual_match_confidence || 0) * 100).toFixed(1)}%
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">Technical Identification</div>
            <Badge 
              variant={
                (partInfo.technical_identification_confidence || 0) > 80 
                  ? 'default' 
                  : (partInfo.technical_identification_confidence || 0) > 60 
                  ? 'secondary' 
                  : 'destructive'
              }
            >
              {((partInfo.technical_identification_confidence || 0) * 100).toFixed(1)}%
            </Badge>
          </div>
          {partInfo.confidence_reasoning && (
            <div className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-white/10">
              <div className="font-semibold text-gray-200 mb-1 flex items-center">
                <Info className="w-4 h-4 mr-2 text-blue-400" />
                Confidence Reasoning
              </div>
              {partInfo.confidence_reasoning}
            </div>
          )}
        </div>
      </Section>

      {/* Additional Details Section */}
      {partInfo.additional_details && (
        <Section 
          title="Additional Analysis Details" 
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
        >
          <div className="space-y-3">
            {partInfo.additional_details.technical_specifications && (
              <div>
                <div className="text-sm font-semibold text-gray-200 mb-1">Technical Specifications</div>
                <p className="text-gray-300 text-sm">
                  {partInfo.additional_details.technical_specifications}
                </p>
              </div>
            )}
            {partInfo.additional_details.market_information && (
              <div>
                <div className="text-sm font-semibold text-gray-200 mb-1">Market Information</div>
                <p className="text-gray-300 text-sm">
                  {partInfo.additional_details.market_information}
                </p>
              </div>
            )}
            {partInfo.additional_details.typical_vehicle_models && (
              <div>
                <div className="text-sm font-semibold text-gray-200 mb-1">Compatible Vehicle Models</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(partInfo.additional_details.typical_vehicle_models) 
                    ? partInfo.additional_details.typical_vehicle_models.map((model, index) => (
                        <Badge key={index} variant="outline" className="text-gray-300">
                          {model}
                        </Badge>
                      ))
                    : (
                        <Badge variant="outline" className="text-gray-300">
                          {partInfo.additional_details.typical_vehicle_models}
                        </Badge>
                      )
                  }
                </div>
              </div>
            )}
            {partInfo.additional_details.replacement_frequency && (
              <div>
                <div className="text-sm font-semibold text-gray-200 mb-1">Replacement Frequency</div>
                <p className="text-gray-300 text-sm">
                  {partInfo.additional_details.replacement_frequency}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}; 