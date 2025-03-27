# Server-Side GitHub Code Renderer

This implementation uses a server-side approach to render GitHub code snippets for use in Confluence pages exported via K15T Scroll Viewport.

## How It Works

1. The server fetches code from GitHub repositories using the GitHub API
2. Code is processed and syntax highlighting is applied using Highlight.js
3. Static HTML/CSS is generated that is compatible with Scroll Viewport's filtering
4. Generated code can be embedded in Confluence pages

## Setup

### Prerequisites

- Node.js 14+
- A GitHub Personal Access Token (for API access)

### Installation

1. Clone this repository
2. Navigate to this directory:
   ```
   cd src/server-side-renderer
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Configure environment variables:
   ```
   cp .env.example .env
   ```
   Then edit `.env` to add your GitHub token

### Usage

#### Start the Server

```
npm start
```

The server will run on port 3000 by default.

#### Request GitHub Code

Make a GET request to:

```
http://localhost:3000/github-code?repo=owner/repo&path=path/to/file&branch=main
```

Parameters:
- `repo`: GitHub repository in the format owner/repo
- `path`: Path to the file within the repository
- `branch`: (Optional) Branch name, defaults to main
- `lines`: (Optional) Line range, e.g., "10-20"

#### Example Request

```
http://localhost:3000/github-code?repo=microsoft/vscode&path=src/vs/editor/common/core/range.ts&lines=10-20
```

#### Embedding in Confluence

1. Get the HTML output from the server
2. Add it to your Confluence page using the HTML macro
3. When exported via Scroll Viewport, the code will be rendered as static HTML/CSS

## Customization

### Styling

Edit `styles.css` to customize the appearance of code blocks.

### Additional Languages

By default, the most common programming languages are supported. To add more languages:

1. Edit `server.js`
2. Register additional languages from Highlight.js

## Deployment

For production use, deploy the server to a reliable hosting environment:

1. Set up proper error handling and logging
2. Configure rate limiting
3. Add caching to reduce GitHub API calls
4. Set up HTTPS

## Limitations

- No interactive features (execution, editing)
- Code can become outdated (consider implementing webhooks for updates)
- GitHub API rate limits 