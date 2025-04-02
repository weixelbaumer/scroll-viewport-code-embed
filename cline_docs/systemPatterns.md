# System Patterns

## Architecture Overview

The application is a Confluence Connect app built using Node.js. It appears to follow a standard web application structure with frontend assets and a backend server.

-   **Backend:** Node.js server (likely using Express, although the README mentions a "simplified server" potentially avoiding `atlassian-connect-express`). Handles requests from Confluence, fetches data from GitHub, and serves macro rendering logic. Key files: `server.js`, `src/server.js`, `routes/index.js`, `src/routes/macro.js`.
-   **Frontend:** HTML, CSS, and JavaScript files served to the Confluence macro editor and renderer. Key files: `atlassian-connect/macro-editor.html`, `atlassian-connect/macro-render.html`, `public/macro-editor.html`, `public/scroll-viewport-loader.js`, `public/theme-script.js`.
-   **Configuration:** Uses `atlassian-connect.json` to define the app's capabilities and endpoints for Confluence.
-   **Persistence:** A `database.sqlite` file exists, suggesting some form of local storage, possibly related to the standard `atlassian-connect-express` setup (though the README mentions moving away from this).

## Key Technical Decisions

-   **GitHub Integration:** Fetches code directly from GitHub repositories via API calls (likely using `src/utils/githubHelper.js`).
-   **Scroll Viewport Handling:** Implements a specific client-side rendering strategy for Scroll Viewport environments. This involves rendering hidden anchors (`<a>` tags) with data attributes on the server-side, and then using a client-side script (`theme-script.js`) to detect these anchors and perform the actual code fetching and rendering in the browser. This bypasses potential issues with Scroll Viewport's server-side processing.
-   **Simplified Server:** A move towards a custom server implementation (`server.js` started by `start-simple-server.sh`?) potentially to avoid complexities or issues associated with `atlassian-connect-express`, particularly database interactions.
-   **Tunneling:** Relies on a Cloudflare tunnel (`dev.tandav.com` mentioned in README) for exposing the local development server to the public internet so Confluence Cloud can reach it.

## Code Structure

-   `atlassian-connect/`: Contains core descriptor (`atlassian-connect.json`) and potentially initial HTML templates used by Confluence.
-   `public/`: Static assets served to the client (HTML, JS, CSS, images). Contains the macro editor UI (`macro-editor.html`) and rendering logic/scripts.
-   `src/` or `/`: Contains the backend server logic (`server.js`, routes, utilities). The presence of both `server.js` and `src/server.js` might indicate refactoring or different server versions.
-   `routes/` or `src/routes/`: Defines API endpoints for the server (e.g., handling macro rendering requests).
-   `utils/` or `src/utils/`: Helper functions (e.g., `githubHelper.js`).