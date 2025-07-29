# Requirements

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