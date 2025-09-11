import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Search,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  DollarSign,
  Users,
  MessageSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
  contact_links: string[];
  social_media: Record<string, string>;
  business_hours?: string;
  support_forms?: string[];
}

interface ScrapedSupplierData {
  success: boolean;
  url: string;
  title: string;
  company_name?: string;
  description?: string;
  contact: ContactInfo;
  price_info?: string;
  error?: string;
}

interface SupplierContactScraperProps {
  className?: string;
  onScrapedData?: (data: ScrapedSupplierData) => void;
}

export const SupplierContactScraper: React.FC<SupplierContactScraperProps> = ({
  className = "",
  onScrapedData,
}) => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedSupplierData | null>(
    null
  );
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set([...prev, `${type}-${text}`]));
      toast({
        title: "Copied to clipboard",
        description: `${type} copied successfully`,
      });

      // Remove from copied items after 2 seconds
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(`${type}-${text}`);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  }, []);

  const scrapeSupplier = useCallback(async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a supplier website URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setScrapedData(null);

    try {
      const API_BASE =
        import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/suppliers/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setScrapedData(data);
        onScrapedData?.(data);
        toast({
          title: "Scraping completed",
          description: `Successfully extracted contact information from ${
            data.company_name || "supplier"
          }`,
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
      setIsLoading(false);
    }
  }, [url, onScrapedData]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      scrapeSupplier();
    }
  };

  const openLink = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook":
        return "📘";
      case "twitter":
        return "🐦";
      case "linkedin":
        return "💼";
      case "instagram":
        return "📷";
      case "youtube":
        return "📺";
      case "whatsapp":
        return "💬";
      default:
        return "🔗";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Results Section only (input removed per requirements) */}
      <AnimatePresence>
        {scrapedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <Building2 className="w-5 h-5 mr-2 text-green-400" />
                      {scrapedData.company_name ||
                        scrapedData.title ||
                        "Supplier Details"}
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">
                      {scrapedData.url}
                    </p>
                  </div>
                  {/* Hide explicit failed badge */}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {scrapedData.success ? (
                  <>
                    {/* Company Description */}
                    {scrapedData.description && (
                      <div className="space-y-2">
                        <Label className="text-gray-300">Description</Label>
                        <p className="text-gray-200 text-sm bg-white/5 p-3 rounded-lg">
                          {scrapedData.description}
                        </p>
                      </div>
                    )}

                    {/* Contact Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Email Addresses */}
                      {scrapedData.contact.emails.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-gray-300 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-blue-400" />
                            Email Addresses
                          </Label>
                          <div className="space-y-2">
                            {scrapedData.contact.emails.map((email, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-white/5 p-2 rounded-lg"
                              >
                                <span className="text-gray-200 text-sm font-mono">
                                  {email}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    copyToClipboard(email, "email")
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  {copiedItems.has(`email-${email}`) ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Phone Numbers */}
                      {scrapedData.contact.phones.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-gray-300 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-green-400" />
                            Phone Numbers
                          </Label>
                          <div className="space-y-2">
                            {scrapedData.contact.phones.map((phone, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-white/5 p-2 rounded-lg"
                              >
                                <span className="text-gray-200 text-sm font-mono">
                                  {phone}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    copyToClipboard(phone, "phone")
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  {copiedItems.has(`phone-${phone}`) ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Addresses */}
                      {scrapedData.contact.addresses.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-gray-300 flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-red-400" />
                            Addresses
                          </Label>
                          <div className="space-y-2">
                            {scrapedData.contact.addresses.map(
                              (address, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-white/5 p-2 rounded-lg"
                                >
                                  <span className="text-gray-200 text-sm">
                                    {address}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      copyToClipboard(address, "address")
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    {copiedItems.has(`address-${address}`) ? (
                                      <Check className="w-3 h-3 text-green-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Business Hours */}
                      {scrapedData.contact.business_hours && (
                        <div className="space-y-3">
                          <Label className="text-gray-300 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-yellow-400" />
                            Business Hours
                          </Label>
                          <div className="bg-white/5 p-3 rounded-lg">
                            <p className="text-gray-200 text-sm">
                              {scrapedData.contact.business_hours}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Social Media Links */}
                    {Object.keys(scrapedData.contact.social_media).length >
                      0 && (
                      <div className="space-y-3">
                        <Label className="text-gray-300 flex items-center">
                          <Users className="w-4 h-4 mr-2 text-purple-400" />
                          Social Media
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(scrapedData.contact.social_media).map(
                            ([platform, link]) => (
                              <Button
                                key={platform}
                                variant="outline"
                                size="sm"
                                onClick={() => openLink(link)}
                                className="border-white/20 text-gray-300 hover:bg-white/10"
                              >
                                <span className="mr-2">
                                  {getSocialIcon(platform)}
                                </span>
                                {platform.charAt(0).toUpperCase() +
                                  platform.slice(1)}
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Links */}
                    {scrapedData.contact.contact_links.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-gray-300 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-cyan-400" />
                          Contact Pages
                        </Label>
                        <div className="space-y-2">
                          {scrapedData.contact.contact_links
                            .slice(0, 5)
                            .map((link, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => openLink(link)}
                                className="w-full justify-start border-white/20 text-gray-300 hover:bg-white/10"
                              >
                                <Globe className="w-4 h-4 mr-2" />
                                <span className="truncate">{link}</span>
                                <ExternalLink className="w-3 h-3 ml-auto" />
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Price Information */}
                    {scrapedData.price_info && (
                      <div className="space-y-3">
                        <Label className="text-gray-300 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-green-400" />
                          Price Information
                        </Label>
                        <div className="bg-white/5 p-3 rounded-lg">
                          <p className="text-gray-200 text-sm">
                            {scrapedData.price_info}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierContactScraper;
