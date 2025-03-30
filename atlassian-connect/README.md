# GitHub Code Renderer - Atlassian Connect App

This Atlassian Connect app allows GitHub code to be embedded in Confluence pages using a macro.

## How It Works

The GitHub Code Renderer provides a custom macro that integrates with Confluence. When a user adds the macro to a page, they can configure:

1. GitHub URL to the file
2. Line range (optional, e.g., "5-15")
3. Syntax highlighting theme

The macro then fetches and displays the code with syntax highlighting directly in the Confluence page.

## Installation

To install the app in your Confluence instance:

1. Log in to your Confluence instance as an administrator
2. Go to Settings > Manage apps
3. Click "Upload app"
4. Enter the URL to the Atlassian Connect descriptor:
   ```
   https://dev.tandav.com/atlassian-connect.json
   ```
5. Follow the prompts to complete installation

## Scroll Viewport Integration

To make the GitHub Code Renderer work with Scroll Viewport:

1. In your Scroll Viewport site, click **Edit Theme**
2. Go to the **Templates** menu
3. In the **Additional** section, expand the JS editor
4. Copy and paste the JavaScript code from the [documentation page](https://dev.tandav.com/documentation.html#scroll-viewport-integration)
5. Click **Save** to apply the changes

## Troubleshooting

If you encounter issues with the app:

1. Check our [documentation page](https://dev.tandav.com/documentation.html#troubleshooting) for common issues and solutions
2. Make sure you're using a valid GitHub URL to a public repository
3. For Scroll Viewport issues, verify that you've added the custom JavaScript correctly 