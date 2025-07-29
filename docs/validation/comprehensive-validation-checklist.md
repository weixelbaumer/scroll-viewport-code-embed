# iText Knowledge Base - Comprehensive Validation Checklist

This document provides detailed validation procedures for all Epic 1 implementations to ensure quality and functionality across the iText Knowledge Base.

## Overview

This validation covers the integration and functionality of:
- **Story 1.1**: Corporate Branding and Initial Design Theme
- **Story 1.2**: Global Custom Scripts and Styles
- **Story 1.3**: SEO Configuration (from earlier)
- **Story 1.4**: JDoodle GitHub Embed
- **Story 1.5**: Automated Legacy Notices (integrated in Story 1.2)
- **Story 1.6**: Dynamic Version Number Replacement (integrated in Story 1.2)
- **Story 1.7**: Site Structure and Navigation

## Validation Categories

### 1. Corporate Branding Validation (Story 1.1)

#### Visual Consistency
- [ ] **Typography**: Consistent font family (Inter) across all pages
- [ ] **Color Scheme**: Corporate colors (#2563eb primary blue) applied consistently
- [ ] **Logo/Branding**: iText branding elements visible and properly styled
- [ ] **Layout**: Consistent spacing and visual hierarchy
- [ ] **Buttons**: Corporate styling applied to interactive elements

#### Responsive Design
- [ ] **Mobile (≤768px)**: Typography scales appropriately, layout remains functional
- [ ] **Tablet (769px-1024px)**: Balanced layout, readable text sizes
- [ ] **Desktop (≥1025px)**: Full desktop experience, optimal spacing
- [ ] **Ultra-wide**: Content doesn't stretch beyond max-width

#### Accessibility
- [ ] **Color Contrast**: Meets WCAG AA standards (4.5:1 for normal text)
- [ ] **Focus Indicators**: Visible focus outlines on interactive elements
- [ ] **High Contrast Mode**: Supports system high contrast preferences
- [ ] **Reduced Motion**: Respects `prefers-reduced-motion` setting

### 2. JavaScript Framework Validation (Story 1.2)

#### Core Framework
- [ ] **Initialization**: `window.iTextKB` object available
- [ ] **Logging**: Console shows framework initialization messages
- [ ] **Module Registration**: All modules register successfully
- [ ] **Error Handling**: Graceful degradation when modules fail

#### SPA Compatibility
- [ ] **Page Navigation**: Functionality persists across page changes
- [ ] **MutationObserver**: Detects DOM changes in SPA environment
- [ ] **Performance**: No memory leaks from repeated initialization
- [ ] **Debouncing**: Page change handlers properly debounced (250ms)

#### Utility Functions
- [ ] **DOM Selection**: Safe querySelector functions work correctly
- [ ] **Logging**: Structured logging with timestamps and prefixes
- [ ] **Error Handling**: safeExecute wrapper prevents crashes

### 3. SEO Elements Validation (Story 1.3 Integration)

#### Meta Tags
- [ ] **Bing Verification**: Meta tag `msvalidate.01` present with correct content
- [ ] **Canonical Links**: Applied on search pages, removed elsewhere
- [ ] **Page Titles**: Follow pattern "{Page} - {Product} - iText Knowledge Base"
- [ ] **Meta Descriptions**: Present and relevant for major pages

#### URL Structure
- [ ] **Clean URLs**: No unnecessary parameters or fragments
- [ ] **Canonical Strategy**: Prevents duplicate content issues
- [ ] **Search Engine Friendly**: Crawlable URL patterns

### 4. JDoodle Integration Validation (Story 1.4)

#### Basic Functionality
- [ ] **Placeholder Detection**: `.jdoodle-embed` elements found and processed
- [ ] **GitHub URL Parsing**: Blob and raw URLs converted correctly
- [ ] **Language Detection**: File extensions mapped to correct languages
- [ ] **Iframe Creation**: JDoodle iframes generated successfully

#### Supported Languages
Test with sample GitHub repositories:
- [ ] **Java**: `.java` files render in Java environment
- [ ] **JavaScript**: `.js` files render in JavaScript environment
- [ ] **Python**: `.py` files render in Python environment
- [ ] **C#**: `.cs` files render in C# environment

#### Error Handling
- [ ] **Invalid URLs**: Clear error messages for malformed GitHub URLs
- [ ] **Unsupported Languages**: Graceful handling of unsupported file types
- [ ] **Network Issues**: Timeout and error handling for GitHub API
- [ ] **JDoodle Failures**: Fallback iframe when pym.js fails

#### Sample Test URLs
```html
<!-- Test these GitHub URL patterns -->
<div class="jdoodle-embed" data-url="https://github.com/itext/itext7/blob/develop/samples/src/main/java/com/itextpdf/samples/sandbox/pdfa/PdfA1a.java"></div>
<div class="jdoodle-embed" data-url="https://raw.githubusercontent.com/python/cpython/main/Tools/demo/beer.py"></div>
<div class="jdoodle-embed" data-url="https://github.com/nodejs/node/blob/main/benchmark/buffers/buffer-compare-offset.js"></div>
```

### 5. Legacy Notices Validation (Story 1.5)

#### Space Detection
- [ ] **iText 5 Space**: Legacy notices appear on `/space/IT5KB` URLs
- [ ] **Other Spaces**: Legacy notices do NOT appear on other product spaces
- [ ] **URL Pattern Matching**: Regex correctly identifies IT5KB space

#### Notice Content
- [ ] **Warning Icon**: ⚠️ emoji displays correctly
- [ ] **Message Content**: Accurate legacy notice with migration link
- [ ] **Styling**: Confluence-style warning box with proper colors
- [ ] **Link Functionality**: Migration links work correctly

#### Dynamic Behavior
- [ ] **SPA Navigation**: Notices added/removed on page changes
- [ ] **Duplicate Prevention**: No duplicate notices on repeated navigation
- [ ] **Performance**: No impact on page load times

### 6. Version Replacement Validation (Story 1.6)

#### Variable Detection
Test these variables are replaced correctly:
- [ ] **$release-core-7-variable** → 9.2.0
- [ ] **$release-pdfHTML-variable** → 6.2.0
- [ ] **$release-pdfSweep-variable** → 5.0.2
- [ ] **$release-license-variable** → 3.1.6

#### Content Processing
- [ ] **Text Content**: Variables in paragraph text replaced
- [ ] **Code Blocks**: Variables in code samples replaced
- [ ] **Multiple Occurrences**: All instances of variables replaced
- [ ] **Performance**: TreeWalker processes efficiently

#### Testing Sample Content
```
Current iText version is $release-core-7-variable
For HTML conversion, use pdfHTML $release-pdfHTML-variable
License management requires $release-license-variable
```

### 7. Navigation Structure Validation (Story 1.7)

#### Product Navigation
- [ ] **Four Products**: iText Core, pdfHTML, pdfSweep, iText 5 (Legacy) visible
- [ ] **Active States**: Current product highlighted correctly
- [ ] **Color Coding**: Each product has distinct color identification
- [ ] **Warning Indicators**: iText 5 shows warning emoji

#### URL Structure
- [ ] **Space URLs**: `/space/ITEXT`, `/space/PDFHTML`, `/space/PDFSWEEP`, `/space/IT5KB`
- [ ] **Navigation Links**: Product links navigate to correct spaces
- [ ] **Breadcrumbs**: Show correct hierarchy (Home > Product > Section)

#### Responsive Behavior
- [ ] **Desktop**: Full horizontal navigation visible
- [ ] **Tablet**: Navigation adapts appropriately
- [ ] **Mobile**: Hamburger menu appears, full navigation hidden
- [ ] **Touch**: Mobile navigation elements are touch-friendly

#### Accessibility
- [ ] **Skip Links**: "Skip to main content" link functional
- [ ] **Keyboard Navigation**: Tab order logical and complete
- [ ] **Screen Readers**: Proper ARIA labels and semantic HTML
- [ ] **Focus Management**: Clear focus indicators throughout

### 8. Cross-Browser Compatibility

Test on these browsers with latest versions:
- [ ] **Chrome**: All functionality works
- [ ] **Firefox**: All functionality works
- [ ] **Safari**: All functionality works (including webkit prefixes)
- [ ] **Edge**: All functionality works

### 9. Performance Validation

#### Load Times
- [ ] **Initial Page Load**: <3 seconds on standard connection
- [ ] **JavaScript Loading**: Framework initializes quickly
- [ ] **CSS Rendering**: No flash of unstyled content (FOUC)
- [ ] **JDoodle Embeds**: Don't block page rendering

#### Resource Usage
- [ ] **Memory Usage**: No memory leaks on navigation
- [ ] **CPU Usage**: JavaScript execution efficient
- [ ] **Network Requests**: Minimal and necessary requests only

#### Tools for Testing
- Lighthouse performance audit
- Browser DevTools Performance tab
- Network throttling simulation

### 10. Integration Testing

#### Feature Interactions
- [ ] **Branding + Navigation**: Corporate styling applied to navigation
- [ ] **JDoodle + Legacy Notices**: Both work on same page if applicable
- [ ] **Version Replacement + JDoodle**: Variables replaced in JDoodle context
- [ ] **Navigation + SEO**: Navigation generates proper canonical links

#### Error Scenarios
- [ ] **JavaScript Disabled**: Graceful degradation where possible
- [ ] **Network Issues**: Appropriate error handling and retry logic
- [ ] **Invalid Content**: Robust handling of malformed HTML/URLs

## Issue Tracking Template

### Issue Severity Levels
- **Critical**: Breaks core functionality, prevents site usage
- **High**: Major feature failure, significant user impact
- **Medium**: Minor feature issue, workaround available
- **Low**: Cosmetic issue, minimal user impact

### Issue Report Format
```
**Issue ID**: [AUTO-GENERATED]  
**Severity**: [Critical/High/Medium/Low]  
**Component**: [Story 1.1/1.2/1.4/etc.]  
**Browser**: [Chrome/Firefox/Safari/Edge] [Version]  
**Device**: [Desktop/Tablet/Mobile] [Screen size]  

**Description**: 
[Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: 
[What should happen]

**Actual Result**: 
[What actually happens]

**Screenshots**: 
[If applicable]

**Console Errors**: 
[Any JavaScript errors]

**Priority**: [High/Medium/Low]
**Assigned**: [Team member]
**Due Date**: [Target resolution date]
```

## Testing Procedures

### 1. Systematic Page Testing
1. Navigate to each product space (ITEXT, PDFHTML, PDFSWEEP, IT5KB)
2. Test sample pages in each space
3. Navigate between products using the product switcher
4. Test breadcrumb navigation
5. Verify all Epic 1 functionality on each page

### 2. Cross-Browser Testing
1. Open same test pages in all supported browsers
2. Test JavaScript functionality
3. Verify CSS rendering consistency
4. Test responsive behavior on different screen sizes

### 3. Performance Testing
1. Run Lighthouse audits on key pages
2. Test with network throttling
3. Monitor JavaScript console for errors
4. Check for memory leaks during navigation

### 4. Accessibility Testing
1. Use screen reader to navigate site
2. Test keyboard-only navigation
3. Verify color contrast with accessibility tools
4. Test with high contrast mode enabled

### 5. Content Migration Validation
1. Compare migrated content with original
2. Verify all images and links work
3. Check formatting consistency
4. Validate special content (tables, code blocks, etc.)

## Sign-off Criteria

All validation must be completed and documented before Epic 1 can be considered ready for production deployment:

- [ ] All checklist items passed or documented with acceptable workarounds
- [ ] Cross-browser compatibility verified
- [ ] Performance targets met (3-second load time)
- [ ] Accessibility compliance validated
- [ ] No critical or high-severity issues remain unresolved
- [ ] All medium/low severity issues documented and prioritized
- [ ] Stakeholder approval received

**Validation Completed By**: ________________  
**Date**: ________________  
**Approved By**: ________________