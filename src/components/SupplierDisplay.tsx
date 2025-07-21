import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Phone, MapPin, DollarSign, ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Supplier {
  name: string;
  url: string;
  price_range?: string;
  shipping_region?: string;
  contact?: string;
}

interface SupplierDisplayProps {
  suppliers: Supplier[];
  buyLinks: Record<string, string>;
  partName?: string;
  className?: string;
}

export const SupplierDisplay: React.FC<SupplierDisplayProps> = ({
  suppliers = [],
  buyLinks = {},
  partName = "this part",
  className = ""
}) => {
  const handleSupplierClick = (url: string, supplierName: string) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast({
        title: "Opening Supplier Page",
        description: `Redirecting to ${supplierName} for ${partName}`,
      });
    } else {
      toast({
        title: "Invalid Link",
        description: "This supplier link is not available",
        variant: "destructive"
      });
    }
  };

  const copyContact = (contact: string) => {
    if (contact) {
      navigator.clipboard.writeText(contact);
      toast({
        title: "Contact Copied",
        description: `${contact} copied to clipboard`,
      });
    }
  };

  // Combine suppliers with buy links for comprehensive display
  const allSuppliers = [...suppliers];
  
  // Add buy links that aren't already in suppliers
  Object.entries(buyLinks).forEach(([key, url]) => {
    const supplierName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const exists = suppliers.some(s => 
      s.name.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(s.name.toLowerCase())
    );
    
    if (!exists && url) {
      allSuppliers.push({
        name: supplierName,
        url: url,
        price_range: "",
        shipping_region: "",
        contact: ""
      });
    }
  });

  if (allSuppliers.length === 0) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Where to Buy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No supplier information available for this part.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Where to Buy ({allSuppliers.length} Suppliers)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {allSuppliers.slice(0, 6).map((supplier, index) => (
            <div
              key={`${supplier.name}-${index}`}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-blue-900 dark:text-blue-100">
                    {supplier.name}
                  </h4>
                  {supplier.price_range && (
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {supplier.price_range}
                      </span>
                    </div>
                  )}
                </div>
                {supplier.url && (
                  <Button
                    size="sm"
                    onClick={() => handleSupplierClick(supplier.url, supplier.name)}
                    className="ml-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Visit Store
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {supplier.shipping_region && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <Badge variant="outline" className="text-xs">
                      Ships to: {supplier.shipping_region}
                    </Badge>
                  </div>
                )}

                {supplier.contact && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <button
                      onClick={() => copyContact(supplier.contact)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {supplier.contact}
                    </button>
                  </div>
                )}

                {!supplier.price_range && !supplier.shipping_region && !supplier.contact && (
                  <p className="text-xs text-gray-500 italic">
                    Click "Visit Store" to view pricing and availability
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {allSuppliers.length > 6 && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing top 6 suppliers. {allSuppliers.length - 6} more available.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="font-semibold mb-1">💡 Tips for Best Results:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Compare prices across multiple suppliers</li>
            <li>Verify part compatibility before purchase</li>
            <li>Check shipping costs and delivery times</li>
            <li>Look for supplier warranties and return policies</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierDisplay; 