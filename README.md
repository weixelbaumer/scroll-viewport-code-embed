# GitHub Code Block Renderer for Confluence

A Confluence app that renders code blocks from GitHub repositories with syntax highlighting.

## Features

- Fetch and display code from GitHub repositories
- Support for line range selections (e.g., 5-10, 15,20,25)
- Syntax highlighting for various programming languages
- Special handling for Scroll Viewport with anchor-based placeholders

## The Scroll Viewport Solution

To solve issues with rendering code in Scroll Viewport, we've implemented a dual approach:

1. When the app is loaded in a Scroll Viewport context (detected via HTTP header), it renders a hidden anchor element with the GitHub URL, line range, and theme stored as data attributes.

2. A client-side script (`theme-script.js`) then detects these anchors and makes direct API calls to fetch and render the code, bypassing the Scroll Viewport limitations.

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Run the server with `./start-simple-server.sh`

## Configuration

The app uses a Cloudflare tunnel to expose the local server to the internet.
The base URL is configured to `https://dev.tandav.com` in the `atlassian-connect.json` file.

## Usage

1. Add the app to your Confluence instance
2. Insert the "GitHub Code Block" macro in your page
3. Enter a GitHub URL and optional line range
4. The macro will render the code with syntax highlighting

## Troubleshooting

If you're having issues:

1. Check the server logs in `simple-server.log`
2. Verify the Cloudflare tunnel is running
3. Ensure the app is properly installed in your Confluence instance

## Simplified Server

We've implemented a simplified server that avoids using atlassian-connect-express to eliminate database-related issues. The server:

1. Processes both traditional and Scroll Viewport requests
2. Generates hidden anchors with unique IDs for Scroll Viewport
3. Logs all requests to a log file for easy debugging

To start the simplified server:

```bash
./start-simple-server.sh
```

## License

Copyright © 2025 Apryse. All rights reserved.

## Support

For support, please contact your Confluence administrator or Apryse technical support. 