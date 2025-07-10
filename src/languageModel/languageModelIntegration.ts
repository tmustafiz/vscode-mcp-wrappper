import * as vscode from 'vscode';
import { McpServerManager } from '../registry/toolsRegistry';
import { McpTool } from '../types/mcp';

export class LanguageModelIntegration {
  private static instance: LanguageModelIntegration;
  private mcpServerManager: McpServerManager;
  private registeredTools: Map<string, vscode.Disposable> = new Map();

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
   * Initialize the language model integration for agent mode
   */
  async initialize(): Promise<void> {
    console.log('Initializing language model integration for agent mode...');
    this.registerToolHandlers();
    console.log('Language model integration initialized successfully');
  }

  /**
   * Register tool handlers for statically declared tools
   */
  private registerToolHandlers(): void {
    const availableTools = this.mcpServerManager.getAvailableTools();
    
    console.log(`Registering handlers for ${availableTools.length} tools...`);
    console.log('Available tools:', availableTools.map(t => t.name));
    
    if (availableTools.length === 0) {
      console.log('⚠️  No tools available from MCP server manager');
      console.log('MCP server manager has tools:', this.mcpServerManager.hasTools());
      return;
    }
    
    for (const tool of availableTools) {
      try {
        // Register handler for the statically declared tool
        const toolProvider = vscode.lm.registerTool(tool.name, {
          async invoke(options: any, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
            try {
              const mcpManager = McpServerManager.getInstance();
              const result = await mcpManager.callTool(tool.name, options || {});
              
              if (!result.success) {
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(`Error: ${result.error}`)
                ]);
              }

              let formattedResult = result.data;
              if (typeof result.data === 'object') {
                formattedResult = JSON.stringify(result.data, null, 2);
              }

              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(formattedResult)
              ]);
            } catch (error) {
              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
              ]);
            }
          }
        });

        // Store the disposable for cleanup
        this.registeredTools.set(tool.name, toolProvider);
        console.log(`✅ Registered handler for tool: ${tool.name}`);
      } catch (error) {
        console.error(`❌ Failed to register handler for tool ${tool.name}:`, error);
      }
    }
  }

  /**
   * Update tool handlers when tools change
   */
  updateTools(): void {
    console.log('Updating tool handlers...');
    
    // Dispose existing handlers
    this.dispose();
    
    // Re-register handlers
    this.registerToolHandlers();
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
   * Get agent mode tool names (for debugging)
   */
  getAgentToolNames(): string[] {
    const tools = this.mcpServerManager.getAvailableTools();
    return tools.map(tool => tool.name);
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

  /**
   * Call a tool with streaming support (for manual testing)
   */
  async callToolStream(
    toolName: string, 
    args: any, 
    onChunk: (data: any) => void
  ): Promise<() => void> {
    return await this.mcpServerManager.callToolStream(toolName, args, onChunk);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    console.log('Disposing language model integration...');
    for (const [toolName, disposable] of this.registeredTools) {
      try {
        disposable.dispose();
        console.log(`Disposed handler for tool: ${toolName}`);
      } catch (error) {
        console.error(`Error disposing tool ${toolName}:`, error);
      }
    }
    this.registeredTools.clear();
  }
} 