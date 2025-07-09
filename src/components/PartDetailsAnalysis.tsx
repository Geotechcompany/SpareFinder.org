import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitHubAIPartAnalysisResponse } from '@/lib/api';
import { 
  CarIcon, 
  DollarSignIcon, 
  PackageIcon, 
  TagIcon, 
  InfoIcon 
} from 'lucide-react';

const formatValue = (value: string | string[] | undefined, fallback: string = 'Not available') => {
  if (!value) return fallback;
  return Array.isArray(value) ? value.join(', ') : value;
};

const getConfidenceColor = (confidence: number) => {
  if (confidence > 0.8) return 'bg-green-100 text-green-800';
  if (confidence > 0.5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export const PartDetailsAnalysis: React.FC<{ 
  analysisResult: GitHubAIPartAnalysisResponse 
}> = ({ analysisResult }) => {
  const { predictions, technical_details, purchasing_info } = analysisResult;

  if (!predictions || predictions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <p className="text-muted-foreground">No analysis results available</p>
        </CardContent>
      </Card>
    );
  }

  const topPrediction = predictions[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* Main Part Details */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PackageIcon className="w-5 h-5 text-primary" />
            <span>Part Identification</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <TagIcon className="w-4 h-4 mr-2" />
                Part Name
              </p>
              <p>{formatValue(topPrediction.class_name)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <InfoIcon className="w-4 h-4 mr-2" />
                Confidence
              </p>
              <Badge 
                className={`${getConfidenceColor(topPrediction.confidence)} px-2 py-1`}
              >
                {(topPrediction.confidence * 100).toFixed(2)}%
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <CarIcon className="w-4 h-4 mr-2" />
                Category
              </p>
              <p>{formatValue(topPrediction.category)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <DollarSignIcon className="w-4 h-4 mr-2" />
                Estimated Price
              </p>
              <p>{formatValue(topPrediction.estimated_price)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <InfoIcon className="w-5 h-5 text-primary" />
            <span>Technical Specifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {technical_details && Object.entries(technical_details).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b pb-2 last:border-b-0">
                <p className="text-sm capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm">{formatValue(value as string)}</p>
              </div>
            ))}
            {(!technical_details || Object.keys(technical_details).length === 0) && (
              <p className="text-muted-foreground text-sm text-center">
                No technical details available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchasing Information */}
      {purchasing_info && (
        <Card className="w-full md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSignIcon className="w-5 h-5 text-primary" />
              <span>Purchasing Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchasing_info.global_contacts && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Global Contacts
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {purchasing_info.global_contacts.map((contact, index) => (
                      <li key={index}>{contact}</li>
                    ))}
                  </ul>
                </div>
              )}
              {purchasing_info.recommended_sources && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Recommended Sources
                  </p>
                  <ul className="space-y-2">
                    {purchasing_info.recommended_sources.map((source, index) => (
                      <li 
                        key={index} 
                        className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md"
                      >
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm font-medium hover:underline"
                        >
                          {source.name}
                        </a>
                        {source.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {source.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 