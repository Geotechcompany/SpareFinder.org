# SEO Implementation Guide

## Overview
This document outlines the comprehensive SEO implementation for SpareFinder.org, including dynamic canonical URLs, structured data, and page-specific optimizations.

## Features Implemented

### 1. Dynamic SEO Component (`src/components/SEO.tsx`)
- **Canonical URLs**: Automatically generated based on current route
- **Meta Tags**: Dynamic title, description, keywords
- **Open Graph**: Full OG tags for social media sharing
- **Twitter Cards**: Twitter-specific meta tags
- **Structured Data**: Schema.org JSON-LD markup
- **Robots Meta**: Configurable noindex/nofollow

### 2. Page-Specific SEO (`src/components/PageSEO.tsx`)
- **Centralized Configuration**: All page SEO metadata in one place
- **Route Matching**: Supports exact and pattern matching for dynamic routes
- **Default Fallbacks**: Graceful fallback to default SEO values

### 3. Enhanced Structured Data
- **Organization Schema**: Company information and contact points
- **SoftwareApplication Schema**: Application details, ratings, features
- **WebSite Schema**: Site-wide information with search action
- **Article Schema**: For blog posts and content pages (when needed)

### 4. Sitemap (`public/sitemap.xml`)
- **Public Pages**: Only public-facing pages included
- **Updated Dates**: Current lastmod dates
- **Priorities**: Appropriate priority values for each page
- **Change Frequency**: Realistic changefreq values

### 5. Robots.txt (`public/robots.txt`)
- **Crawl Directives**: Clear allow/disallow rules
- **Bot-Specific Rules**: Special rules for Googlebot and Bingbot
- **Sitemap Reference**: Points to sitemap.xml
- **Private Areas**: Blocks admin, dashboard, and API routes

## Usage

### Automatic SEO (Recommended)
The `PageSEO` component is automatically applied to all routes via `App.tsx`:

```tsx
<BrowserRouter>
  <PageSEO />
  <Routes>
    {/* Your routes */}
  </Routes>
</BrowserRouter>
```

### Manual SEO Override
For pages that need custom SEO, use the `SEO` component directly:

```tsx
import { SEO } from "@/components/SEO";

const MyPage = () => {
  return (
    <>
      <SEO
        title="Custom Page Title"
        description="Custom description"
        canonical="https://sparefinder.org/custom-page"
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          // ... custom schema
        }}
      />
      {/* Page content */}
    </>
  );
};
```

## Page Configurations

### Homepage (`/`)
- **Title**: "SpareFinder - AI-Powered Industrial Spare Parts Identification System"
- **Description**: Full feature description
- **Schema**: WebSite, SoftwareApplication, Organization
- **Priority**: 1.0

### Reviews Page (`/reviews`)
- **Title**: "Customer Reviews - SpareFinder"
- **Description**: Reviews and testimonials
- **Schema**: CollectionPage
- **Priority**: 0.9

### Contact Page (`/contact`)
- **Title**: "Contact Us - SpareFinder"
- **Description**: Contact information
- **Priority**: 0.8

### Legal Pages (`/privacy-policy`, `/terms-of-service`)
- **Type**: Article
- **Priority**: 0.7
- **Change Frequency**: Yearly

## Canonical URLs

Canonical URLs are automatically generated based on:
1. Current route path
2. Query parameters (excluding tracking parameters)
3. Custom canonical override (if provided)

Format: `https://sparefinder.org{pathname}`

Example:
- Route: `/reviews?page=2`
- Canonical: `https://sparefinder.org/reviews`

## Structured Data Types

### Organization
- Company name, logo, description
- Social media profiles
- Contact information

### SoftwareApplication
- Application details
- Features list
- Ratings and reviews
- Pricing information

### WebSite
- Site-wide information
- Search action (for Google site search)
- Publisher information

## Best Practices

### 1. Title Tags
- Keep under 60 characters
- Include brand name
- Be descriptive and keyword-rich
- Unique for each page

### 2. Meta Descriptions
- Keep under 160 characters
- Include primary keywords
- Include a call-to-action
- Unique for each page

### 3. Canonical URLs
- Always use absolute URLs
- Include trailing slash for homepage
- Remove tracking parameters
- One canonical per page

### 4. Structured Data
- Validate with Google's Rich Results Test
- Keep data accurate and up-to-date
- Use appropriate schema types
- Don't mark up hidden content

### 5. Robots Meta
- Use `noindex` for private pages (dashboard, admin)
- Use `nofollow` for user-generated content (if needed)
- Allow indexing for public pages

## Testing

### Google Rich Results Test
https://search.google.com/test/rich-results

### Schema.org Validator
https://validator.schema.org/

### Google Search Console
- Submit sitemap: `https://sparefinder.org/sitemap.xml`
- Monitor indexing status
- Check for errors

### Meta Tags Validation
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

## Maintenance

### Regular Updates
1. **Sitemap**: Update lastmod dates when content changes
2. **Structured Data**: Keep ratings and reviews updated
3. **Meta Descriptions**: Refresh for important pages
4. **Canonical URLs**: Verify after route changes

### Monitoring
1. **Google Search Console**: Monitor indexing and errors
2. **Analytics**: Track organic search traffic
3. **Rich Results**: Monitor structured data performance
4. **Page Speed**: Ensure fast loading times

## Files Modified/Created

1. `src/components/SEO.tsx` - Main SEO component
2. `src/components/PageSEO.tsx` - Page-specific SEO configuration
3. `src/App.tsx` - Integrated PageSEO component
4. `public/sitemap.xml` - Updated sitemap
5. `public/robots.txt` - Enhanced robots.txt
6. `index.html` - Enhanced structured data
7. `public/.well-known/security.txt` - Security contact information

## Next Steps

1. **Submit Sitemap**: Submit to Google Search Console
2. **Verify Structured Data**: Use Google's Rich Results Test
3. **Monitor Performance**: Track in Google Search Console
4. **Update Content**: Regularly update meta descriptions and content
5. **Add More Pages**: Configure SEO for new pages as they're added

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

