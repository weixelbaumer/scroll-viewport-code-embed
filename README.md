# GitHub Code Renderer for Confluence & Scroll Viewport

A Confluence app that allows users to easily embed syntax-highlighted code from GitHub repositories into Confluence pages, with full compatibility for Scroll Viewport.

## Overview

This app provides two key components:

1. **GitHub Code Block Macro** - A Confluence macro that makes it easy to embed code snippets from GitHub.
2. **Scroll Viewport Integration** - Special handling to ensure code blocks render correctly in Scroll Viewport documentation.

## Features

- Embed code directly from GitHub repositories
- Syntax highlighting for various programming languages
- Multiple themes including light and dark modes
- Line range selection to display only relevant portions of code
- Special handling for Scroll Viewport compatibility
- Direct HTML output option for manual embedding

## Installation

### Prerequisites

- Node.js 14+ and npm
- Cloudflare Account and `cloudflared` CLI tool installed and logged in (`cloudflared login`)
- A registered domain managed by Cloudflare (in this case, `tandav.com`)

### Development Setup

1. **Configure Cloudflare Tunnel**

   ```bash
   cloudflared tunnel create github-fetcher-dev
   ```
   *(Note the Tunnel ID and the path to the `.json` credentials file)*

   Create Config File (`~/.cloudflared/config.yml`):
   Ensure the `credentials-file` path uses the *full absolute path*.
   ```yaml
   tunnel: github-fetcher-dev
   credentials-file: /Users/<your_user>/.cloudflared/<TUNNEL_ID>.json
   ingress:
     - hostname: dev.tandav.com
       service: http://localhost:3000
     - service: http_status:404
   ```

   Route DNS:
   ```bash
   cloudflared tunnel route dns github-fetcher-dev dev.tandav.com
   ```

   Update `atlassian-connect.json`:
   Ensure the `baseUrl` in `atlassian-connect.json` matches your tunnel hostname:
   ```json
   {
       "baseUrl": "https://dev.tandav.com",
   }
   ```

2. **Run the Application**

   Install Dependencies:
   ```bash
   npm install
   ```

   Start the Server:
   ```bash
   npm start
   ```

   Start the Tunnel:
   ```bash
   cloudflared tunnel --config ~/.cloudflared/config.yml run github-fetcher-dev
   ```
   *(Your app should now be accessible at `https://dev.tandav.com`)*

## Installing the Confluence App

1. Log in to your Confluence instance as an administrator
2. Go to Settings > Manage apps
3. Click "Upload app"
4. Enter the URL to your hosted atlassian-connect.json descriptor:
   ```
   https://dev.tandav.com/atlassian-connect.json
   ```
5. Follow the prompts to complete installation

## Configure Scroll Viewport Theme (Required for Viewport Rendering)

1. Go to Confluence Admin -> Scroll Viewport -> Your Theme -> Theme Settings.
2. Find the "Custom JavaScript" section.
3. Add the following script tag:
   ```html
   <script src="https://dev.tandav.com/theme-script.js" defer></script>
   ```
4. Save the theme settings.

## Usage

### Adding a GitHub Code Block to a Confluence Page

1. Edit your Confluence page
2. Click the '+' icon to add a macro
3. Search for and select "GitHub Code Block"
4. In the macro editor:
   - Enter the full GitHub URL to the file you want to display
   - Optionally, specify a line range (e.g., "5-15" or "10" for a single line)
   - Select a syntax highlighting theme
5. Click "Insert" to add the macro to the page
6. Save your Confluence page

### Scroll Viewport Integration

When your content is viewed through Scroll Viewport, the code block will be automatically rendered with syntax highlighting. The macro outputs a special marker that Scroll Viewport's theme script processes to display beautifully formatted code.

## Supported GitHub URLs

You can use any of these URL formats:
- Regular GitHub file URLs: `https://github.com/owner/repo/blob/branch/path/to/file.js`
- Raw GitHub content URLs: `https://raw.githubusercontent.com/owner/repo/branch/path/to/file.js`

## License

Copyright © 2024 Apryse. All rights reserved.

## Support

For support, please contact your Confluence administrator or Apryse technical support. 