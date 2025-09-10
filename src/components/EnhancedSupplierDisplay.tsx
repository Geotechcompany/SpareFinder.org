import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Phone,
  MapPin,
  DollarSign,
  ShoppingCart,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
  Copy,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import SupplierContactScraper from "./SupplierContactScraper";

interface Supplier {
  name: string;
  url: string;
  price_range?: string;
  shipping_region?: string;
  contact?: string;
  // Enriched contact information from scraper
  contact_info?: {
    emails: string[];
    phones: string[];
    addresses: string[];
    contact_links: string[];
    social_media: Record<string, string>;
    business_hours?: string;
  };
  company_name?: string;
  description?: string;
  price_info?: string;
  business_hours?: string;
  social_media?: Record<string, string>;
  contact_links?: string[];
  scraped_emails?: string[];
  scraped_phones?: string[];
  scraped_addresses?: string[];
  scraping_success?: boolean;
  scraping_error?: string;
}

interface ScrapedContactData {
  success: boolean;
  url: string;
  title: string;
  company_name?: string;
  description?: string;
  contact: {
    emails: string[];
    phones: string[];
    addresses: string[];
    contact_links: string[];
    social_media: Record<string, string>;
    business_hours?: string;
  };
  price_info?: string;
  error?: string;
}

interface EnhancedSupplierDisplayProps {
  suppliers: Supplier[];
  buyLinks: Record<string, string>;
  partName?: string;
  className?: string;
  showScraper?: boolean;
}

export const EnhancedSupplierDisplay: React.FC<
  EnhancedSupplierDisplayProps
> = ({
  suppliers = [],
  buyLinks = {},
  partName = "this part",
  className = "",
  showScraper = true,
}) => {
  const [scrapedData, setScrapedData] = useState<
    Record<string, ScrapedContactData>
  >({});
  const [isScraping, setIsScraping] = useState<Record<string, boolean>>({});
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(
    new Set()
  );

  const handleSupplierClick = (url: string, supplierName: string) => {
    if (url && url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
      toast({
        title: "Opening Supplier Page",
        description: `Redirecting to ${supplierName} for ${partName}`,
      });
    } else {
      toast({
        title: "Invalid Link",
        description: "This supplier link is not available",
        variant: "destructive",
      });
    }
  };

  const scrapeSupplierContact = useCallback(async (supplier: Supplier) => {
    if (!supplier.url || !supplier.url.startsWith("http")) {
      toast({
        title: "Invalid URL",
        description: "Cannot scrape contact information from this URL",
        variant: "destructive",
      });
      return;
    }

    setIsScraping((prev) => ({ ...prev, [supplier.name]: true }));

    try {
      const API_BASE =
        import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/suppliers/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: supplier.url }),
      });

      const data = await response.json();

      if (data.success) {
        setScrapedData((prev) => ({ ...prev, [supplier.name]: data }));
        toast({
          title: "Contact info extracted",
          description: `Successfully scraped contact details from ${supplier.name}`,
        });
      } else {
        toast({
          title: "Scraping failed",
          description: data.error || "Failed to extract contact information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Scraping error:", error);
      toast({
        title: "Scraping error",
        description: "Failed to connect to scraping service",
        variant: "destructive",
      });
    } finally {
      setIsScraping((prev) => ({ ...prev, [supplier.name]: false }));
    }
  }, []);

  const toggleSupplierExpansion = (supplierName: string) => {
    setExpandedSuppliers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supplierName)) {
        newSet.delete(supplierName);
      } else {
        newSet.add(supplierName);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${type} copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Combine suppliers with buy links for comprehensive display
  const allSuppliers = [...suppliers];

  // Add buy links that aren't already in suppliers
  Object.entries(buyLinks).forEach(([key, url]) => {
    const supplierName = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const exists = suppliers.some(
      (s) =>
        s.name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(s.name.toLowerCase())
    );

    if (!exists && url) {
      allSuppliers.push({
        name: supplierName,
        url: url,
        price_range: "",
        shipping_region: "",
        contact: "",
      });
    }
  });

  if (allSuppliers.length === 0) {
    return (
      <Card
        className={`bg-black/20 backdrop-blur-xl border-white/10 ${className}`}
      >
        <CardContent className="p-6 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-lg font-semibold mb-2">
            No Suppliers Found
          </h3>
          <p className="text-gray-400">
            No supplier information is available for {partName} at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Manual Scraper Section */}
      {showScraper && (
        <SupplierContactScraper
          onScrapedData={(data) => {
            // Handle manual scraping results if needed
            console.log("Manual scraping completed:", data);
          }}
        />
      )}

      {/* Suppliers List */}
      <div className="space-y-4">
        {allSuppliers.map((supplier, index) => {
          const isExpanded = expandedSuppliers.has(supplier.name);
          const hasScrapedData = scrapedData[supplier.name];
          const isCurrentlyScraping = isScraping[supplier.name];

          return (
            <motion.div
              key={`${supplier.name}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-white text-lg flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                        {supplier.name}
                      </CardTitle>
                      {supplier.price_range && (
                        <div className="flex items-center mt-1">
                          <DollarSign className="w-4 h-4 text-green-400 mr-1" />
                          <span className="text-green-300 text-sm">
                            {supplier.price_range}
                          </span>
                        </div>
                      )}
                      {supplier.shipping_region && (
                        <div className="flex items-center mt-1">
                          <MapPin className="w-4 h-4 text-blue-400 mr-1" />
                          <span className="text-blue-300 text-sm">
                            {supplier.shipping_region}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {(hasScrapedData || supplier.scraping_success) && (
                        <Badge
                          variant="default"
                          className="bg-green-600/20 text-green-300 border-green-500/30"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Contact Info
                        </Badge>
                      )}
                      {supplier.scraping_success === false && (
                        <Badge
                          variant="destructive"
                          className="bg-red-600/20 text-red-300 border-red-500/30"
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Scraping Failed
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleSupplierClick(supplier.url, supplier.name)
                        }
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSupplierExpansion(supplier.name)}
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="pt-0 space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300 text-sm">
                              Website
                            </Label>
                            <p className="text-gray-200 text-sm font-mono break-all">
                              {supplier.url}
                            </p>
                          </div>
                          {supplier.contact && (
                            <div>
                              <Label className="text-gray-300 text-sm">
                                Contact
                              </Label>
                              <p className="text-gray-200 text-sm">
                                {supplier.contact}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Scraping Section */}
                        <div className="border-t border-white/10 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-gray-300">
                              Contact Information
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => scrapeSupplierContact(supplier)}
                              disabled={
                                isCurrentlyScraping ||
                                !supplier.url.startsWith("http")
                              }
                              className="border-white/20 text-gray-300 hover:bg-white/10"
                            >
                              {isCurrentlyScraping ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Search className="w-4 h-4 mr-1" />
                              )}
                              {isCurrentlyScraping
                                ? "Scraping..."
                                : "Extract Contact Info"}
                            </Button>
                          </div>

                          {/* Scraped Data Display */}
                          {hasScrapedData && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-3"
                            >
                              {hasScrapedData.success ? (
                                <>
                                  {/* Company Info */}
                                  {hasScrapedData.company_name && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <Label className="text-gray-300 text-sm">
                                        Company
                                      </Label>
                                      <p className="text-gray-200 text-sm">
                                        {hasScrapedData.company_name}
                                      </p>
                                    </div>
                                  )}

                                  {/* Contact Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Emails */}
                                    {hasScrapedData.contact.emails.length >
                                      0 && (
                                      <div className="space-y-2">
                                        <Label className="text-gray-300 text-sm flex items-center">
                                          <Mail className="w-3 h-3 mr-1" />
                                          Emails
                                        </Label>
                                        {hasScrapedData.contact.emails
                                          .slice(0, 3)
                                          .map((email, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between bg-white/5 p-2 rounded text-xs"
                                            >
                                              <span className="text-gray-200 font-mono truncate">
                                                {email}
                                              </span>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    email,
                                                    "email"
                                                  )
                                                }
                                                className="h-6 w-6 p-0"
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ))}
                                      </div>
                                    )}

                                    {/* Phones */}
                                    {hasScrapedData.contact.phones.length >
                                      0 && (
                                      <div className="space-y-2">
                                        <Label className="text-gray-300 text-sm flex items-center">
                                          <Phone className="w-3 h-3 mr-1" />
                                          Phones
                                        </Label>
                                        {hasScrapedData.contact.phones
                                          .slice(0, 3)
                                          .map((phone, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between bg-white/5 p-2 rounded text-xs"
                                            >
                                              <span className="text-gray-200 font-mono">
                                                {phone}
                                              </span>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  copyToClipboard(
                                                    phone,
                                                    "phone"
                                                  )
                                                }
                                                className="h-6 w-6 p-0"
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ))}
                                      </div>
                                    )}

                                    {/* Business Hours */}
                                    {hasScrapedData.contact.business_hours && (
                                      <div className="space-y-2">
                                        <Label className="text-gray-300 text-sm flex items-center">
                                          <Clock className="w-3 h-3 mr-1" />
                                          Business Hours
                                        </Label>
                                        <div className="bg-white/5 p-2 rounded text-xs">
                                          <span className="text-gray-200">
                                            {
                                              hasScrapedData.contact
                                                .business_hours
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Social Media */}
                                    {Object.keys(
                                      hasScrapedData.contact.social_media
                                    ).length > 0 && (
                                      <div className="space-y-2">
                                        <Label className="text-gray-300 text-sm flex items-center">
                                          <Users className="w-3 h-3 mr-1" />
                                          Social Media
                                        </Label>
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(
                                            hasScrapedData.contact.social_media
                                          )
                                            .slice(0, 3)
                                            .map(([platform, link]) => (
                                              <Button
                                                key={platform}
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  window.open(link, "_blank")
                                                }
                                                className="h-6 text-xs border-white/20 text-gray-300 hover:bg-white/10"
                                              >
                                                {platform}
                                              </Button>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Price Info */}
                                  {hasScrapedData.price_info && (
                                    <div className="bg-white/5 p-3 rounded-lg">
                                      <Label className="text-gray-300 text-sm flex items-center">
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        Price Information
                                      </Label>
                                      <p className="text-gray-200 text-sm mt-1">
                                        {hasScrapedData.price_info}
                                      </p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center space-x-2 text-red-400 bg-red-600/10 p-3 rounded-lg">
                                  <AlertCircle className="w-4 h-4" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      Scraping Failed
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {hasScrapedData.error}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedSupplierDisplay;
