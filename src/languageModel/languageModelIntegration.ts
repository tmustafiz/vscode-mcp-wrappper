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
              
              // Extract actual tool arguments from VS Code's options object
              // VS Code passes additional properties like 'input', 'tokenizationOptions', 'cancellationToken'
              // that are not part of the actual tool arguments
              // Note: 'toolInvokationToken' is an MCP protocol property containing session info and should be preserved
              let toolArguments = options?.input || options || {};
              
              // Handle different possible structures of the input
              // Sometimes the actual arguments might be nested under 'arguments' or directly in 'input'
              if (toolArguments && typeof toolArguments === 'object') {
                // If input contains 'arguments', use that
                if ('arguments' in toolArguments && toolArguments.arguments) {
                  toolArguments = toolArguments.arguments;
                }
                // If input is the arguments object itself, use it as is
                // Otherwise, fall back to the original input
              }
              
              // Filter out known VS Code-specific properties that might cause validation errors
              // Note: toolInvokationToken is NOT a VS Code property - it's an MCP protocol property
              // that contains session information and should be preserved
              if (toolArguments && typeof toolArguments === 'object') {
                const vsCodeProperties = ['input', 'tokenizationOptions', 'cancellationToken'];
                const filteredArguments: any = {};
                
                for (const [key, value] of Object.entries(toolArguments)) {
                  if (!vsCodeProperties.includes(key)) {
                    filteredArguments[key] = value;
                  }
                }
                
                toolArguments = filteredArguments;
              }
              
              // Debug logging to help troubleshoot input validation issues
              console.log(`🔧 Tool ${tool.name} called with options:`, JSON.stringify(options, null, 2));
              console.log(`🔧 Extracted tool arguments:`, JSON.stringify(toolArguments, null, 2));
              
              const result = await mcpManager.callTool(tool.name, toolArguments);
              
              if (!result.success) {
                // Provide more helpful error messages for input validation issues
                let errorMessage = result.error || 'Unknown error';
                if (errorMessage.includes('Additional properties are not allowed')) {
                  errorMessage = `Input validation error: The tool received unexpected properties. This may be due to VS Code's language model system passing additional metadata (excluding toolInvokationToken which is a valid MCP property). Please try again or contact support if the issue persists. Original error: ${result.error}`;
                }
                
                return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(`Error: ${errorMessage}`)
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