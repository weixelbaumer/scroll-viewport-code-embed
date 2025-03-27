# GitHub Code Renderer for Confluence and Scroll Viewport

This service provides a way to embed GitHub code snippets with syntax highlighting in Confluence pages, especially when using K15T Scroll Viewport for documentation publishing.

## Features

- Fetch code from GitHub repositories (public and private with token)
- Apply syntax highlighting with multiple theme options
- Extract specific line ranges from files
- Generate static HTML for embedding in Confluence
- Provide a JavaScript API for dynamic rendering
- Include an Atlassian Connect app for native Confluence integration

## Integration Methods

The GitHub Code Renderer provides several methods for integrating GitHub code snippets:

### 1. Atlassian Connect Macro (Recommended)

A custom Confluence macro that allows users to easily insert and configure GitHub code snippets. This is the most user-friendly and robust solution, especially for Scroll Viewport compatibility.

[Learn more about the Atlassian Connect app](./atlassian-connect/README.md)

### 2. Direct HTML Embedding

Use the `/html` endpoint to get HTML that can be directly embedded in Confluence via the HTML macro.

Example:
```
GET /html?url=https://github.com/user/repo/blob/main/file.js
```

### 3. JavaScript API

Use the `/render` endpoint for a JavaScript interface that dynamically renders code.

### 4. Scroll Viewport Text Marker

For Scroll Viewport Cloud, which filters HTML macros, a text marker approach can be used with custom JavaScript in the Scroll Viewport theme.

[Learn more about Scroll Viewport integration](./public/scroll-viewport.html)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables (copy `.env.example` to `.env`)
4. Start the server:
   ```
   npm start
   ```

## Configuration

Environment variables can be set in a `.env` file:

- `PORT`: Server port (default: 3000)
- `GITHUB_TOKEN`: GitHub personal access token for private repos
- `CACHE_DURATION`: Cache duration in milliseconds (default: 30 minutes)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- `DEBUG`: Enable debug logging (true/false)
- `DEFAULT_THEME`: Default syntax highlight theme (default: github)

## API Endpoints

### HTML Endpoint

```
GET /html?url=GITHUB_URL&theme=THEME&lines=LINES
```

Parameters:
- `url` (required): GitHub URL to the file
- `theme` (optional): Syntax highlighting theme (github, github-dark, monokai, atom-one-dark, vs2015, xcode, dracula)
- `lines` (optional): Line range to extract (e.g., 10-20)

### Render Endpoint

```
GET /render?url=GITHUB_URL&theme=THEME&lines=LINES
```

Parameters are the same as for the HTML endpoint.

### Scroll Viewport Script

```
GET /scroll-viewport-script?url=GITHUB_URL&theme=THEME&lines=LINES
```

Returns a JavaScript file that can be used in a script tag to render GitHub code.

### Atlassian Connect

```
GET /atlassian-connect
```

Returns the Atlassian Connect descriptor for the GitHub Code macro.

## Deployment

### Docker

A Dockerfile is provided to containerize the application:

```
docker build -t github-code-renderer .
docker run -p 3000:3000 -e GITHUB_TOKEN=your_token github-code-renderer
```

### Hosting

The service can be deployed to any hosting platform that supports Node.js applications, such as:

- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- Azure App Service

For production use, ensure the service is secured with HTTPS.

## GitHub Token

For private repositories or to increase rate limits, set the `GITHUB_TOKEN` environment variable with a GitHub personal access token.

Create a token at https://github.com/settings/tokens with the "repo" scope for private repos.

## Security Considerations

- Only fetch from trusted GitHub repositories
- Configure CORS to restrict access from unauthorized domains
- Use HTTPS in production to encrypt data in transit
- Validate input parameters to prevent injection attacks
- Be cautious with displayed code content that might contain sensitive information 