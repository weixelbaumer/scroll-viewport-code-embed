# GitHub Code Renderer - Atlassian Connect App

This directory contains the Atlassian Connect app that allows GitHub code to be embedded in Confluence pages using a macro.

## How It Works

The Atlassian Connect app provides a custom macro that integrates with our GitHub Code Renderer service. When a user adds the macro to a Confluence page, they can configure:

1. GitHub repository (owner/repo)
2. File path
3. Branch (optional, defaults to main)
4. Line range (optional)
5. Syntax highlighting theme

The macro then fetches and displays the code with syntax highlighting directly in the Confluence page.

## Installation

To install the Atlassian Connect app in your Confluence instance:

1. Deploy the GitHub Code Renderer service to a publicly accessible URL with HTTPS.
2. Update the `baseUrl` in `atlassian-connect.json` to match your deployed service URL.
3. Make sure the GitHub icon is available at `/atlassian-connect/github-icon.png`.
4. In your Confluence instance, go to Settings > Manage apps.
5. Click "Upload app" and enter the URL to your deployed descriptor: `https://your-domain.com/atlassian-connect`.

## Configuration

### Server Configuration

The server needs to be configured with the appropriate CORS settings to allow requests from your Confluence domain. Update the `ALLOWED_ORIGINS` environment variable to include your Confluence domain.

Example:
```
ALLOWED_ORIGINS=https://your-company.atlassian.net,https://your-company-dev.atlassian.net
```

### GitHub Authentication

For private repositories, configure the `GITHUB_TOKEN` environment variable with a GitHub personal access token that has read access to the repositories.

## Usage with Scroll Viewport

This macro provides a better solution than the text marker approach for Scroll Viewport, as it's a fully supported Confluence macro. When Scroll Viewport processes pages, it will properly handle the macro and maintain the GitHub code embed.

## Troubleshooting

### Macro Not Appearing

If the macro doesn't appear in the macro browser:
1. Check that the app is properly installed
2. Verify the baseUrl in the atlassian-connect.json is correct
3. Check browser console for errors

### Code Not Rendering

If the code doesn't render:
1. Verify the GitHub URL is publicly accessible
2. Check that the repository, path, and branch are correct
3. For private repositories, ensure the GitHub token has access
4. Check browser console for errors

## Development

During development, you can use ngrok to expose your local server:

### Testing with ngrok (Quick Method)

1. Install ngrok:
   ```
   brew install ngrok/ngrok/ngrok  # macOS with Homebrew
   ```
   Or download from: https://ngrok.com/download

2. Run the setup script:
   ```
   node ngrok-setup.js
   ```
   This will:
   - Start ngrok pointing to port 3000
   - Get the public URL from ngrok
   - Update the Atlassian Connect descriptor with the correct baseUrl

3. In a separate terminal, start the server:
   ```
   node server.js
   ```

4. Install in Confluence:
   - Go to your Confluence instance > Settings > Manage apps
   - Click "Upload app"
   - Enter the ngrok URL + `/atlassian-connect/` (e.g., `https://abcd-123-456-789.ngrok.io/atlassian-connect/`)

### Manual ngrok setup

If the automatic setup doesn't work:

1. Start ngrok manually:
   ```
   ngrok http 3000
   ```

2. Copy the HTTPS URL (e.g., `https://abcd-123-456-789.ngrok.io`)

3. Update the `baseUrl` in `atlassian-connect.json`:
   ```json
   "baseUrl": "https://abcd-123-456-789.ngrok.io",
   ```

4. Start the server:
   ```
   node server.js
   ```
   
5. Install in Confluence as described above. 