# K15T Scroll Viewport GitHub Code Embedding Project Rules

This file defines the rules for the project, which aims to develop a solution for embedding GitHub code snippets into Confluence pages exported via K15T Scroll Viewport.

## Project Context

We're working on a solution to integrate JDoodle with K15T Scroll Viewport for displaying GitHub code snippets in knowledge bases. The previous solution relied on JavaScript embeds, which are now filtered/limited by Scroll Viewport.

## Approaches Being Explored

1. JDoodle API Integration with Server-Side Rendering
   - Use JDoodle's API instead of JavaScript embeds
   - Render results as static HTML compatible with Scroll Viewport

2. Confluence Macro Approach with JDoodle Integration
   - Custom Confluence macro using JDoodle's API
   - Renders static content compatible with Scroll Viewport

3. iFrame with restricted Content Security Policy
   - Use iframes with specific restrictions that might pass Scroll Viewport filtering

4. JDoodle Static Output Cache
   - Pre-generate outputs using JDoodle
   - Cache and display as static HTML

5. Proxy JDoodle with Modified Content
   - Modify JDoodle embeds to pass through filtering

6. Direct Collaboration with K15T
   - Explore whitelist options for approved JavaScript sources

## Git Configuration

This project uses custom git user configuration:
- user.name: "Stefan Weixelbaumer"
- user.email: "sweixelbaumer@apryse.com"

## Project Structure

- `/docs` - Documentation for each solution approach
- `/src` - Source code for implementations
- `/examples` - Example implementations for different approaches

## MCP Servers

This project uses the @allpepper/memory-bank-mcp server for tracking project details and documentation. 