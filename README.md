# VS Code MCP Wrapper Extension

A VS Code extension that integrates with Model Context Protocol (MCP) servers to provide tools for language models.

## Features

- **Multi-Server Support**: Connect to multiple MCP servers simultaneously
- **Multiple Transport Types**: Support for HTTP, SSE, and stdio transports
- **Dynamic Tool Discovery**: Automatically discover and register tools from MCP servers
- **Language Model Integration**: Provide tools to VS Code's language model system
- **Configuration Management**: Flexible server configuration through VS Code settings
- **Real-time Status**: Status bar indicator showing connection and tool availability

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
  "authToken": "optional-token"
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

### Legacy Configuration

For backward compatibility, you can still use the legacy configuration format:

```json
{
  "mcpWrapper.serverUrl": "http://localhost:8000",
  "mcpWrapper.authToken": "your-token",
  "mcpWrapper.allowInsecure": false,
  "mcpWrapper.timeout": 10000,
  "mcpWrapper.retries": 3
}
```

## Environment Variables

The following environment variables are supported:

- `MCP_BASE`: Base URL for MCP server (legacy)
- `MCP_TOKEN`: Authentication token
- `MCP_ALLOW_INSECURE`: Allow insecure connections (set to "true")

## Commands

- `mcp-wrapper.reconnect`: Reconnect to all MCP servers
- `mcp-wrapper.showStatus`: Show current server and tool status
- `mcp-wrapper.listTools`: List all available tools
- `mcp-wrapper.openToolPicker`: Open the AI tool picker
- `mcp-wrapper.testTool`: Test a specific tool

## Architecture

The extension is built with a modular architecture:

### Core Components

- **McpConfigManager**: Manages server configurations from VS Code settings
- **McpTransportFactory**: Creates appropriate transport instances (HTTP, SSE, stdio)
- **ToolsRegistryManager**: Manages MCP server connections and tool discovery
- **LanguageModelIntegration**: Provides tools to VS Code's language model system

### File Structure

```
src/
├── config/
│   └── mcpConfig.ts          # Configuration management
├── transport/
│   └── mcpTransport.ts       # Transport factory
├── registry/
│   └── toolsRegistry.ts      # Tools registry and server management
├── languageModel/
│   └── languageModelIntegration.ts  # Language model integration
├── types/
│   └── mcp.ts               # Type definitions
└── extension.ts             # Main extension entry point
```

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.101.0+

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Package: `npm run package`

### Building

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch for changes
npm run package    # Create VSIX package
```

## Usage

1. Install the extension
2. Configure MCP servers in your workspace settings
3. The extension will automatically connect to servers and discover tools
4. Tools will be available to language models in VS Code
5. Use the status bar to monitor connection status
6. Use commands to manage connections and view tools

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

### Configuration Issues

- Validate JSON syntax in settings
- Check required fields for each transport type
- Use the "Show Status" command to verify configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 