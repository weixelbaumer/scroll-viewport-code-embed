# GitHub Code Block Renderer for Confluence

A Confluence Connect app that renders code blocks from GitHub repositories with syntax highlighting. Built using Node.js and Atlassian Connect Express (ACE).

## ⚠️ Important Project Status

This project currently has **multiple implementation attempts** and **unused directories** that should be cleaned up:

### 🗂️ Active Components (Current Implementation)
- **`server.js`** - Main ACE server
- **`src/routes/macro.js`** - Core macro rendering logic 
- **`public/`** - Static files including theme scripts
- **`atlassian-connect.json`** - App descriptor
- **`routes/index.js`** - Legacy route handlers (⚠️ has broken imports)

### 🚮 Unused Directories (Safe to Remove)
- **`scroll-github-fetcher/`** - Abandoned Forge Custom UI experiment
- **`scroll-github-fetcher-uikit/`** - Abandoned Forge UI Kit diagnostic app  
- **`web-bundles/`** - Untracked leftover development files
- **`.bmad-core/`**, **`.bmad-infrastructure-devops/`**, **`.clinerules/`**, **`.cursor/`**, **`.gemini/`**, **`.windsurf/`** - Development tool artifacts (untracked)

### ⚠️ Issues to Fix
1. **Missing utility files**: `routes/index.js` imports non-existent `../utils/githubService` and `../utils/logger`
2. **Multiple server implementations**: Both `server.js` (working) and `src/server.js` (references missing utils) exist
3. **Inconsistent routing**: Different approaches in different files

## Features

- Fetch and display code from GitHub repositories
- Support for line range selections (e.g., `5-10`, `15,20,25`)
- Syntax highlighting using `highlight.js`
- Client-side rendering for Scroll Viewport theme compatibility
- Theme support (github-light, github-dark, monokai, etc.)

## Architecture

### Current Working Implementation
The app uses a **hybrid rendering approach**:

1. **Server-side (ACE)**: `src/routes/macro.js` renders hidden anchor elements with GitHub URL data
2. **Client-side**: `public/theme-script.js` finds anchors and fetches/renders code directly in browser
3. **Static serving**: `public/` directory serves macro editor and theme files

### Why Hybrid Approach?
- **Standard Confluence**: Server-side rendering works normally
- **Scroll Viewport**: Client-side rendering bypasses theme limitations
- **Compatibility**: Works in both environments

## Development Setup

### Prerequisites
- Node.js (>=14.0.0)
- npm
- HTTPS tunnel service (ngrok, Cloudflare Tunnel, etc.)
- Confluence Cloud instance for testing

### Quick Start

#### Option 1: Complete Automated Setup (Recommended)
```bash
# Start everything at once (handles npm install, server, and tunnel)
./start-all.sh

# Or force reinstall dependencies and start everything
./start-all.sh --force-install

# Stop all services
./stop-all.sh

# Or use npm scripts
npm run start-all
npm run start-all-clean  # Force clean install
npm run stop-all        # Stop all services
```

#### Option 2: Manual Setup
1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up tunnel**:
   ```bash
   # Example with ngrok
   ngrok http 3000
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

3. **Update configuration**:
   - Edit `atlassian-connect.json` → set `baseUrl` to your tunnel URL
   - Or set `AC_LOCAL_BASE_URL` environment variable

4. **Start development server**:
   ```bash
   npm run dev
   # Or: npm start
   ```

5. **Install in Confluence**:
   - Go to Confluence → Manage apps → Development mode
   - Upload app: `https://dev.tandav.com/atlassian-connect.json`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `AC_LOCAL_BASE_URL` | Public HTTPS URL for development | `https://dev.tandav.com` |
| `NODE_ENV` | Environment | `development` |
| `DEBUG` | Enable debug logging | `false` |
| `FORCE_DB_SYNC` | Force database sync | `false` |

## Usage

1. **Insert macro**: Use "GitHub Code Block" macro in Confluence editor
2. **Configure**:
   - **GitHub URL**: Full file URL (e.g., `https://github.com/user/repo/blob/main/file.js`)
   - **Line Range**: Optional (e.g., `10-20`, `5,15,25`, `10`)
   - **Theme**: Syntax highlighting theme
3. **Save**: Code renders with syntax highlighting

## File Structure

```
scroll-viewport-code-embed/
├── server.js                    # ✅ Main ACE server (ACTIVE)
├── src/
│   └── routes/
│       └── macro.js            # ✅ Core macro logic (ACTIVE)
├── public/                     # ✅ Static files (ACTIVE)
│   ├── theme-script.js         # ✅ Client-side renderer
│   ├── scroll-viewport-theme.js # ✅ Alternative theme script
│   ├── macro-editor.html       # ✅ Macro configuration UI
│   └── ...
├── routes/
│   └── index.js               # ⚠️ Legacy routes (broken imports)
├── atlassian-connect.json     # ✅ App descriptor (ACTIVE)
├── package.json               # ✅ Dependencies (ACTIVE)
│
├── scroll-github-fetcher/     # 🚮 UNUSED - Forge app experiment
├── scroll-github-fetcher-uikit/ # 🚮 UNUSED - Forge diagnostic app
├── web-bundles/               # 🚮 UNUSED - Development artifacts
└── db/                        # ✅ SQLite database (ACTIVE)
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**:
   - The codebase has broken imports in `routes/index.js`
   - Use the main `server.js` implementation instead

2. **App not loading in Confluence**:
   - Verify `baseUrl` in `atlassian-connect.json` matches tunnel URL exactly
   - Check tunnel is running and accessible via HTTPS
   - Monitor server logs for ACE initialization errors

3. **Database issues**:
   - Delete `db/database.sqlite` and restart server to reset
   - Check database permissions and directory access

4. **Macro not rendering**:
   - Check browser console for JavaScript errors
   - Verify `theme-script.js` is loading correctly
   - Ensure GitHub URLs are public and accessible

### Debug Mode
```bash
DEBUG=true npm start
```

### Startup Script Troubleshooting

**Script won't start:**
```bash
# Make sure script is executable
chmod +x start-all.sh

# Check for dependency issues
./start-all.sh --force-install
```

**Monitor services:**
```bash
# Check logs in separate terminals
tail -f startup.log.server  # Server logs
tail -f startup.log.tunnel  # Tunnel logs  
tail -f startup.log         # Main script logs
```

**Clean restart:**
```bash
# Kill all processes and clean start
killall node
pkill -f cloudflared
./start-all.sh --force-install
```

### Clean Installation
```bash
# Remove old dependencies and database
rm -rf node_modules db/database.sqlite package-lock.json
npm install
npm start
```

## Known Issues & Cleanup Needed

### 🔧 Immediate Fixes Required
1. **Fix broken imports**: `routes/index.js` imports non-existent utility files
2. **Remove unused code**: Multiple server implementations create confusion
3. **Clean up directories**: Remove abandoned Forge experiments

### 🧹 Recommended Cleanup
```bash
# Remove unused directories
rm -rf scroll-github-fetcher/
rm -rf scroll-github-fetcher-uikit/
rm -rf web-bundles/
rm -rf .bmad-* .clinerules .cursor .gemini .windsurf

# Fix or remove broken routes
# Either fix imports in routes/index.js or remove it entirely
```

### 📊 Code Complexity Analysis
- **High complexity**: Client-side theme script with multiple fallbacks
- **Medium complexity**: ACE server setup and authentication
- **Low complexity**: Core macro rendering logic
- **Technical debt**: Multiple implementation attempts, broken imports

## Contributing

Before making changes:
1. **Clean up**: Remove unused directories first
2. **Fix imports**: Resolve broken utility imports
3. **Choose one approach**: Either ACE-only or hybrid, not both
4. **Test thoroughly**: Both standard Confluence and Scroll Viewport

## License

Copyright © 2025 Apryse. All rights reserved.

## Support

For support, contact your Confluence administrator or Apryse technical support.