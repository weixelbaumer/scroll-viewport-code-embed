# JDoodle GitHub Embed Usage Guide

This document explains how to embed interactive code examples from GitHub repositories using the JDoodle integration in the iText Knowledge Base.

## Basic Usage

To embed an interactive code example from a GitHub repository, use a `div` element with the `jdoodle-embed` class and specify the GitHub URL:

```html
<div class="jdoodle-embed" data-url="https://github.com/owner/repository/blob/main/example.java"></div>
```

## Supported URL Formats

The system supports both GitHub blob URLs and raw URLs:

### GitHub Blob URLs (Recommended)
```html
<div class="jdoodle-embed" data-url="https://github.com/itext/itext7/blob/develop/kernel/src/main/java/com/itextpdf/kernel/pdf/PdfDocument.java"></div>
```

### Raw GitHub URLs
```html
<div class="jdoodle-embed" data-url="https://raw.githubusercontent.com/itext/itext7/develop/kernel/src/main/java/com/itextpdf/kernel/pdf/PdfDocument.java"></div>
```

## Language Detection

The system automatically detects the programming language based on the file extension:

- `.java` → Java
- `.js`, `.javascript` → JavaScript  
- `.py`, `.python` → Python
- `.cpp` → C++
- `.c` → C
- `.cs` → C#
- `.php` → PHP
- `.rb` → Ruby
- `.go` → Go
- `.rs` → Rust
- `.kt` → Kotlin
- `.scala` → Scala
- `.swift` → Swift
- `.ts`, `.typescript` → TypeScript

## Explicit Language Override

You can override the automatic language detection by specifying the `data-language` attribute:

```html
<div class="jdoodle-embed" 
     data-url="https://github.com/owner/repo/blob/main/example.txt" 
     data-language="java">
</div>
```

## Complete Examples

### Java Example
```html
<div class="jdoodle-embed" data-url="https://github.com/itext/itext7/blob/develop/samples/src/main/java/com/itextpdf/samples/sandbox/pdfa/PdfA1a.java"></div>
```

### Python Example
```html
<div class="jdoodle-embed" data-url="https://github.com/python/cpython/blob/main/Tools/demo/beer.py"></div>
```

### JavaScript Example
```html
<div class="jdoodle-embed" data-url="https://github.com/nodejs/node/blob/main/benchmark/buffers/buffer-compare-offset.js"></div>
```

### C# Example with Explicit Language
```html
<div class="jdoodle-embed" 
     data-url="https://github.com/itext/itext7-dotnet/blob/develop/itext/itext.kernel/itext/kernel/pdf/PdfDocument.cs"
     data-language="csharp">
</div>
```

## Error Handling

The system provides helpful error messages for common issues:

- **Invalid GitHub URL format**: The URL doesn't match expected GitHub patterns
- **Unsupported programming language**: File extension is not supported
- **Missing GitHub URL**: The `data-url` attribute is missing
- **Network errors**: Issues fetching code from GitHub

## Styling and Appearance

The embedded code examples will:
- Show a loading animation while fetching code
- Display in a responsive iframe that works on all devices
- Include syntax highlighting appropriate for the detected language
- Allow code execution and modification within the JDoodle environment
- Maintain consistent styling with the iText corporate branding

## Best Practices

1. **Use specific file URLs**: Link directly to the file you want to embed, not the repository root
2. **Choose appropriate examples**: Select code that demonstrates clear concepts and runs successfully
3. **Test your URLs**: Verify that the GitHub URLs are accessible and point to valid code files
4. **Consider file size**: Very large files may take longer to load in the interactive environment
5. **Use stable branches**: Link to stable branches (like `main` or `develop`) rather than feature branches that might be deleted

## Technical Notes

- The system uses JDoodle's embed API for interactive code execution
- Code is fetched directly from GitHub's raw content URLs
- The implementation is SPA-compatible and will work with dynamic page loading
- All embeds are processed automatically when pages load or change
- The system includes comprehensive error handling and logging for troubleshooting

## Troubleshooting

If an embed isn't working:

1. Check that the GitHub URL is correct and accessible
2. Verify the file extension is supported
3. Ensure the repository is public (private repositories may not work)
4. Check browser console for detailed error messages
5. Try using the raw GitHub URL format as an alternative

For technical support or feature requests, contact the development team.