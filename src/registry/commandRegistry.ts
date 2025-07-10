import * as vscode from 'vscode';
import { McpServerManager } from './toolsRegistry';
import { LanguageModelIntegration } from '../languageModel/languageModelIntegration';
import { McpConfigManager } from '../config/mcpConfig';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private disposables: vscode.Disposable[] = [];

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * Register all MCP commands
   */
  registerCommands(
    mcpServerManager: McpServerManager,
    languageModelIntegration: LanguageModelIntegration,
    configManager: McpConfigManager,
    updateTools: () => void
  ): void {
    // Reconnect command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.reconnect', async () => {
        try {
          await mcpServerManager.reconnect();
          updateTools();
          vscode.window.showInformationMessage('Successfully reconnected to MCP servers');
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      })
    );

    // Show status command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.showStatus', () => {
        const toolInfo = languageModelIntegration.getToolInfo();
        const serverConfigs = configManager.getServerConfigs();
        
        if (serverConfigs.length === 0) {
          vscode.window.showInformationMessage('No MCP servers configured');
          return;
        }

        const statusMessage = `MCP Servers: ${serverConfigs.length}\n` +
          `Available Tools: ${toolInfo.count}\n` +
          `Servers: ${serverConfigs.map(config => config.name).join(', ')}`;

        vscode.window.showInformationMessage(statusMessage);
      })
    );

    // List tools command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.listTools', () => {
        const toolsString = languageModelIntegration.getAvailableToolsString();
        vscode.window.showInformationMessage(toolsString);
      })
    );

    // Open tool picker command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.openToolPicker', () => {
        // Open the AI tool picker to show available tools
        vscode.commands.executeCommand('workbench.action.chat.open');
      })
    );

    // Test tool command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.testTool', async () => {
        const toolInfo = languageModelIntegration.getToolInfo();
        
        if (toolInfo.count === 0) {
          vscode.window.showWarningMessage('No MCP tools available to test.');
          return;
        }

        // Let user select a tool to test
        const toolNames = toolInfo.tools.map(tool => tool.displayName || tool.name);
        const selectedTool = await vscode.window.showQuickPick(toolNames, {
          placeHolder: 'Select a tool to test'
        });

        if (!selectedTool) return;

        const tool = toolInfo.tools.find(t => (t.displayName || t.name) === selectedTool);
        if (!tool) return;

        // Show tool information
        const toolInfoText = `Tool: ${tool.displayName || tool.name}\n` +
          `Description: ${tool.description || 'No description'}\n` +
          `Input Schema: ${JSON.stringify(tool.inputSchema, null, 2)}`;

        vscode.window.showInformationMessage(toolInfoText);
      })
    );

    // Show agent tools command
    this.disposables.push(
      vscode.commands.registerCommand('mcp-wrapper.showAgentTools', () => {
        const agentToolNames = languageModelIntegration.getAgentToolNames();
        
        if (agentToolNames.length === 0) {
          vscode.window.showInformationMessage('No agent tools available.');
          return;
        }

        const toolList = agentToolNames.join('\n');
        const message = `Available Agent Tools (${agentToolNames.length}):\n\n${toolList}`;
        
        vscode.window.showInformationMessage(message);
      })
    );
  }

  /**
   * Dispose all registered commands
   */
  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}
