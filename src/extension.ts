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

  // Tree view provider for MCP tools
  const toolsProvider = new McpToolsProvider();
  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider('mcpWrapperView', toolsProvider)
  );

  // Update tools in the tree view when they change
  const updateTreeView = () => {
    const toolInfo = languageModelIntegration.getToolInfo();
    toolsProvider.updateTools(toolInfo.tools);
  };

  // Register commands
  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.reconnect', async () => {
      try {
        await registryManager.reconnect();
        updateTreeView();
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
    updateTreeView();
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
          updateTreeView();
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

// Tree view provider for MCP tools
class McpToolsProvider implements vscode.TreeDataProvider<McpToolItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<McpToolItem | undefined | null | void> = new vscode.EventEmitter<McpToolItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<McpToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private tools: any[] = [];

  updateTools(tools: any[]) {
    this.tools = tools;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: McpToolItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: McpToolItem): Thenable<McpToolItem[]> {
    if (element) {
      // If element is a server, return its tools
      return Promise.resolve([]);
    } else {
      // Return all tools
      return Promise.resolve(
        this.tools.map(tool => new McpToolItem(
          tool.displayName || tool.name,
          vscode.TreeItemCollapsibleState.None,
          '$(tools)',
          tool.description || 'No description',
          tool
        ))
      );
    }
  }
}

class McpToolItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly icon: string,
    public readonly tooltip?: string,
    public readonly tool?: any
  ) {
    super(label, collapsibleState);
    this.iconPath = new vscode.ThemeIcon(icon);
    this.tooltip = tooltip;
  }
}

export function deactivate() {
  console.log('MCP Wrapper extension is now deactivated!');
}