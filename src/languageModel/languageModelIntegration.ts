import * as vscode from 'vscode';
import { ToolsRegistryManager } from '../registry/toolsRegistry';
import { McpTool } from '../types/mcp';

export class LanguageModelIntegration {
  private static instance: LanguageModelIntegration;
  private registryManager: ToolsRegistryManager;

  private constructor() {
    this.registryManager = ToolsRegistryManager.getInstance();
  }

  static getInstance(): LanguageModelIntegration {
    if (!LanguageModelIntegration.instance) {
      LanguageModelIntegration.instance = new LanguageModelIntegration();
    }
    return LanguageModelIntegration.instance;
  }

  /**
   * Check if any tools are available for language model
   */
  hasTools(): boolean {
    return this.registryManager.hasTools();
  }

  /**
   * Get tool information for display
   */
  getToolInfo(): { count: number; tools: McpTool[] } {
    const tools = this.registryManager.getAvailableTools();
    return {
      count: tools.length,
      tools: tools
    };
  }

  /**
   * Get available tools as a formatted string for language model
   */
  getAvailableToolsString(): string {
    const tools = this.registryManager.getAvailableTools();
    
    if (tools.length === 0) {
      return 'No MCP tools are currently available.';
    }

    const toolList = tools.map(tool => 
      `• ${tool.displayName || tool.name}: ${tool.description || 'No description'}`
    ).join('\n');

    return `Available MCP Tools (${tools.length}):\n${toolList}`;
  }

  /**
   * Call a tool by name (for manual testing)
   */
  async callTool(toolName: string, args: any): Promise<any> {
    const result = await this.registryManager.callTool(toolName, args);
    
    if (!result.success) {
      throw new Error(result.error || 'Tool call failed');
    }

    return result.data;
  }
} 