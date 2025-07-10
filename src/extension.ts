import * as vscode from 'vscode';
import { McpServerManager } from './registry/toolsRegistry';
import { LanguageModelIntegration } from './languageModel/languageModelIntegration';
import { McpConfigManager } from './config/mcpConfig';
import { CommandRegistry } from './registry/commandRegistry';

export async function activate(ctx: vscode.ExtensionContext) {
  console.log('MCP Wrapper extension is now active!');

  // Create status bar item for MCP server status
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(server) MCP';
  statusBarItem.tooltip = 'MCP Server Status';
  ctx.subscriptions.push(statusBarItem);

  // Initialize managers
  const mcpServerManager = McpServerManager.getInstance();
  const languageModelIntegration = LanguageModelIntegration.getInstance();
  const configManager = McpConfigManager.getInstance();
  const commandRegistry = CommandRegistry.getInstance();

  // Set status bar item for MCP server manager
  mcpServerManager.setStatusBarItem(statusBarItem);

  // Update tools when they change (for status bar and commands)
  const updateTools = () => {
    // Tools are updated automatically through the registry manager
    // No tree view to update
  };

  // Register all commands
  commandRegistry.registerCommands(mcpServerManager, languageModelIntegration, configManager, updateTools);

  // Initialize MCP servers and tools
  try {
    await mcpServerManager.initialize();
    updateTools();
    console.log('MCP Wrapper initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MCP Wrapper:', error);
    vscode.window.showErrorMessage(`Failed to initialize MCP Wrapper: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Listen for configuration changes
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mcpWrapper')) {
        console.log('MCP configuration changed, reconnecting...');
        vscode.window.showInformationMessage('MCP configuration changed, reconnecting to servers...');
        
        // Reconnect with new configuration
        mcpServerManager.reconnect().then(() => {
          updateTools();
        }).catch((error) => {
          vscode.window.showErrorMessage(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
      }
    })
  );

  // Cleanup on deactivation
  ctx.subscriptions.push({
    dispose: async () => {
      await mcpServerManager.dispose();
      commandRegistry.dispose();
    }
  });
}

export function deactivate() {
  console.log('MCP Wrapper extension is now deactivated!');
}