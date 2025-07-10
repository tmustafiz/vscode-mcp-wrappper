import * as vscode from 'vscode';
import { McpServerConfig } from '../types/mcp';

export class McpConfigManager {
  private static instance: McpConfigManager;
  private configSection = 'mcpWrapper';

  private constructor() {}

  static getInstance(): McpConfigManager {
    if (!McpConfigManager.instance) {
      McpConfigManager.instance = new McpConfigManager();
    }
    return McpConfigManager.instance;
  }

  /**
   * Get all MCP server configurations from VS Code settings
   */
  getServerConfigs(): McpServerConfig[] {
    const config = vscode.workspace.getConfiguration(this.configSection);
    const serversConfig = config.get<McpServerConfig[]>('servers', []);
    
    console.log(`🔍 Config Manager: Reading settings from section '${this.configSection}'`);
    console.log(`🔍 Config Manager: Raw servers config:`, JSON.stringify(serversConfig, null, 2));
    
    // Validate and normalize configurations
    const validConfigs = serversConfig
      .filter(server => this.validateServerConfig(server))
      .map(server => this.normalizeServerConfig(server));
    
    console.log(`🔍 Config Manager: Valid server configs:`, validConfigs.length);
    console.log(`🔍 Config Manager: Server names:`, validConfigs.map(c => c.name));
    
    return validConfigs;
  }

  /**
   * Get a specific server configuration by name
   */
  getServerConfig(name: string): McpServerConfig | undefined {
    const configs = this.getServerConfigs();
    return configs.find(config => config.name === name);
  }

  /**
   * Check if any MCP servers are configured
   */
  hasServerConfigs(): boolean {
    return this.getServerConfigs().length > 0;
  }

  /**
   * Validate a server configuration
   */
  private validateServerConfig(config: any): boolean {
    if (!config.name || typeof config.name !== 'string') {
      console.warn('Invalid MCP server config: missing or invalid name');
      return false;
    }

    if (!config.transport || !['http', 'sse', 'stdio'].includes(config.transport)) {
      console.warn(`Invalid MCP server config for ${config.name}: invalid transport type`);
      return false;
    }

    // Validate transport-specific requirements
    switch (config.transport) {
      case 'http':
      case 'sse':
        if (!config.url) {
          console.warn(`Invalid MCP server config for ${config.name}: HTTP/SSE transport requires URL`);
          return false;
        }
        break;
      case 'stdio':
        if (!config.command) {
          console.warn(`Invalid MCP server config for ${config.name}: stdio transport requires command`);
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Normalize server configuration with defaults
   */
  private normalizeServerConfig(config: any): McpServerConfig {
    return {
      name: config.name,
      transport: config.transport,
      url: config.url,
      command: config.command,
      args: config.args || [],
      authToken: config.authToken || process.env['MCP_TOKEN'],
      allowInsecure: config.allowInsecure || process.env['MCP_ALLOW_INSECURE'] === 'true',
      timeout: config.timeout || 10000,
      retries: config.retries || 3
    };
  }


} 