import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServerConfig, McpTool, ToolsRegistry, ToolCallResult } from '../types/mcp';
import { McpConfigManager } from '../config/mcpConfig';
import { McpTransportFactory } from '../transport/mcpTransport';

export class McpServerManager {
  private static instance: McpServerManager;
  private registry: ToolsRegistry;
  private configManager: McpConfigManager;
  private statusBarItem?: vscode.StatusBarItem;

  private constructor() {
    this.registry = {
      servers: new Map(),
      tools: new Map(),
      serverTools: new Map()
    };
    this.configManager = McpConfigManager.getInstance();
  }

  static getInstance(): McpServerManager {
    if (!McpServerManager.instance) {
      McpServerManager.instance = new McpServerManager();
    }
    return McpServerManager.instance;
  }

  /**
   * Initialize the tools registry with status bar item
   */
  setStatusBarItem(statusBarItem: vscode.StatusBarItem) {
    this.statusBarItem = statusBarItem;
  }

  /**
   * Initialize all MCP servers and discover tools
   */
  async initialize(): Promise<void> {
    try {
      this.statusBarItem?.show();
      if (this.statusBarItem) {
        this.statusBarItem.text = '$(sync~spin) MCP';
        this.statusBarItem.tooltip = 'Initializing MCP servers...';
      }

      // Clear existing registry
      this.registry.servers.clear();
      this.registry.tools.clear();
      this.registry.serverTools.clear();

      // Get server configurations
      const serverConfigs = this.configManager.getServerConfigs();

      if (serverConfigs.length === 0) {
        this.updateStatus('No MCP servers configured', 'error');
        return;
      }

      // Initialize each server
      for (const config of serverConfigs) {
        await this.initializeServer(config);
      }

      console.log(`✅ MCP Server Manager: Connected to ${serverConfigs.length} server(s), ${this.registry.tools.size} tools available`);
      this.updateStatus(`Connected to ${serverConfigs.length} server(s), ${this.registry.tools.size} tools available`);
    } catch (error) {
      console.error('Failed to initialize tools registry:', error);
      this.updateStatus('Failed to initialize MCP servers', 'error');
      throw error;
    }
  }

  /**
   * Initialize a single MCP server
   */
  private async initializeServer(config: McpServerConfig): Promise<void> {
    try {
      console.log(`Initializing MCP server: ${config.name}`);
      
      // Create client and transport
      const { client, transport } = McpTransportFactory.createClient(config);
      
      // Connect to server
      await client.connect(transport);
      
      // Store client
      this.registry.servers.set(config.name, client);
      
      // Discover tools
      await this.discoverTools(config.name, client);
      
      console.log(`Successfully initialized server: ${config.name}`);
    } catch (error) {
      console.error(`Failed to initialize server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Discover tools from an MCP server
   */
  private async discoverTools(serverName: string, client: Client): Promise<void> {
    try {
      console.log(`Discovering tools from server: ${serverName}`);
      
      // Use the proper MCP SDK high-level method to list tools
      const result = await client.listTools();
      const toolNames: string[] = [];
      
      // Handle the result properly based on SDK structure
      if (result && typeof result === 'object' && 'tools' in result) {
        const tools = (result as any).tools || [];
        
        for (const tool of tools) {
          const mcpTool: McpTool = {
            name: tool.name,
            displayName: tool.name, // Use tool name as display name since description is a string
            description: tool.description || '', // Use the string description directly
            inputSchema: tool.inputSchema || {},
            outputSchema: tool.outputSchema,
            serverName: serverName
          };

          this.registry.tools.set(tool.name, mcpTool);
          toolNames.push(tool.name);
        }
      }

      this.registry.serverTools.set(serverName, toolNames);
      console.log(`Discovered ${toolNames.length} tools from server: ${serverName}`);
    } catch (error) {
      console.error(`Failed to discover tools from server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Get all available tools for language model
   */
  getAvailableTools(): McpTool[] {
    const tools = Array.from(this.registry.tools.values());
    console.log(`MCP Server Manager: Returning ${tools.length} tools from registry`);
    console.log('Tool names:', tools.map(t => t.name));
    return tools;
  }

  /**
   * Check if any tools are available
   */
  hasTools(): boolean {
    return this.registry.tools.size > 0;
  }

  /**
   * Call a tool by name
   */
  async callTool(toolName: string, arguments_: any): Promise<ToolCallResult> {
    try {
      const tool = this.registry.tools.get(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`
        };
      }

      const server = this.registry.servers.get(tool.serverName);
      if (!server) {
        return {
          success: false,
          error: `Server '${tool.serverName}' not available`
        };
      }

      // Use the proper MCP SDK high-level method to call tools
      const result = await server.callTool({
        name: toolName,
        arguments: arguments_
      });

      // Extract and format the result content for better usability
      let formattedResult = result;
      if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
        const firstContent = result.content[0];
        if (firstContent.type === 'text') {
          formattedResult = firstContent.text;
        }
      }

      return {
        success: true,
        data: formattedResult
      };
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Call a tool with streaming support
   */
  async callToolStream(
    toolName: string, 
    arguments_: any, 
    onChunk: (data: any) => void
  ): Promise<() => void> {
    try {
      const tool = this.registry.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }

      const server = this.registry.servers.get(tool.serverName);
      if (!server) {
        throw new Error(`Server '${tool.serverName}' not available`);
      }

      // Use the proper MCP SDK streaming method
      const stream = await server.callToolStream({
        name: toolName,
        arguments: arguments_
      });

      // Process the stream
      const processStream = async () => {
        try {
          for await (const chunk of stream) {
            if (chunk && chunk.content && Array.isArray(chunk.content)) {
              for (const item of chunk.content) {
                if (item.type === 'text') {
                  onChunk(item.text);
                } else {
                  onChunk(item);
                }
              }
            } else {
              onChunk(chunk);
            }
          }
        } catch (error) {
          console.error(`Stream processing error for tool ${toolName}:`, error);
          throw error;
        }
      };

      // Start processing the stream
      processStream();

      // Return cancellation function
      return () => {
        // The SDK handles cleanup automatically
        console.log(`Stream cancelled for tool ${toolName}`);
      };
    } catch (error) {
      console.error(`Failed to start streaming for tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get tools for a specific server
   */
  getServerTools(serverName: string): McpTool[] {
    const toolNames = this.registry.serverTools.get(serverName) || [];
    return toolNames.map(name => this.registry.tools.get(name)!);
  }

  /**
   * Reconnect to all servers
   */
  async reconnect(): Promise<void> {
    console.log('Reconnecting to MCP servers...');
    await this.initialize();
  }

  /**
   * Update status bar
   */
  private updateStatus(message: string, type: 'info' | 'error' | 'warning' = 'info'): void {
    if (!this.statusBarItem) return;

    switch (type) {
      case 'error':
        this.statusBarItem.text = '$(error) MCP';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('errorBar.background');
        break;
      case 'warning':
        this.statusBarItem.text = '$(warning) MCP';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('warningBar.background');
        break;
      default:
        this.statusBarItem.text = '$(server) MCP';
        this.statusBarItem.backgroundColor = undefined;
    }

    this.statusBarItem.tooltip = message;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    for (const [serverName, client] of this.registry.servers) {
      try {
        await client.close();
        console.log(`Closed connection to server: ${serverName}`);
      } catch (error) {
        console.error(`Error closing server ${serverName}:`, error);
      }
    }

    this.registry.servers.clear();
    this.registry.tools.clear();
    this.registry.serverTools.clear();
  }
} 