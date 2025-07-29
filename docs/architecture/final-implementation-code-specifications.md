# Final Implementation Code & Specifications

The following consolidated script should be placed by an administrator into the Refined.com administration panel under Configuration > Custom HTML > At end of BODY. It contains all modules required to achieve the functionality outlined in the PRD.

```html
<script src="https://www.jdoodle.com/assets/jdoodle-pym.min.js" type="text/javascript"></script>

<script type="text/javascript">
(function() {
  'use strict';
  const LOG_PREFIX = '[BMad-Custom-Scripts]';
  console.log(`${LOG_PREFIX} Initializing...`);

  // --- Configuration ---
  const config = {
    legacyNotice: {
      spaceKey: 'IT5KB', // The space key for legacy iText 5 content
      contentSelector: '#rw_main_id', // The selector for the main content area
      html: `
        <div class="confluence-information-macro confluence-information-macro-warning" style="border: 1px solid #d04437; background: #fff8f7; padding: 15px; margin: 10px 0; border-radius: 5px; text-align:left;">
          <h3 class="title" style="color:#d04437; margin-top:0;">⚠️ Legacy notice!</h3>
          <div class="confluence-information-macro-body">
            <span>iText 5 is the previous major version of iText's leading PDF SDK. iText 5 is EOL, and is no longer developed, although we still provide support and security fixes. Switch your project to <a href="https://kb.itextpdf.com/itext">iText 9</a>, our latest version which supports the latest PDF standards and technologies.</span>
          </div>
        </div>`
    },
    versionReplacements: {
      '$release-license-base-variable': '4.2.2',
      '$release-license-remote-variable': '4.2.2',
      '$release-pdfOffice-variable': '2.0.5',
      '$release-pdfOptimizer-variable': '4.0.2',
      '$release-pdfOCR-variable': '4.0.2',
      '$release-core-7-variable': '9.2.0',
      '$release-pdfCalligraph-variable': '5.0.2',
      '$release-pdfHTML-variable': '6.2.0',
      '$release-pdfRender-variable': '2.0.4',
      '$release-pdfSweep-variable': '5.0.2',
      '$release-pdfXFA-variable': '5.0.2',
      '$release-license-variable': '3.1.6',
      '$release-license-volume-variable': '3.1.6'
    },
    seo: {
      bingVerification: '47B3FB3D92DE441C9073DD4A12A888FF'
    }
  };

  // --- Module: JDoodle Activator ---
  function activateJdoodleEmbeds() {
    const placeholders = document.querySelectorAll('.jdoodle-embed:not([data-processed])');
    if (placeholders.length === 0) return;
    
    placeholders.forEach((placeholder, index) => {
      placeholder.setAttribute('data-processed', 'true');
      const url = placeholder.getAttribute('data-url');
      const language = placeholder.getAttribute('data-language');
      if (url && language) {
        if (!placeholder.id) placeholder.id = `jdoodle-auto-${Date.now()}-${index}`;
        try {
          new pym.Parent(placeholder.id, `https://www.jdoodle.com/embed/v1/${language}?url=${encodeURIComponent(url)}`, {});
        } catch (e) {
          console.error(`${LOG_PREFIX} JDoodle Error for #${placeholder.id}:`, e);
          placeholder.textContent = 'Error loading code example.';
        }
      } else {
        placeholder.textContent = 'Configuration error: Missing URL or language.';
      }
    });
  }

  // --- Module: Legacy Notice ---
  function handleLegacyNotices() {
    const currentSpace = (window.location.pathname.match(/\/space\/([^/]+)/) || [])[1];
    const contentArea = document.querySelector(config.legacyNotice.contentSelector);
    const noticeExists = document.querySelector('.confluence-information-macro-warning');

    if (contentArea && currentSpace && currentSpace.toUpperCase() === config.legacyNotice.spaceKey) {
      if (!noticeExists) {
        contentArea.insertAdjacentHTML('afterbegin', config.legacyNotice.html);
      }
    } else if (noticeExists) {
      noticeExists.remove();
    }
  }

  // --- Module: Version Changer ---
  function replaceVersionVariables() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      let originalValue = node.nodeValue;
      let modifiedValue = originalValue;
      for (const [variable, value] of Object.entries(config.versionReplacements)) {
        if (modifiedValue.includes(variable)) {
            modifiedValue = modifiedValue.replaceAll(variable, value);
        }
      }
      if (originalValue !== modifiedValue) {
        node.nodeValue = modifiedValue;
      }
    }
  }

  // --- Module: SEO Handler ---
  function handleSeoTags() {
    // Bing Verification (runs once)
    const bingTagSelector = `meta[name="msvalidate.01"]`;
    if (!document.querySelector(bingTagSelector)) {
      const meta = document.createElement('meta');
      meta.name = 'msvalidate.01';
      meta.content = config.seo.bingVerification;
      document.head.appendChild(meta);
    }

    // Canonical Tag Logic (runs on every change)
    const canonicalTagId = 'bmad-canonical-tag';
    const existingTag = document.getElementById(canonicalTagId);
    const url = window.location.href;
    const shouldAddCanonical = url.includes('/search'); // Update with Refined's search URL structure

    if (shouldAddCanonical && !existingTag) {
      const link = document.createElement('link');
      link.id = canonicalTagId;
      link.rel = 'canonical';
      link.href = window.location.protocol + '//' + window.location.hostname;
      document.head.appendChild(link);
    } else if (!shouldAddCanonical && existingTag) {
      existingTag.remove();
    }
  }

  // --- Main Controller ---
  function onPageChange() {
    // Functions are ordered logically
    handleSeoTags();
    handleLegacyNotices();
    replaceVersionVariables();
    activateJdoodleEmbeds();
  }

  // --- Initialization and Event Listening ---
  // Initial run for static pages or first load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageChange);
  } else {
    onPageChange();
  }

  // Use a MutationObserver to detect page changes in Refined's SPA environment
  const observer = new MutationObserver(onPageChange);
  observer.observe(document.body, { childList: true, subtree: true });

})();
</script>
```