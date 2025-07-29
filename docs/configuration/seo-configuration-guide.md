# iText Knowledge Base - SEO Configuration Guide

This guide provides instructions for configuring the foundational SEO settings implemented in Story 1.3.

## Overview

The SEO Handler module provides:
- **Bing Search Console verification** for ownership verification and penalty remediation
- **Canonical link injection** to prevent duplicate content issues
- **Dynamic meta tag management** for improved search visibility
- **URL normalization** for consistent SEO structure
- **Social media meta tags** for better content sharing

## Configuration Steps

### 1. Bing Search Console Verification Setup

#### Step 1: Obtain Bing Verification ID
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Sign in with Microsoft account
3. Add your site: `https://kb.itextpdf.com`
4. Choose "Meta tag" verification method
5. Copy the verification ID from the meta tag content

The meta tag will look like:
```html
<meta name="msvalidate.01" content="YOUR_VERIFICATION_ID_HERE" />
```

#### Step 2: Update SEO Handler Configuration
1. Open `/src/scripts/modules/seo-handler.js`
2. Find the configuration section:
```javascript
config: {
  // Bing Search Console verification meta tag content
  bingVerificationId: 'PLACEHOLDER_BING_VERIFICATION_ID',
```
3. Replace `PLACEHOLDER_BING_VERIFICATION_ID` with your actual verification ID
4. Save the file

#### Step 3: Deploy and Verify
1. Deploy the updated SEO handler to Refined.com
2. Visit any page on kb.itextpdf.com
3. Check browser developer tools to confirm the meta tag is present
4. Return to Bing Webmaster Tools and click "Verify"

### 2. Canonical URL Configuration

The canonical link system is automatically configured with sensible defaults:

#### Default Configuration:
```javascript
canonicalPatterns: {
  // Parameters that cause duplicate content (automatically removed)
  removeParams: ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'],
  
  // Base domain for canonical URLs
  baseDomain: 'https://kb.itextpdf.com'
}
```

#### Customization Options:
To modify which URL parameters are removed or change the base domain:

1. Edit the `canonicalPatterns` configuration in `seo-handler.js`
2. Add additional parameters to `removeParams` array if needed
3. Update `baseDomain` if the primary domain changes

### 3. Meta Tag Customization

#### Default Meta Tags:
```javascript
defaultMetaTags: {
  viewport: 'width=device-width, initial-scale=1.0',
  charset: 'utf-8',
  robots: 'index,follow',
  author: 'iText Group NV'
}
```

#### Customization:
To modify default meta tags, update the `defaultMetaTags` configuration in `seo-handler.js`.

### 4. Refined.com Platform Integration

#### HTML Injection Setup:
The SEO handler is automatically included in the HTML injection template.

1. Copy the updated `/src/templates/refined-html-injection.html` content
2. In Refined.com admin panel, go to:
   - **Configuration** → **Custom HTML** → **At end of BODY**
3. Replace existing content with the updated template
4. Save changes

## Validation and Testing

### Automated Validation
The SEO handler includes built-in validation. To test:

1. Open browser developer console on any KB page
2. Run: `iTextSEO.validateSEO()`
3. Check the validation results

Expected output:
```javascript
{
  validation: {
    bingVerification: true,
    canonicalLink: true,
    metaViewport: true,
    metaCharset: true,
    metaRobots: true,
    pageTitle: true
  },
  allValid: true
}
```

### Manual Validation Checklist

#### Bing Verification Tag
- [ ] Meta tag `<meta name="msvalidate.01" content="...">` present in `<head>`
- [ ] Verification ID matches Bing Webmaster Tools
- [ ] Tag appears on all pages across all product sections

#### Canonical Links
- [ ] Each page has `<link rel="canonical" href="...">` in `<head>`
- [ ] Canonical URLs use clean format without duplicate-causing parameters
- [ ] Canonical URLs point to the correct base domain
- [ ] URLs are properly normalized (no trailing slashes, consistent format)

#### Meta Tags
- [ ] Viewport meta tag present: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] Charset meta tag present: `<meta charset="utf-8">`
- [ ] Robots meta tag present: `<meta name="robots" content="index,follow">`
- [ ] Author meta tag present: `<meta name="author" content="iText Group NV">`

#### Page Titles
- [ ] Titles follow structure: `{Page} - {Product} - iText Knowledge Base`
- [ ] Titles are descriptive and under 60 characters when possible
- [ ] Product names correctly identified from URL structure

#### Social Media Meta Tags
- [ ] Open Graph tags present: `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`
- [ ] Twitter Card tags present: `twitter:card`, `twitter:title`, `twitter:description`
- [ ] Content is appropriate and descriptive

### SEO Audit Tools

Use these tools to validate SEO implementation:

1. **Browser Developer Tools**: Check meta tags and canonical links
2. **Google Search Console**: Monitor for duplicate content issues
3. **Bing Webmaster Tools**: Verify ownership and monitor penalties
4. **Screaming Frog SEO Spider**: Crawl site to validate SEO elements
5. **Lighthouse SEO Audit**: Automated SEO validation

## Troubleshooting

### Common Issues

#### Bing Verification Not Working
- **Issue**: Bing Webmaster Tools can't verify ownership
- **Solution**: 
  1. Check that meta tag is present on homepage
  2. Ensure verification ID is correct
  3. Clear any caches (CDN, browser)
  4. Wait 24-48 hours for DNS propagation

#### Canonical Links Not Appearing
- **Issue**: No canonical links in page head
- **Solution**:
  1. Check browser console for JavaScript errors
  2. Verify SEO handler module is loading
  3. Ensure framework is initialized properly

#### Meta Tags Missing
- **Issue**: Expected meta tags not present
- **Solution**:
  1. Check if existing meta tags are blocking injection
  2. Verify SEO handler initialization
  3. Check for conflicts with Refined.com platform

#### Page Titles Not Optimized
- **Issue**: Titles don't follow expected structure
- **Solution**:
  1. Check URL pattern detection logic
  2. Verify product space URL structure
  3. Test title generation function manually

### Debug Information

To get detailed debug information:

```javascript
// Check if SEO handler is loaded
console.log(window.iTextSEO);

// Check framework integration
console.log(window.iTextKB.modules.seoHandler);

// Run validation
iTextSEO.validateSEO();

// Check current canonical URL generation
iTextSEO.generateCanonicalUrl();
```

## Monitoring and Maintenance

### Regular Checks
1. **Weekly**: Monitor Bing Webmaster Tools for verification status
2. **Monthly**: Run SEO audit tools to validate implementation
3. **Quarterly**: Review and update meta tag strategies

### Performance Impact
The SEO handler is designed for minimal performance impact:
- Executes only on page load/change
- Uses efficient DOM manipulation
- Includes error handling to prevent crashes
- Total execution time: < 50ms

### Updates and Changes
When updating the SEO configuration:
1. Test changes on staging environment first
2. Validate with SEO audit tools
3. Monitor search console after deployment
4. Document any configuration changes

## Support and Resources

- **Implementation**: See `/src/scripts/modules/seo-handler.js`
- **Integration**: Part of iText Knowledge Base framework
- **Validation**: Use browser console validation tools
- **Monitoring**: Bing Webmaster Tools and Google Search Console