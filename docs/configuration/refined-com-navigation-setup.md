# Refined.com Navigation Configuration Guide

This guide provides step-by-step instructions for configuring the iText Knowledge Base navigation structure on the Refined.com platform.

## Overview

The iText Knowledge Base is organized into four distinct product sections:

1. **iText Core** - Primary PDF SDK (current version)
2. **pdfHTML** - HTML to PDF conversion library
3. **pdfSweep** - Content redaction and cleanup
4. **iText 5 (Legacy)** - End-of-life product with migration guidance

## Required Refined.com Configuration

### 1. Space Configuration

Create four separate spaces in Refined.com with the following configuration:

#### iText Core Space
- **Space Key**: `ITEXT`
- **Space Name**: `iText Core`
- **Description**: `Primary PDF SDK for comprehensive PDF creation and manipulation`
- **URL Pattern**: `/space/ITEXT`

#### pdfHTML Space
- **Space Key**: `PDFHTML`
- **Space Name**: `pdfHTML`
- **Description**: `HTML to PDF conversion with CSS support`
- **URL Pattern**: `/space/PDFHTML`

#### pdfSweep Space
- **Space Key**: `PDFSWEEP`
- **Space Name**: `pdfSweep`
- **Description**: `Content redaction and cleanup functionality`
- **URL Pattern**: `/space/PDFSWEEP`

#### iText 5 Legacy Space
- **Space Key**: `IT5KB`
- **Space Name**: `iText 5 (Legacy)`
- **Description**: `Legacy documentation for iText 5 - End of Life product`
- **URL Pattern**: `/space/IT5KB`

### 2. Navigation Menu Structure

Configure the main navigation menu in Refined.com:

#### Top-Level Navigation
1. **Home** (/)
2. **iText Core** (/space/ITEXT) - Primary/featured
3. **pdfHTML** (/space/PDFHTML)
4. **pdfSweep** (/space/PDFSWEEP)
5. **iText 5 (Legacy)** (/space/IT5KB) - With warning indicator

#### Navigation Hierarchy
Each space should have the following section structure:

**For Current Products (iText Core, pdfHTML, pdfSweep):**
- Getting Started
- Core Features / Product Features
- Advanced Topics / Advanced Usage
- API Reference
- Examples and Tutorials

**For Legacy Product (iText 5):**
- Migration Guide (primary focus)
- Legacy Documentation (archived)

### 3. URL Structure Configuration

Configure clean URLs in Refined.com:

#### URL Pattern
```
/space/{SPACE_KEY}/{section}/{page}
```

#### Examples
- `/space/ITEXT/getting-started/installation-guide`
- `/space/PDFHTML/html-features/supported-tags`
- `/space/PDFSWEEP/redaction-features/text-redaction`
- `/space/IT5KB/migration-guide/api-changes`

### 4. Sidebar Navigation Configuration

#### Sidebar Settings (per space)
- **Position**: Left
- **Width**: 280px
- **Collapsible**: Yes
- **Expand by Default**: Yes
- **Show Product Context**: Yes

#### Mobile Navigation
- **Hamburger Menu**: Enabled
- **Overlay Mode**: Yes
- **Touch Optimized**: Yes
- **Collapsible Sections**: Yes

### 5. Breadcrumb Configuration

Enable breadcrumb navigation with:
- **Show Home**: Yes
- **Show Product**: Yes
- **Show Section**: Yes
- **Separator**: "/"
- **Position**: Below main navigation

### 6. Search Configuration

#### Global Search
- **Enable Global Search**: Yes
- **Cross-Space Search**: Yes
- **Quick Search**: Yes

#### Product-Scoped Search
- **Enable Per-Space Search**: Yes
- **Scope Indicators**: Yes
- **Filter by Product**: Yes

## HTML/CSS Injection

### 1. Custom CSS Injection

Add the navigation enhancement CSS to Refined.com:

**Location**: Configuration > Custom CSS

**Content**: Copy the complete contents of:
- `src/styles/corporate-branding.css` (from Story 1.1)
- `src/styles/navigation-enhancements.css`

### 2. JavaScript Injection

Add the navigation enhancement JavaScript to Refined.com:

**Location**: Configuration > Custom HTML > At end of BODY

**Content**: Add the navigation enhancer module after the main iText Knowledge Base scripts:
- Include `src/scripts/modules/navigation-enhancer.js`

### 3. Complete HTML Injection Template

Use the updated `src/templates/refined-html-injection.html` which includes:
- Corporate branding CSS
- Main JavaScript framework
- JDoodle module
- Navigation enhancer module

## SEO Configuration

### 1. Canonical URLs

Configure canonical URL patterns:
- Use clean URL structure
- Avoid duplicate content issues
- Implement proper redirects for legacy URLs

### 2. Structured Data

Add structured data markup for:
- Site navigation
- Product organization
- Breadcrumb trails

### 3. Meta Tags

Ensure proper meta tags are configured:
- Page titles following pattern: "{Page Title} - {Product Name} - iText Knowledge Base"
- Meta descriptions for each major page
- Product-specific meta tags

## Mobile Responsiveness

### Breakpoints Configuration
- **Mobile**: 768px and below
- **Tablet**: 769px - 1024px
- **Desktop**: 1025px and above

### Mobile Navigation Features
- Collapsible hamburger menu
- Touch-optimized navigation elements
- Swipe gestures for sidebar
- Responsive typography and spacing

## Accessibility Configuration

### WCAG Compliance
- Enable skip navigation links
- Ensure proper heading hierarchy
- Configure alt text for navigation images
- Set up proper focus indicators

### Keyboard Navigation
- Tab order configuration
- Keyboard shortcuts
- Focus management
- Screen reader compatibility

## Testing and Validation

### Pre-Deployment Checklist
- [ ] All four spaces created with correct keys
- [ ] Navigation menus configured
- [ ] URL patterns working correctly
- [ ] Breadcrumbs displaying properly
- [ ] Mobile navigation functional
- [ ] Search working within and across spaces
- [ ] SEO elements present
- [ ] Accessibility compliance verified

### Post-Deployment Testing
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness on various devices
- [ ] Navigation performance and load times
- [ ] Search functionality
- [ ] Link validation
- [ ] SEO crawlability

## Troubleshooting

### Common Issues

#### Navigation Not Displaying
- Verify HTML injection is active
- Check browser console for JavaScript errors
- Confirm space keys match configuration

#### Mobile Navigation Not Working
- Verify touch event handlers are working
- Check viewport meta tag configuration
- Test on actual mobile devices

#### Search Not Working
- Verify search indices are built
- Check space permissions
- Confirm search configuration in Refined.com

#### Styling Issues
- Verify CSS injection is active
- Check for conflicting styles
- Use browser developer tools to debug

### Support Contacts
- **Technical Issues**: Development Team
- **Refined.com Platform**: Refined.com Support
- **Content Issues**: Content Management Team

## Performance Optimization

### Caching Configuration
- Enable browser caching for static assets
- Configure CDN for improved global performance
- Implement proper cache headers

### JavaScript Optimization
- Minify JavaScript if needed
- Use asynchronous loading where possible
- Monitor performance with browser tools

### CSS Optimization
- Combine CSS files where possible
- Use CSS minification
- Optimize for critical rendering path

This configuration guide ensures the iText Knowledge Base navigation structure is properly implemented on the Refined.com platform with optimal user experience and SEO performance.