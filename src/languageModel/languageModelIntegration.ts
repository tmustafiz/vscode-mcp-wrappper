import * as vscode from 'vscode';
import { McpServerManager } from '../registry/toolsRegistry';
import { McpTool } from '../types/mcp';

export class LanguageModelIntegration {
  private static instance: LanguageModelIntegration;
  private mcpServerManager: McpServerManager;

  private constructor() {
    this.mcpServerManager = McpServerManager.getInstance();
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
    return this.mcpServerManager.hasTools();
  }

  /**
   * Get tool information for display
   */
  getToolInfo(): { count: number; tools: McpTool[] } {
    const tools = this.mcpServerManager.getAvailableTools();
    return {
      count: tools.length,
      tools: tools
    };
  }

  /**
   * Get available tools as a formatted string for language model
   */
  getAvailableToolsString(): string {
    const tools = this.mcpServerManager.getAvailableTools();
    
    if (tools.length === 0) {
      return 'No MCP tools are currently available.';
    }

    const toolList = tools.map((tool: McpTool) => 
      `• ${tool.displayName || tool.name}: ${tool.description || 'No description'}`
    ).join('\n');

    return `Available MCP Tools (${tools.length}):\n${toolList}`;
  }

  /**
   * Call a tool by name (for manual testing)
   */
  async callTool(toolName: string, args: any): Promise<any> {
    const result = await this.mcpServerManager.callTool(toolName, args);
    
    if (!result.success) {
      throw new Error(result.error || 'Tool call failed');
    }

    return result.data;
  }
} 