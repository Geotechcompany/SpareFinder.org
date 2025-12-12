/**
 * SEO Component for Dynamic Meta Tags and Structured Data
 * Supports canonical URLs, Open Graph, Twitter Cards, and Schema.org markup
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "profile";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  nofollow?: boolean;
  canonical?: string;
  schema?: object;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterSite?: string;
  twitterCreator?: string;
}

const BASE_URL = "https://sparefinder.org";
const DEFAULT_IMAGE = `${BASE_URL}/sparefinderlogodark.png`;
const DEFAULT_TITLE = "SpareFinder - AI-Powered Industrial Spare Parts Identification";
const DEFAULT_DESCRIPTION =
  "Identify spare parts instantly with 99.9% accuracy using advanced AI computer vision. Upload images and get instant part identification, specifications, and supplier information for Engineering spares, aerospace, and industrial equipment.";

export const SEO = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = "spare parts identification, AI parts recognition, industrial part finder, Engineering spares parts, aerospace components, machine vision, part identification system, spare parts database, supplier finder",
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  author = "SpareFinder",
  publishedTime,
  modifiedTime,
  noindex = false,
  nofollow = false,
  canonical,
  schema,
  ogImage = DEFAULT_IMAGE,
  twitterCard = "summary_large_image",
  twitterSite = "@SpareFinder",
  twitterCreator = "@SpareFinder",
}: SEOProps) => {
  const location = useLocation();

  // Generate canonical URL
  const canonicalUrl = canonical || `${BASE_URL}${location.pathname}${location.search.split("?")[0]}`;

  // Generate full URL
  const fullUrl = url || `${BASE_URL}${location.pathname}${location.search}`;

  // Robots meta
  const robotsContent = [
    noindex ? "noindex" : "index",
    nofollow ? "nofollow" : "follow",
  ].join(", ");

  useEffect(() => {
    // Update document title
    document.title = title;

    // Remove existing meta tags (if any)
    const removeMetaTag = (attribute: string, value: string) => {
      const existing = document.querySelector(`meta[${attribute}="${value}"]`);
      if (existing) {
        existing.remove();
      }
    };

    // Remove existing canonical link
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }

    // Remove existing structured data
    const existingSchema = document.querySelector('script[type="application/ld+json"]');
    if (existingSchema && existingSchema.id === "seo-schema") {
      existingSchema.remove();
    }

    // Create and inject meta tags
    const createMetaTag = (attribute: string, value: string, content: string) => {
      removeMetaTag(attribute, value);
      const meta = document.createElement("meta");
      if (attribute.startsWith("property")) {
        meta.setAttribute("property", value);
      } else {
        meta.setAttribute(attribute, value);
      }
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
    };

    // Primary meta tags
    createMetaTag("name", "description", description);
    createMetaTag("name", "keywords", keywords);
    createMetaTag("name", "author", author);
    createMetaTag("name", "robots", robotsContent);

    // Canonical URL
    const canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    canonicalLink.setAttribute("href", canonicalUrl);
    document.head.appendChild(canonicalLink);

    // Open Graph tags
    createMetaTag("property", "og:type", type);
    createMetaTag("property", "og:url", fullUrl);
    createMetaTag("property", "og:title", title);
    createMetaTag("property", "og:description", description);
    createMetaTag("property", "og:image", ogImage);
    createMetaTag("property", "og:image:width", "1200");
    createMetaTag("property", "og:image:height", "630");
    createMetaTag("property", "og:site_name", "SpareFinder");
    createMetaTag("property", "og:locale", "en_US");

    if (publishedTime) {
      createMetaTag("property", "article:published_time", publishedTime);
    }
    if (modifiedTime) {
      createMetaTag("property", "article:modified_time", modifiedTime);
    }
    if (author) {
      createMetaTag("property", "article:author", author);
    }

    // Twitter Card tags
    createMetaTag("name", "twitter:card", twitterCard);
    createMetaTag("name", "twitter:url", fullUrl);
    createMetaTag("name", "twitter:title", title);
    createMetaTag("name", "twitter:description", description);
    createMetaTag("name", "twitter:image", ogImage);
    if (twitterSite) {
      createMetaTag("name", "twitter:site", twitterSite);
    }
    if (twitterCreator) {
      createMetaTag("name", "twitter:creator", twitterCreator);
    }

    // Structured Data (Schema.org)
    const defaultSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SpareFinder",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: description,
      url: fullUrl,
      image: ogImage,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "1250",
      },
      author: {
        "@type": "Organization",
        name: "SpareFinder",
      },
    };

    const finalSchema = schema || defaultSchema;

    const schemaScript = document.createElement("script");
    schemaScript.type = "application/ld+json";
    schemaScript.id = "seo-schema";
    schemaScript.textContent = JSON.stringify(finalSchema);
    document.head.appendChild(schemaScript);

    // Cleanup function
    return () => {
      // Optional: Clean up on unmount if needed
    };
  }, [
    title,
    description,
    keywords,
    image,
    url,
    type,
    author,
    publishedTime,
    modifiedTime,
    noindex,
    nofollow,
    canonical,
    schema,
    ogImage,
    twitterCard,
    twitterSite,
    twitterCreator,
    canonicalUrl,
    fullUrl,
    robotsContent,
    location.pathname,
    location.search,
  ]);

  return null; // This component doesn't render anything
};

export default SEO;

