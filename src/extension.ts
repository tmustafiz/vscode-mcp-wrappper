import * as vscode from 'vscode';
import { ToolsRegistryManager } from './registry/toolsRegistry';
import { LanguageModelIntegration } from './languageModel/languageModelIntegration';
import { McpConfigManager } from './config/mcpConfig';

export async function activate(ctx: vscode.ExtensionContext) {
  console.log('MCP Wrapper extension is now active!');

  // Create status bar item for MCP server status
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(server) MCP';
  statusBarItem.tooltip = 'MCP Server Status';
  ctx.subscriptions.push(statusBarItem);

  // Initialize managers
  const registryManager = ToolsRegistryManager.getInstance();
  const languageModelIntegration = LanguageModelIntegration.getInstance();
  const configManager = McpConfigManager.getInstance();

  // Set status bar item for registry manager
  registryManager.setStatusBarItem(statusBarItem);

  // Update tools when they change (for status bar and commands)
  const updateTools = () => {
    // Tools are updated automatically through the registry manager
    // No tree view to update
  };

  // Register commands
  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.reconnect', async () => {
      try {
        await registryManager.reconnect();
        updateTools();
        vscode.window.showInformationMessage('Successfully reconnected to MCP servers');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  ctx.subscriptions.push(
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

  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.listTools', () => {
      const toolsString = languageModelIntegration.getAvailableToolsString();
      vscode.window.showInformationMessage(toolsString);
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.openToolPicker', () => {
      // Open the AI tool picker to show available tools
      vscode.commands.executeCommand('workbench.action.chat.open');
    })
  );

  ctx.subscriptions.push(
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

  // Initialize MCP servers and tools
  try {
    await registryManager.initialize();
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
        registryManager.reconnect().then(() => {
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
      await registryManager.dispose();
    }
  });
}

export function deactivate() {
  console.log('MCP Wrapper extension is now deactivated!');
}