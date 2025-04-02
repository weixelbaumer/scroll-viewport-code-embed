# Product Context

## Purpose

This project is a Confluence app designed to render code blocks fetched directly from GitHub repositories within Confluence pages.

## Problem Solved

-   Provides a way to display up-to-date code snippets from GitHub in Confluence.
-   Offers syntax highlighting for readability.
-   Supports displaying specific line ranges from source files.
-   Addresses rendering challenges specifically within Atlassian's Scroll Viewport theme by using a special client-side rendering technique.

## How it Works (Intended)

-   Users insert a "GitHub Code Block" macro onto a Confluence page.
-   They provide a GitHub URL and optional line ranges in the macro editor.
-   The macro fetches the specified code from GitHub.
-   The code is rendered with syntax highlighting.
-   **Scroll Viewport Specific:** When detected in a Scroll Viewport context, instead of rendering the code directly, the macro renders a hidden anchor element containing the necessary details (URL, lines, theme) as data attributes. A separate client-side script (`theme-script.js`, likely part of the Scroll Viewport theme) finds these anchors and fetches/renders the code directly in the browser, bypassing potential server-side rendering issues within Scroll Viewport.