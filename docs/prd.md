# Brownfield Product Requirements Document (PRD): iText Knowledge Base Migration

#### 1. Existing Project Overview
The current system, `kb.itextpdf.com`, is a public-facing developer knowledge base for the iText SDK and its four sub-products. The content is managed in four corresponding spaces within Confluence Cloud and is rendered as a static website by the third-party app "Scroll Viewport by K15T". Its core function is to provide searchable, SEO-indexed documentation and over 100 live Java and C# code examples managed via GitHub.

#### 2. Enhancement Scope Definition
This project involves a full migration of the knowledge base from the Scroll Viewport platform to Refined.com. The primary goals of the enhancement are to successfully migrate all content, establish a new and improved design, implement a fully functional embed solution using JDoodle.com for live code examples, and to diagnose and resolve critical SEO issues with Bing Search Console.

#### 3. Goals and Background Context
**Goals**
* Successfully migrate the 4-space Confluence knowledge base to the Refined.com platform.
* Implement a 100% working JDoodle.com embed feature for displaying live GitHub code samples.
* Resolve the existing Bing Search Console penalty and improve the site's overall SEO health.
* Remodel and improve the user interface and design over the previous implementation.

**Background Context**
The existing Scroll Viewport knowledge base is facing critical issues that undermine its effectiveness. A key feature—the embedding of interactive code examples via JDoodle.com—is non-functional, degrading the developer experience. Furthermore, the site is penalized by Bing Search Console, severely impacting its visibility. This migration to Refined.com is an opportunity to build a more robust and modern platform, fix these core issues, and improve the overall design and SEO performance.

#### 4. Requirements
**Functional Requirements**
* **FR1**: The system must display embedded, interactive JDoodle code examples on a knowledge base page, with the source code being pulled directly from a provided raw GitHub.com URL.
* **FR2**: Migrate and adapt the existing custom JavaScript functionalities from the Scroll Viewport site to the new Refined.com platform. This includes:
    * Canonical Link Injection
    * Footer Privacy Policy Link Injection
    * Bing Search Console Meta Tag
    * Legacy Notice Injection
    * Release Version Variable Changer
    * "Did you know?" Info Box Injection

**Non-Functional Requirements**
* **NFR1 (SEO)**: The new site's architecture and content structure must be designed to eliminate the duplicate content issues suspected of causing the current Bing Search Console penalty.
* **NFR2 (Performance)**: Pages, including those with JDoodle embeds, must be optimized for performance, with a target load time of under 3 seconds on a standard connection.
* **NFR3 (Portability)**: The JDoodle embed functionality must be developed in a modular way, separating the core, reusable logic from the platform-specific integration code to ensure portability for future use on other platforms like Scroll Sites.

**Compatibility Requirements**
* **CR1 (Branding)**: The new knowledge base design must be visually consistent with the main `itextpdf.com` corporate branding guidelines.

#### 5. Epic 1: Migrate and Enhance the iText Knowledge Base to the Refined.com Platform
*The goal of this epic is to deliver a fully functional, redesigned, and SEO-healthy knowledge base on the new platform, complete with all the required custom functionalities.*

**Phase 1: Foundation & Setup**
* **Story 1.1: Apply Corporate Branding and Initial Design Theme**: As a Site Administrator, I want to apply our corporate branding and the new, remodeled design to the existing Refined.com site, so that it provides a modern and visually consistent user experience that aligns with our brand identity.
* **Story 1.2: Implement Global Custom Scripts and Styles**: As a Developer, I want to inject the global, platform-adapted JavaScript and CSS into the existing Refined.com site, so that we have a technical foundation for implementing all custom functionalities (JDoodle, legacy notices, etc.).
* **Story 1.3: Establish Foundational SEO Configuration**: As a Site Administrator, I want to implement the foundational technical SEO requirements on the existing Refined.com site, so that we can verify ownership with Bing and begin addressing the duplicate content issues.

**Phase 2: Core Functionality Migration**
* **Story 1.4: Implement JDoodle GitHub Embed**: As a Content Creator, I want to embed an interactive code example from a GitHub URL using a simple placeholder, so that developers can view and interact with live code samples directly on the knowledge base page.
* **Story 1.5: Implement Automated Legacy Notices**: As a Site Administrator, I want to automatically display a "Legacy Notice" banner at the top of all articles from the iText 5 knowledge base, so that users are clearly informed that they are viewing documentation for an older, EOL product.
* **Story 1.6: Implement Dynamic Version Number Replacement**: As a Content Creator, I want to use text variables (e.g., `$release-core-7-variable`) in my articles, so that product version numbers are automatically updated across the entire site from a single, central configuration.

**Phase 3: Content Migration & Validation**
* **Story 1.7: Configure Site Structure and Navigation**: As a Site Administrator, I want to configure the Refined.com site structure and navigation to correctly represent the four distinct product knowledge bases, so that users can easily find and browse content for each product.
* **Story 1.8: Validate Content Rendering and Styling**: As a Content Creator, I want to perform a comprehensive review of the migrated content on the Refined site, so that I can verify that all pages, macros, and styles have been rendered correctly and consistently.

**Phase 4: SEO, Analytics & Go-Live**
* **Story 1.9: Remediate SEO Issues and Submit to Search Engines**: As a Marketing Manager, I want to validate that the new site structure has resolved the duplicate content issues and submit the site to search engines, so that our SEO health improves and the Bing penalty is eventually lifted.
* **Story 1.10: Execute Final Go-Live Plan**: As a Site Administrator, I want to execute the final go-live plan to switch from the old knowledge base to the new Refined.com site, so that all users are seamlessly directed to the new and improved platform.