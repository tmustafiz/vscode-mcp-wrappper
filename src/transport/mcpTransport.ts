import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpServerConfig } from '../types/mcp';

export class McpTransportFactory {
  /**
   * Create an MCP client with the appropriate transport based on configuration
   */
  static createClient(config: McpServerConfig): { client: Client; transport: any } {
    const client = new Client({
      name: 'vscode-mcp-wrapper',
      version: '0.0.1'
    }, {
      capabilities: {
        tools: {}
      }
    });

    let transport: any;

    switch (config.transport) {
      case 'http':
        transport = this.createHttpTransport(config);
        break;
      case 'sse':
        transport = this.createSseTransport(config);
        break;
      case 'stdio':
        transport = this.createStdioTransport(config);
        break;
      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }

    return { client, transport };
  }

  /**
   * Create HTTP transport
   */
  private static createHttpTransport(config: McpServerConfig): StreamableHTTPClientTransport {
    if (!config.url) {
      throw new Error('URL is required for HTTP transport');
    }

    const normalizedUrl = this.normalizeUrl(config.url);
    const headers: Record<string, string> = {};
    
    if (config.authToken) {
      headers.Authorization = `Bearer ${config.authToken}`;
    }

    return new StreamableHTTPClientTransport(new URL(normalizedUrl), {
      requestInit: {
        headers,
        // Handle insecure connections
        ...(config.allowInsecure && {
          // Note: This is a simplified approach. In production, you might want
          // to handle this more carefully with proper certificate validation
        })
      }
    });
  }

  /**
   * Create SSE transport
   */
  private static createSseTransport(config: McpServerConfig): SSEClientTransport {
    if (!config.url) {
      throw new Error('URL is required for SSE transport');
    }

    const normalizedUrl = this.normalizeUrl(config.url);
    
    // SSE transport doesn't support headers in the same way as HTTP
    // Authentication would need to be handled differently (e.g., via URL parameters)
    return new SSEClientTransport(new URL(normalizedUrl));
  }

  /**
   * Create stdio transport
   */
  private static createStdioTransport(config: McpServerConfig): StdioClientTransport {
    if (!config.command) {
      throw new Error('Command is required for stdio transport');
    }

    return new StdioClientTransport({
      command: config.command,
      args: config.args || []
    });
  }

  /**
   * Normalize URL to handle trailing slashes and ensure proper format
   */
  private static normalizeUrl(url: string): string {
    // If URL doesn't start with protocol, add http://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    
    // Create URL object to normalize it
    const urlObj = new URL(url);
    
    // For servers that expect trailing slash, ensure it's present
    if (urlObj.pathname && !urlObj.pathname.endsWith('/')) {
      urlObj.pathname += '/';
    }
    
    return urlObj.toString();
  }
} 