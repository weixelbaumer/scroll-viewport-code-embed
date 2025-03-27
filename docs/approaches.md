# Approaches to GitHub Code Embedding in Scroll Viewport

This document outlines various approaches to embedding GitHub code snippets in Confluence pages exported via K15T Scroll Viewport.

## Background

K15T Scroll Viewport filters and limits JavaScript embeds, which has broken the previous JDoodle-based GitHub code integration. We need solutions that work within these constraints.

## Approach 1: Server-Side Rendering

### Overview
- Fetch GitHub code on the server
- Pre-render with syntax highlighting
- Deliver static HTML/CSS that passes through Scroll Viewport filters

### Implementation
1. Create a server component that fetches code from GitHub API
2. Render code with syntax highlighting (using libraries like Prism or Highlight.js)
3. Generate static HTML/CSS
4. Embed this static content in Confluence pages

### Pros
- Works without client-side JavaScript
- Reliable and consistent rendering
- Complete control over styling and formatting

### Cons
- Requires server infrastructure
- No interactive features
- Code may become outdated (can be mitigated with scheduled updates)

### Potential Integration Methods
- Custom Confluence macro that calls the server
- Pre-generated code blocks added to Confluence

## Approach 2: Markdown-Based Solution

### Overview
- Convert GitHub code to Markdown format
- Use Confluence's native Markdown support

### Implementation
1. Extract code from GitHub
2. Format as Markdown code blocks
3. Insert into Confluence using native Markdown support
4. Ensure Scroll Viewport correctly processes Markdown

### Pros
- Simple implementation
- Uses native Confluence capabilities
- Likely to work with Scroll Viewport

### Cons
- Limited styling options
- No interactivity
- Manual updates required

### Potential Integration Methods
- Manual Markdown insertion
- Simple tool to convert GitHub links to Markdown

## Approach 3: Custom Confluence Macro

### Overview
- Develop a custom Confluence macro compatible with Scroll Viewport
- Macro handles GitHub code fetching and display

### Implementation
1. Create a Confluence app with a custom macro
2. Macro fetches code from GitHub and renders it
3. Ensure output format is compatible with Scroll Viewport

### Pros
- Deep integration with Confluence
- Could provide rich functionality
- Good user experience for content creators

### Cons
- More complex development
- Requires app installation and maintenance
- Must ensure compatibility with Scroll Viewport

### Potential Integration Methods
- Published Confluence app
- Custom deployment

## Approach 4: Static GitHub Embedding

### Overview
- Use GitHub's native embedding options
- Format in a way compatible with Scroll Viewport

### Implementation
1. Use GitHub's embed code options
2. Modify as needed to comply with Scroll Viewport restrictions
3. Create templates or tools to generate compatible embeds

### Pros
- Leverages GitHub's native capabilities
- Minimal development required
- Official GitHub styling

### Cons
- May still face filtering issues
- Limited customization options
- Dependent on GitHub's embedding features

### Potential Integration Methods
- Direct embed code insertion
- Helper tool to generate compatible embeds

## Approach 5: iFrame with CSP Workaround

### Overview
- Use iFrames with proper Content Security Policy settings
- Display code viewers within iFrames

### Implementation
1. Investigate Scroll Viewport's iFrame handling
2. Create iFrame-based solution with appropriate CSP
3. Host code viewer within the iFrame

### Pros
- Could maintain interactivity
- More display options
- Better isolation

### Cons
- Complex to configure securely
- May still be restricted by Scroll Viewport
- Additional hosting required

### Potential Integration Methods
- Custom-hosted iFrame solution
- Integration with existing code hosting services

## Approach 6: API-Based Solution

### Overview
- Create custom integration using GitHub API
- Build a Scroll Viewport-compatible renderer

### Implementation
1. Use GitHub API to fetch code and metadata
2. Build custom rendering solution
3. Generate output compatible with Scroll Viewport

### Pros
- Highly customizable
- Can incorporate various features
- Independent of GitHub's embedding options

### Cons
- Requires development and maintenance
- API rate limits
- Complexity

### Potential Integration Methods
- Confluence macro
- External service integration
- Pre-generated content

## Recommendation

Based on the constraints and requirements, we recommend exploring **Approach 1 (Server-Side Rendering)** and **Approach 2 (Markdown-Based Solution)** first, as they are most likely to work within Scroll Viewport's limitations while providing a good user experience.

## Next Steps

1. Investigate Scroll Viewport's specific filtering behavior
2. Test basic implementations of Approaches 1 and 2
3. Evaluate results and refine approach
4. Develop full implementation of chosen solution 