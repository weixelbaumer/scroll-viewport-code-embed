# Tech Context

## Technologies Used

-   **Runtime:** Node.js (Version `>=14.0.0` required, as per `package.json`)
-   **Backend Framework:** Express (`express` v4.19.2)
-   **Atlassian Connect:** `atlassian-connect-express` (v11.5.3) - Note: README mentions a "simplified server" potentially moving away from this, but it's still listed as a dependency. `atlassian-connect-express-redis` is also listed, suggesting potential Redis use for session/storage, though `sqlite3` is also present.
-   **HTTP Client:** `axios` (v1.6.8), `node-fetch` (v3.3.2) - Used for making requests (e.g., to GitHub API).
-   **Syntax Highlighting:** `highlight.js` (v11.11.1) - Used for rendering code blocks.
-   **Database:** `sqlite3` (v5.1.7) - Likely used by `atlassian-connect-express` for persistence by default.
-   **Caching:** `memory-cache` (v0.2.0)
-   **Environment Variables:** `dotenv` (v16.4.5) - For managing configuration.
-   **Development:** `nodemon` (v3.1.0) - For automatic server restarts during development.

## Development Setup

1.  **Prerequisites:** Node.js (>=14.0.0) and npm installed.
2.  **Clone:** Clone the repository.
3.  **Install Dependencies:** Run `npm install`.
4.  **Tunneling:** A tunnel service (like ngrok or Cloudflare Tunnel) is required to expose the local development server to the internet so Confluence Cloud can communicate with it. The README mentions a Cloudflare tunnel configured for `https://dev.tandav.com`. This URL needs to be correctly set in `atlassian-connect.json` and potentially in environment variables (`AC_LOCAL_BASE_URL` in the `start` script).
5.  **Run Server:**
    *   For development with `atlassian-connect-express` features (potentially using SQLite): `npm start` (which runs `NODE_ENV=development AC_LOCAL_BASE_URL=https://dev.tandav.com FORCE_DB_FILE=true node server.js`)
    *   For the "simplified server" mentioned in README: `./start-simple-server.sh` (This script's content is not visible but likely runs `node server.js` or similar with specific environment settings).
    *   Using nodemon for auto-reload: `npm run dev` (which runs `nodemon server.js`).

## Technical Constraints

-   Requires a publicly accessible HTTPS endpoint for Confluence Cloud to install and communicate with the app (hence the need for tunneling during development).
-   Must handle specific rendering logic for Scroll Viewport environments.
-   Compatibility with Node.js >= 14.