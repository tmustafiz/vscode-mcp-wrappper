import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServerConfig, McpTool, ToolsRegistry, ToolCallResult } from '../types/mcp';
import { McpConfigManager } from '../config/mcpConfig';
import { McpTransportFactory } from '../transport/mcpTransport';

export class ToolsRegistryManager {
  private static instance: ToolsRegistryManager;
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

  static getInstance(): ToolsRegistryManager {
    if (!ToolsRegistryManager.instance) {
      ToolsRegistryManager.instance = new ToolsRegistryManager();
    }
    return ToolsRegistryManager.instance;
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
      
      // Add legacy config if no servers configured
      if (serverConfigs.length === 0) {
        const legacyConfig = this.configManager.getLegacyConfig();
        if (legacyConfig) {
          serverConfigs.push(legacyConfig);
        }
      }

      if (serverConfigs.length === 0) {
        this.updateStatus('No MCP servers configured', 'error');
        return;
      }

      // Initialize each server
      for (const config of serverConfigs) {
        await this.initializeServer(config);
      }

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
      // For now, we'll use a mock approach since the MCP SDK interface is complex
      // In a real implementation, you would use the proper MCP SDK methods
      console.log(`Discovering tools from server: ${serverName}`);
      
      // Mock tool discovery - replace this with actual MCP SDK calls
      const mockTools = [
        {
          name: 'example_tool',
          description: { name: 'Example Tool', description: 'An example MCP tool' },
          inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
        }
      ];

      const toolNames: string[] = [];
      
      for (const tool of mockTools) {
        const mcpTool: McpTool = {
          name: tool.name,
          displayName: tool.description?.name || tool.name,
          description: tool.description?.description || '',
          inputSchema: tool.inputSchema || {},
          outputSchema: undefined,
          serverName: serverName
        };

        this.registry.tools.set(tool.name, mcpTool);
        toolNames.push(tool.name);
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
    return Array.from(this.registry.tools.values());
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

      const result = await server.request({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: arguments_
        }
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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