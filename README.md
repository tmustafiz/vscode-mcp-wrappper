# VS Code MCP Wrapper Extension

A VS Code extension that integrates with Model Context Protocol (MCP) servers to provide tools for language models and AI agents in VS Code.

## Features

- **Multi-Server Support**: Connect to multiple MCP servers simultaneously
- **Multiple Transport Types**: Support for HTTP, SSE, and stdio transports using official MCP SDK
- **Dynamic Tool Discovery**: Automatically discover and register tools from MCP servers
- **Agent Mode Integration**: Full support for VS Code's Agent Mode with automatic tool registration
- **Language Model Tools**: Tools are available to AI agents and language models
- **Modern Configuration**: Flexible server configuration through VS Code settings
- **Real-time Status**: Status bar indicator showing connection and tool availability
- **Type Safety**: Full TypeScript support with proper MCP SDK integration
- **Automated Build Process**: Scripts to automatically discover tools and update extension configuration

## Quick Start

### 1. Install the Extension

Install the extension from the VS Code marketplace or build from source:

```bash
# Build from source
npm run precompile compile package
```

### 2. Configure MCP Servers

Configure MCP servers in your VS Code workspace settings (`.vscode/settings.json`):

```json
{
  "mcpWrapper.servers": [
    {
      "name": "postgresql-database-server",
      "transport": "http",
      "url": "http://localhost:8081/db-postgresql/",
      "allowInsecure": true,
      "timeout": 10000,
      "retries": 3
    }
  ]
}
```

### 3. Automatic Tool Discovery

The extension automatically:
- Connects to configured MCP servers
- Discovers available tools and their schemas
- Registers tools for Agent Mode
- Makes tools available to AI agents

### 4. Use in Agent Mode

Once configured, your MCP tools are automatically available to AI agents in VS Code's Agent Mode. Agents can call tools like:
- `list_schemas` - List database schemas
- `list_tables` - List tables in a schema
- `run_query` - Execute SQL queries
- And any other tools provided by your MCP servers

## Configuration

### Server Configuration

Configure MCP servers in your VS Code settings (`.vscode/settings.json`):

```json
{
  "mcpWrapper.servers": [
    {
      "name": "database-server",
      "transport": "http",
      "url": "http://localhost:8000",
      "authToken": "your-auth-token",
      "allowInsecure": false,
      "timeout": 10000,
      "retries": 3
    },
    {
      "name": "file-server",
      "transport": "stdio",
      "command": "python",
      "args": ["-m", "mcp_file_server"],
      "timeout": 5000
    }
  ]
}
```

### Transport Types

#### HTTP Transport
```json
{
  "name": "http-server",
  "transport": "http",
  "url": "http://localhost:8000",
  "authToken": "optional-token",
  "allowInsecure": true
}
```

#### SSE Transport
```json
{
  "name": "sse-server",
  "transport": "sse",
  "url": "http://localhost:8000/events"
}
```

#### stdio Transport
```json
{
  "name": "stdio-server",
  "transport": "stdio",
  "command": "python",
  "args": ["-m", "your_mcp_server"]
}
```

## Environment Variables

The following environment variables are supported for server configurations:

- `MCP_TOKEN`: Authentication token (can be used in server configs)
- `MCP_ALLOW_INSECURE`: Allow insecure connections (set to "true")

## Commands

- `mcp-wrapper.reconnect`: Reconnect to all MCP servers
- `mcp-wrapper.showStatus`: Show current server and tool status
- `mcp-wrapper.listTools`: List all available tools
- `mcp-wrapper.openToolPicker`: Open the AI tool picker
- `mcp-wrapper.testTool`: Test a specific tool
- `mcp-wrapper.showAgentTools`: Show tools available to AI agents

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.101.0+

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure MCP servers in `.vscode/settings.json`
4. Build the extension: `npm run precompile compile package`

### Build Scripts

```bash
npm run discover-tools    # Discover tools from MCP servers and update package.json
npm run precompile        # Run tool discovery before compilation
npm run compile          # Compile TypeScript
npm run watch            # Watch for changes
npm run package          # Create VSIX package
npm run precompile compile package  # Complete build process
```

### Tool Discovery Process

The extension includes an automated tool discovery system:

1. **Discovery Script**: `scripts/discover-and-update-tools.js` connects to configured MCP servers
2. **Schema Extraction**: Automatically extracts tool names, descriptions, and input schemas
3. **Package.json Update**: Updates the `languageModelTools` section with discovered tools
4. **Extension Build**: Tools are compiled into the extension for Agent Mode

### Example Tool Discovery Output

```
🔍 Discovering tools from server: postgresql-database-server
✅ Connected to server: postgresql-database-server
✅ Discovered tools from server: postgresql-database-server
  - list_schemas: list_schemas
  - list_tables: list_tables
  - list_columns: list_columns
  - generate_erd_mermaid: generate_erd_mermaid
  - generate_erd_json: generate_erd_json
  - fuzzy_column_match: fuzzy_column_match
  - sample_column_data: sample_column_data
  - find_related_tables: find_related_tables
  - describe_relationship: describe_relationship
  - run_query: run_query
✅ Updated package.json with 10 discovered tools
```

## Architecture

The extension is built with a modern, modular architecture using the official MCP TypeScript SDK:

### Core Components

- **McpConfigManager**: Manages server configurations from VS Code settings
- **McpTransportFactory**: Creates appropriate transport instances (HTTP, SSE, stdio) using official SDK
- **McpServerManager**: Manages MCP server connections and tool discovery with proper SDK integration
- **CommandRegistry**: Handles command registration and management
- **LanguageModelIntegration**: Provides tools to VS Code's language model system and Agent Mode

### File Structure

```
src/
├── config/
│   └── mcpConfig.ts          # Configuration management
├── transport/
│   └── mcpTransport.ts       # Transport factory using official SDK
├── registry/
│   ├── toolsRegistry.ts      # MCP server and tools management
│   └── commandRegistry.ts    # Command registration and management
├── languageModel/
│   └── languageModelIntegration.ts  # Language model integration
├── types/
│   └── mcp.ts               # Type definitions
└── extension.ts             # Main extension entry point
scripts/
└── discover-and-update-tools.js  # Tool discovery script
```

### SDK Integration

The extension uses the official [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for:
- **Transport Management**: HTTP, SSE, and stdio transports
- **Tool Discovery**: Proper `tools/list` requests with schema validation
- **Tool Execution**: Proper `tools/call` requests with schema validation
- **Type Safety**: Full TypeScript support with Zod schemas

## Usage

### For End Users

1. **Install the extension** from the VS Code marketplace or build from source
2. **Configure MCP servers** in your workspace settings (`.vscode/settings.json`)
3. **Automatic connection** - The extension will connect to configured servers and discover tools
4. **Agent Mode integration** - Tools are automatically available to AI agents
5. **Monitor status** - Use the status bar to see connection status and tool count
6. **Manage connections** - Use commands to reconnect, view tools, and test functionality

### For Developers

1. **Configure MCP servers** in settings
2. **Run tool discovery**: `npm run discover-tools`
3. **Build extension**: `npm run precompile compile package`
4. **Install and test** the generated `.vsix` file

### Example Workflow

1. Configure your MCP servers in settings
2. Run `npm run discover-tools` to discover available tools
3. Build the extension with `npm run precompile compile package`
4. Install the extension
5. Extension automatically connects and registers tools for Agent Mode
6. AI agents can now use the discovered tools

## Agent Mode Support

The extension provides full support for VS Code's Agent Mode:

- **Automatic Tool Registration**: Tools are automatically registered with the language model system
- **Schema Validation**: Input schemas are validated before tool execution
- **Error Handling**: Proper error handling and user feedback
- **Tool Discovery**: Dynamic discovery of tools from MCP servers
- **Status Monitoring**: Real-time status of tool availability

### Available Tool Properties

Each discovered tool includes:
- `name`: Tool identifier
- `displayName`: Human-readable name
- `modelDescription`: Description for language models
- `userDescription`: User-friendly description
- `canBeReferencedInPrompt`: Enable tool for Agent Mode
- `toolReferenceName`: Reference name for the tool
- `inputSchema`: JSON schema for tool inputs

## Troubleshooting

### Connection Issues

- Check server URLs and authentication tokens
- Verify network connectivity
- Check server logs for errors
- Use the status bar to see connection status

### Tool Discovery Issues

- Ensure MCP servers are properly configured
- Check server logs for tool registration errors
- Use the "List Tools" command to verify discovery
- Run `npm run discover-tools` to test discovery manually

### Agent Mode Issues

- Verify tools are properly registered in `package.json`
- Check console for tool registration messages
- Ensure workspace settings are loaded correctly
- Use "Show Agent Tools" command to verify tool availability

### Input Validation Errors

If you see errors like "Additional properties are not allowed ('input', 'tokenizationOptions', 'toolInvokationToken' were unexpected)", this is a known issue with VS Code's language model system passing additional metadata to tools. The extension automatically filters VS Code-specific properties while preserving the `toolInvokationToken` (which contains important MCP session information). If you continue to see issues:

1. Check the console logs for detailed debugging information
2. Restart the extension using the "MCP Wrapper: Reconnect" command
3. Ensure your MCP server's JSON schema is properly configured
4. Try calling the tool again - the issue is usually transient

**Note**: The `toolInvokationToken` property is a valid MCP protocol property that contains session information and should not be filtered out. The extension preserves this property while filtering out only VS Code-specific metadata.

### Configuration Issues

- Validate JSON syntax in settings
- Check required fields for each transport type
- Use the "Show Status" command to verify configuration
- Ensure workspace is opened as a folder, not individual files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 