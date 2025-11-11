/**
 * Page-specific SEO configurations
 * Centralized SEO metadata for all pages
 */

import { SEO } from "./SEO";
import { useLocation } from "react-router-dom";

interface PageSEOConfig {
  [key: string]: {
    title: string;
    description: string;
    keywords?: string;
    type?: "website" | "article" | "product" | "profile";
    noindex?: boolean;
    schema?: object;
  };
}

const pageConfigs: PageSEOConfig = {
  "/": {
    title: "SpareFinder - AI-Powered Industrial Spare Parts Identification System",
    description:
      "Identify spare parts instantly with 99.9% accuracy using advanced AI computer vision. Upload images and get instant part identification, specifications, and supplier information for automotive, aerospace, and industrial equipment.",
    keywords:
      "spare parts identification, AI parts recognition, industrial part finder, automotive parts, aerospace components, machine vision, part identification system",
    type: "website",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SpareFinder",
      url: "https://sparefinder.org",
      description:
        "AI-powered spare parts identification system with 99.9% accuracy for industrial, automotive, and aerospace components.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://sparefinder.org/dashboard/upload?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "SpareFinder",
        logo: {
          "@type": "ImageObject",
          url: "https://sparefinder.org/sparefinderlogodark.png",
        },
      },
    },
  },
  "/login": {
    title: "Login - SpareFinder",
    description: "Sign in to your SpareFinder account to access AI-powered spare parts identification tools.",
    noindex: true,
  },
  "/register": {
    title: "Register - SpareFinder",
    description: "Create a free SpareFinder account and start identifying spare parts with AI-powered technology.",
  },
  "/dashboard": {
    title: "Dashboard - SpareFinder",
    description: "Access your SpareFinder dashboard to manage part identifications, view history, and track your analysis results.",
    noindex: true,
  },
  "/dashboard/upload": {
    title: "Upload Parts - SpareFinder",
    description: "Upload images of spare parts for instant AI-powered identification, specifications, and supplier information.",
    noindex: true,
  },
  "/dashboard/history": {
    title: "Analysis History - SpareFinder",
    description: "View your spare parts identification history and access previous analysis results.",
    noindex: true,
  },
  "/reviews": {
    title: "Customer Reviews - SpareFinder",
    description:
      "Read customer reviews and testimonials about SpareFinder's AI-powered spare parts identification system. See what our users say about our 99.9% accuracy and fast identification service.",
    keywords: "SpareFinder reviews, customer testimonials, spare parts identification reviews, AI parts recognition reviews",
    type: "website",
    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "SpareFinder Customer Reviews",
      description: "Customer reviews and testimonials for SpareFinder",
      url: "https://sparefinder.org/reviews",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [],
      },
    },
  },
  "/contact": {
    title: "Contact Us - SpareFinder",
    description: "Get in touch with SpareFinder for support, sales inquiries, or partnership opportunities.",
    type: "website",
  },
  "/privacy-policy": {
    title: "Privacy Policy - SpareFinder",
    description: "Read SpareFinder's privacy policy to understand how we collect, use, and protect your personal information.",
    type: "article",
  },
  "/terms-of-service": {
    title: "Terms of Service - SpareFinder",
    description: "Read SpareFinder's terms of service to understand the terms and conditions for using our AI-powered spare parts identification platform.",
    type: "article",
  },
  "/share/:token": {
    title: "Shared Analysis - SpareFinder",
    description: "View a shared spare parts analysis from SpareFinder's AI-powered identification system.",
    noindex: true,
  },
};

const DEFAULT_DESCRIPTION =
  "Identify spare parts instantly with 99.9% accuracy using advanced AI computer vision. Upload images and get instant part identification, specifications, and supplier information.";

export const PageSEO = () => {
  const location = useLocation();

  // Find matching config (exact match or pattern match)
  const getConfig = () => {
    // Try exact match first
    if (pageConfigs[location.pathname]) {
      return pageConfigs[location.pathname];
    }

    // Try pattern matching for dynamic routes
    for (const [path, config] of Object.entries(pageConfigs)) {
      if (path.includes(":")) {
        const pattern = new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");
        if (pattern.test(location.pathname)) {
          return config;
        }
      }
    }

    // Default config
    return {
      title: "SpareFinder - AI-Powered Industrial Spare Parts Identification",
      description: DEFAULT_DESCRIPTION,
    };
  };

  const config = getConfig();

  return <SEO {...config} />;
};

export default PageSEO;

