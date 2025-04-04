# GitHub Code Block Renderer for Confluence

A Confluence Connect app that renders code blocks from GitHub repositories with syntax highlighting. Built using Node.js and Atlassian Connect Express (ACE).

## Features

- Fetch and display code from GitHub repositories.
- Support for line range selections (e.g., `5-10`, `15,20,25`).
- Syntax highlighting for various programming languages using `highlight.js`.
- Special client-side rendering handling for compatibility with Atlassian Scroll Viewport themes.

## How it Works

- **Standard Rendering:** For regular Confluence pages, the app fetches code server-side and renders it directly within the macro output.
- **Scroll Viewport Handling:** When the app detects it's running within a Scroll Viewport context, it renders a hidden anchor element containing the GitHub URL, line range, and theme as data attributes. A separate client-side script (`public/theme-script.js`), intended to be included in the Scroll Viewport theme, finds these anchors and makes direct API calls to fetch and render the code in the browser. This bypasses potential server-side rendering limitations within Scroll Viewport.

## Development Setup

1.  **Prerequisites:**
    *   Node.js (>=14.0.0, see `package.json`) and npm installed.
    *   A tunneling service (like ngrok or Cloudflare Tunnel) to expose your local server to the public internet via HTTPS. Confluence Cloud needs to reach your server.

2.  **Clone:** Clone this repository.
    ```bash
    git clone <repository-url>
    cd scroll-viewport-code-embed
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Configure Tunnel & Base URL:**
    *   Ensure your tunnel service provides a stable HTTPS URL (e.g., `https://your-tunnel-url.com`).
    *   Update the `baseUrl` in `atlassian-connect.json` to match your tunnel URL.
    *   Set the `AC_LOCAL_BASE_URL` environment variable to your tunnel URL when running the server (the `npm start` script does this).

5.  **Run the Server:**
    *   **Recommended for ACE development:** Uses `nodemon` for auto-restarts. Ensure your tunnel URL is set correctly in `atlassian-connect.json` and potentially as an environment variable if needed.
        ```bash
        npm run dev
        ```
    *   **Alternative using `npm start`:** This script explicitly sets `NODE_ENV` and `AC_LOCAL_BASE_URL`. Make sure the base URL matches your tunnel.
        ```bash
        npm start
        ```
    *   The server uses `atlassian-connect-express` with SQLite (`db/database.sqlite`) for storing installation details.

6.  **Install in Confluence:**
    *   Navigate to your Confluence Cloud instance's "Manage apps" section.
    *   Enable development mode.
    *   Upload the app by providing the URL to your running server's descriptor: `https://your-tunnel-url.com/atlassian-connect.json`.

## Usage

1.  Once the app is installed, navigate to a Confluence page.
2.  Insert the "GitHub Code Block" macro using the editor.
3.  Enter the full GitHub file URL (e.g., `https://github.com/user/repo/blob/main/file.js`) and optional line ranges/theme in the macro editor.
4.  Save the page. The macro will render the code with syntax highlighting.

## Troubleshooting

-   **Check Server Logs:** Monitor the console output where you ran `npm run dev` or `npm start` for errors, including Sequelize logs (currently enabled).
-   **Verify Tunnel:** Ensure your tunneling service is running and correctly pointing to your local server (usually `http://localhost:3000`).
-   **Check Base URL:** Double-check that the `baseUrl` in `atlassian-connect.json` exactly matches your public tunnel HTTPS URL.
-   **Database:** ACE uses `db/database.sqlite`. If installation fails repeatedly, deleting this file *before* restarting the server and reinstalling the app can sometimes help reset the state (but shouldn't be needed for normal operation).
-   **Confluence Cache:** Clear your browser cache or use an incognito window if Confluence seems to be showing outdated app information.

## License

Copyright © 2025 Apryse. All rights reserved.

## Support

For support, please contact your Confluence administrator or Apryse technical support.