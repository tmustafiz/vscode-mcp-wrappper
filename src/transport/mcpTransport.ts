import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPReconnectionOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpServerConfig } from '../types/mcp';

export class McpTransportFactory {
  /**
   * Create an MCP client with the appropriate transport based on configuration
   */
  static createClient(config: McpServerConfig): { client: Client; transport: any } {
    try {
      console.log(`Creating MCP client for server: ${config.name} (${config.transport})`);
      
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

      console.log(`Successfully created ${config.transport} transport for server: ${config.name}`);
      return { client, transport };
    } catch (error) {
      console.error(`Failed to create transport for server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Create HTTP transport (Streamable HTTP) with proper configuration
   */
  private static createHttpTransport(config: McpServerConfig): StreamableHTTPClientTransport {
    if (!config.url) {
      throw new Error(`URL is required for HTTP transport (server: ${config.name})`);
    }

    const normalizedUrl = this.normalizeUrl(config.url);
    console.log(`Creating HTTP transport for ${config.name} at ${normalizedUrl}`);
    
    // Configure request options with timeout and headers
    const requestInit: RequestInit = {
      signal: this.createTimeoutSignal(config.timeout),
      headers: {}
    };
    
    // Add authentication header if token is provided
    if (config.authToken) {
      requestInit.headers = {
        ...requestInit.headers,
        Authorization: `Bearer ${config.authToken}`
      };
    }

    // Configure reconnection options with retry settings
    const reconnectionOptions: StreamableHTTPReconnectionOptions = {
      maxReconnectionDelay: 30000, // 30 seconds max
      initialReconnectionDelay: 1000, // 1 second initial
      reconnectionDelayGrowFactor: 1.5, // Exponential backoff
      maxRetries: config.retries || 3
    };

    // Handle insecure connections
    if (config.allowInsecure) {
      // Note: This is a simplified approach. In production, you might want
      // to handle this more carefully with proper certificate validation
      console.warn(`Insecure connections allowed for server: ${config.name}`);
    }

    return new StreamableHTTPClientTransport(new URL(normalizedUrl), {
      requestInit,
      reconnectionOptions
    });
  }

  /**
   * Create SSE transport with proper configuration
   */
  private static createSseTransport(config: McpServerConfig): SSEClientTransport {
    if (!config.url) {
      throw new Error(`URL is required for SSE transport (server: ${config.name})`);
    }

    const normalizedUrl = this.normalizeUrl(config.url);
    console.log(`Creating SSE transport for ${config.name} at ${normalizedUrl}`);
    
    // Configure EventSource options with timeout
    const eventSourceInit: any = {};
    
    // For SSE transport, we need to handle authentication differently
    // since it doesn't support headers in the same way as HTTP
    let finalUrl = normalizedUrl;
    
    if (config.authToken) {
      // Add auth token as URL parameter for SSE
      const url = new URL(normalizedUrl);
      url.searchParams.set('auth_token', config.authToken);
      finalUrl = url.toString();
    }

    // Configure request options for POST requests
    const requestInit: RequestInit = {
      signal: this.createTimeoutSignal(config.timeout),
      headers: {}
    };

    return new SSEClientTransport(new URL(finalUrl), {
      eventSourceInit,
      requestInit
    });
  }

  /**
   * Create stdio transport with proper configuration
   */
  private static createStdioTransport(config: McpServerConfig): StdioClientTransport {
    if (!config.command) {
      throw new Error(`Command is required for stdio transport (server: ${config.name})`);
    }

    console.log(`Creating stdio transport for ${config.name} with command: ${config.command}`);

    // Configure environment variables
    const env: Record<string, string> = {};
    
    // Add authentication token to environment if provided
    if (config.authToken) {
      env.MCP_AUTH_TOKEN = config.authToken;
    }

    // Add timeout to environment if provided
    if (config.timeout) {
      env.MCP_TIMEOUT = config.timeout.toString();
    }

    return new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env,
      stderr: 'pipe' // Capture stderr for better error reporting
    });
  }

  /**
   * Create an AbortSignal with timeout
   */
  private static createTimeoutSignal(timeout?: number): AbortSignal | undefined {
    if (!timeout) {
      return undefined;
    }

    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
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