import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

export interface McpClientConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
  allowInsecure?: boolean;
}

export class McpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;

  constructor(config: string | McpClientConfig) {
    const baseUrl = typeof config === 'string' ? config : config.baseUrl;
    const authToken = typeof config === 'string' ? undefined : config.authToken;
    
    // Normalize the URL to handle trailing slashes properly
    const normalizedUrl = this.normalizeUrl(baseUrl);
    
    // Create the MCP client
    this.client = new Client({
      name: 'vscode-mcp-wrapper',
      version: '0.0.1'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Create HTTP transport for the MCP client
    this.transport = new StreamableHTTPClientTransport(new URL(normalizedUrl), {
      requestInit: {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        // NODE_EXTRA_CA_CERTS is handled automatically by Node.js
        // No need to set rejectUnauthorized when using proper CA certificates
      }
    });
  }

  /** Normalize URL to handle trailing slashes and ensure proper format */
  private normalizeUrl(url: string): string {
    // If URL doesn't start with protocol, add http://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    
    // Create URL object to normalize it
    const urlObj = new URL(url);
    
    // For Starlette ASGI servers that expect trailing slash, ensure it's present
    if (urlObj.pathname && !urlObj.pathname.endsWith('/')) {
      urlObj.pathname += '/';
    }
    
    return urlObj.toString();
  }

  /** Initialize MCP connection */
  async init() {
    try {
      console.log('Initializing MCP client...');
      if (!this.transport) {
        throw new Error('Transport not initialized');
      }
      
      // Log the URL being used for debugging
      console.log(`Connecting to MCP server at: ${this.transport['_url']}`);
      
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('MCP client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      throw error;
    }
  }

  /** Check if client is connected */
  isReady(): boolean {
    return this.isConnected;
  }

  /** Get the underlying MCP client for direct access */
  getClient(): Client {
    return this.client;
  }

  /** Call an MCP tool and return result */
  async json<T = unknown>(toolName: string, params: any): Promise<T> {
    if (!this.isReady()) {
      throw new Error('MCP client not initialized. Call init() first.');
    }

    try {
      const result = await this.client.request({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      }, CallToolResultSchema);

      // Extract the result content
      if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
        const firstContent = result.content[0];
        if (firstContent.type === 'text') {
          return firstContent.text as T;
        }
      }
      
      return result as T;
    } catch (error) {
      console.error(`Tool call failed for ${toolName}:`, error);
      throw error;
    }
  }

  /** Call an MCP tool with streaming support */
  async stream<T = unknown>(toolName: string, params: any, onChunk: (data: T) => void) {
    if (!this.isReady()) {
      throw new Error('MCP client not initialized. Call init() first.');
    }

    try {
      const result = await this.client.request({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      }, CallToolResultSchema);

      // Handle the result content
      if (result && result.content && Array.isArray(result.content)) {
        for (const item of result.content) {
          if (item.type === 'text') {
            onChunk(item.text as T);
          }
        }
      }

      return () => {
        // Cancel function - the SDK handles cleanup automatically
      };
    } catch (error) {
      console.error(`Streaming tool call failed for ${toolName}:`, error);
      throw error;
    }
  }
}