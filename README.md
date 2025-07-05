# Internal DB Tools VS Code Extension

A VS Code extension that provides advanced database tooling for internal use, including schema discovery, relationship analysis, SQL query execution (with streaming), and ERD generation. Powered by the MCP (Model Context Protocol) backend.

## Features
- **List Schemas**: Discover all available database schemas.
- **Find Related Tables**: Identify tables related by foreign keys or naming conventions.
- **Run SQL Query**: Execute read-only SQL queries and stream large result sets.
- **Generate ERD**: Create entity-relationship diagrams in Mermaid or JSON format.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [VS Code](https://code.visualstudio.com/) (v1.99.0 or newer)

## Setup Instructions

1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd vscode-mcp-wrapper
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure environment variables**
   - You can set the following environment variables to point to your MCP backend:
     - `MCP_BASE` (default: `mcp.internal.example`) - The MCP server URL (protocol will be auto-detected)
     - `MCP_TOKEN` (optional) - Authentication token if required by your MCP server
     - `MCP_ALLOW_INSECURE` (optional) - Set to `true` to allow HTTP fallback if HTTPS is not available
   - For local development, you can add these to your shell profile or use a `.env` loader.

## Build Instructions

To compile the TypeScript source code:
```sh
npm run compile
```
- The compiled extension will be output to the `dist/` directory.

## Running and Debugging in VS Code

1. **Open the project in VS Code**
   ```sh
   code .
   ```

2. **Build the extension** (if you haven't already)
   ```sh
   npm run compile
   ```

3. **Start a debug session**
   - Press `F5` or go to the Run & Debug panel and select **Run Extension**.
   - This will launch a new VS Code window (Extension Development Host) with your extension loaded.

4. **Using the Tools**
   - The extension registers the following tools for use in language model prompts:
     - `db_listSchemas`
     - `db_findRelatedTables`
     - `db_runQuery`
     - `db_generateErd`
   - These tools are available to language models that support the `lmTools` API proposal.

## Packaging for Distribution

To create a VSIX package for distribution:
```sh
npx vsce package
```
- This will generate a `.vsix` file (e.g., `vascode-mcp-wrapper-0.0.1.vsix`) in your project directory.
- You can keep this file anywhere on your computer - it doesn't need to be in a special location.

## Installing and Using the Extension

### **Step 1: Build the VSIX Package**
First, ensure your extension is compiled and packaged:
```sh
npm run compile
npx vsce package
```

### **Step 2: Install the VSIX in VS Code**

1. **Open VS Code**
2. **Open the Command Palette** 
   - **Mac**: `Cmd+Shift+P`
   - **Windows/Linux**: `Ctrl+Shift+P`
3. Type and select: `Extensions: Install from VSIX...`
4. Browse to and select your `.vsix` file
5. VS Code will install the extension
6. **Reload VS Code** if prompted to activate the extension

![Install from VSIX](docs/images/install-from-vsix.png)

### **Step 3: Verify Installation**

1. Go to the **Extensions** sidebar (Extensions icon in the activity bar)
2. Search for "Internal DB Tools" 
3. You should see your extension listed as installed

![Extension Installed](docs/images/extension-installed.png)

### **Step 4: Using the Extension**

Once installed, your extension will be active and the following tools will be available to language models that support the `lmTools` API:

- `db_listSchemas` - List available database schemas
- `db_findRelatedTables` - Find related tables by foreign keys
- `db_runQuery` - Execute read-only SQL queries with streaming
- `db_generateErd` - Generate entity-relationship diagrams

### **Managing the Extension**

- **To uninstall**: Go to Extensions sidebar → Find "Internal DB Tools" → Click gear icon → Select "Uninstall"
- **To update**: Install a new `.vsix` file (VS Code will prompt to replace the old version)
- **To disable**: Use the gear icon in the Extensions panel to disable without uninstalling

![Extension Management](docs/images/extension-management.png)

## Fallback Mechanisms

The extension includes several fallback mechanisms to handle different MCP server configurations:

### **Protocol Detection**
- **HTTPS First**: The extension tries HTTPS first for security
- **HTTP Fallback**: If `MCP_ALLOW_INSECURE=true` is set, it will fallback to HTTP if HTTPS fails
- **Auto-detection**: No need to specify protocol in `MCP_BASE` - just use the hostname

### **Authentication**
- **Optional Token**: If `MCP_TOKEN` is not provided, the extension will connect without authentication
- **Bearer Token**: When provided, uses standard Bearer token authentication

### **Connection Resilience**
- **Retry Logic**: Automatically retries failed connections with exponential backoff
- **Timeout Handling**: Configurable timeouts prevent hanging connections
- **Graceful Degradation**: If MCP server is unavailable, tools return helpful error messages

### **Example Configurations**

```bash
# Basic HTTPS connection
export MCP_BASE="mcp.internal.example"
export MCP_TOKEN="your-auth-token"

# Allow HTTP fallback for development
export MCP_BASE="localhost:3000"
export MCP_ALLOW_INSECURE="true"

# No authentication required
export MCP_BASE="mcp.internal.example"
# MCP_TOKEN not set
```

## Troubleshooting
- Ensure your MCP backend is reachable from your machine.
- Make sure your environment variables are set if using a custom backend or authentication.
- If you encounter build errors, ensure all dependencies are installed and you are using a compatible Node.js version.
- Check the VS Code Developer Console for detailed connection logs.

## License
Internal use only. 