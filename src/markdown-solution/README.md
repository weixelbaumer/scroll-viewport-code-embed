# GitHub Code to Markdown Converter

This solution converts GitHub code snippets to Markdown format for use in Confluence pages that will be exported via K15T Scroll Viewport.

## How It Works

1. This tool allows you to specify a GitHub repository, file path, and optional line range
2. It fetches the code from GitHub and converts it to properly formatted Markdown
3. You can then copy the Markdown and paste it into Confluence
4. When exported via Scroll Viewport, the Markdown will be rendered correctly

## Benefits

- Simple implementation - no server or complex setup required
- Uses Confluence's native Markdown support
- Highly compatible with Scroll Viewport's filtering
- Code formatting is preserved in the export

## Usage

### Command Line Tool

```
node github-to-markdown.js --repo=owner/repo --path=path/to/file [--branch=main] [--lines=10-20]
```

Parameters:
- `--repo`: GitHub repository in the format owner/repo
- `--path`: Path to the file within the repository
- `--branch`: (Optional) Branch name, defaults to main
- `--lines`: (Optional) Line range, e.g., "10-20"

Example:
```
node github-to-markdown.js --repo=microsoft/vscode --path=src/vs/editor/common/core/range.ts --lines=10-20
```

### Output

The tool will generate Markdown like this:

````markdown
**File: src/vs/editor/common/core/range.ts (microsoft/vscode)**

```typescript
// Code content here
// with syntax highlighting
```

[View on GitHub](https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/core/range.ts)
````

### Adding to Confluence

1. Run the tool to generate Markdown
2. Copy the output
3. Paste into a Confluence page using the Markdown macro
4. When the page is exported via Scroll Viewport, the code will be rendered correctly

## Installation

1. Clone this repository
2. Navigate to this directory:
   ```
   cd src/markdown-solution
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Limitations

- No interactive features
- Manual process to update code when it changes on GitHub
- Basic styling options
- Requires Confluence Markdown support to be properly configured 