import * as vscode from 'vscode';
import { McpClient } from './mcpClient';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

/** Get MCP configuration from VS Code settings with environment variable fallback */
function getMcpConfiguration() {
  const config = vscode.workspace.getConfiguration('mcpWrapper');
  
  return {
    server: config.get<string>('serverUrl') || process.env['MCP_BASE'] || 'mcp.internal.example',
    token: config.get<string>('authToken') || process.env['MCP_TOKEN'],
    allowInsecure: config.get<boolean>('allowInsecure') || process.env['MCP_ALLOW_INSECURE'] !== 'false',
    timeout: config.get<number>('timeout') || 10000,
    retries: config.get<number>('retries') || 3
  };
}

/** Validate MCP configuration and provide helpful error messages */
function validateConfiguration(): { isValid: boolean; errors: string[] } {
  const config = getMcpConfiguration();
  const errors: string[] = [];
  
  if (!config.server) {
    errors.push('MCP server URL is not configured');
  }
  
  if (config.server && !config.server.includes('://') && !config.server.includes('.')) {
    errors.push('MCP server URL should be a valid URL or hostname (e.g., "localhost:8000" or "https://mcp.example.com")');
  }
  
  // Check if we're trying to use HTTPS without proper configuration
  if (config.server && config.server.startsWith('https://') && !config.token && !config.allowInsecure) {
    errors.push('HTTPS connection may require authentication. Set auth token or allow insecure connections');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function activate(ctx: vscode.ExtensionContext) {
  // Create status bar item for MCP server status
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(server) MCP';
  statusBarItem.tooltip = 'MCP Server Status';
  statusBarItem.show();
  ctx.subscriptions.push(statusBarItem);

  // Store client reference for commands
  let client: McpClient | null = null;
  let registeredTools: any[] = [];

  // Register commands
  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.reconnect', async () => {
      await initializeMcpClient(ctx, statusBarItem, (newClient, tools) => {
        client = newClient;
        registeredTools = tools;
      });
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.showStatus', () => {
      const config = getMcpConfiguration();
      if (client && client.isReady()) {
        vscode.window.showInformationMessage(
          `MCP Server Status: Connected to ${config.server}\nTools available: ${registeredTools.length}`
        );
      } else {
        vscode.window.showWarningMessage(
          `MCP Server Status: Not connected\nServer: ${config.server}`
        );
      }
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand('mcp-wrapper.listTools', () => {
      if (registeredTools.length === 0) {
        vscode.window.showInformationMessage('No MCP tools are currently available.');
        return;
      }

      const toolList = registeredTools.map(tool => 
        `• ${tool.displayName || tool.name}: ${tool.description || 'No description'}`
      ).join('\n');

      vscode.window.showInformationMessage(
        `Available MCP Tools (${registeredTools.length}):\n${toolList}`
      );
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
      if (registeredTools.length === 0) {
        vscode.window.showWarningMessage('No MCP tools available to test.');
        return;
      }

      // Let user select a tool to test
      const toolNames = registeredTools.map(tool => tool.displayName || tool.name);
      const selectedTool = await vscode.window.showQuickPick(toolNames, {
        placeHolder: 'Select a tool to test'
      });

      if (!selectedTool) return;

      const tool = registeredTools.find(t => (t.displayName || t.name) === selectedTool);
      if (!tool) return;

      // Show tool information
      const toolInfo = `Tool: ${tool.displayName || tool.name}\n` +
        `Description: ${tool.description || 'No description'}\n` +
        `Input Schema: ${JSON.stringify(tool.inputSchema, null, 2)}`;

      vscode.window.showInformationMessage(toolInfo);
    })
  );

  // Initialize MCP client
  await initializeMcpClient(ctx, statusBarItem, (newClient, tools) => {
    client = newClient;
    registeredTools = tools;
    updateTreeView(tools);
  });

  // Listen for configuration changes
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mcpWrapper')) {
        console.log('MCP configuration changed, reconnecting...');
        vscode.window.showInformationMessage('MCP configuration changed, reconnecting to server...');
        
        // Reconnect with new configuration
        initializeMcpClient(ctx, statusBarItem, (newClient, tools) => {
          client = newClient;
          registeredTools = tools;
        });
      }
    })
  );

  // Tree view provider for MCP tools
  const toolsProvider = new McpToolsProvider();
  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider('mcpWrapperView', toolsProvider)
  );
  
  // Update tools in the tree view when they change
  const updateTreeView = (tools: any[]) => {
    toolsProvider.updateTools(tools);
  };
}

/** Initialize MCP client and register tools */
async function initializeMcpClient(
  ctx: vscode.ExtensionContext, 
  statusBarItem: vscode.StatusBarItem,
  onSuccess: (client: McpClient, tools: any[]) => void
) {
  // Get configuration
  const config = getMcpConfiguration();
  
  // Validate configuration first
  const configValidation = validateConfiguration();
  if (!configValidation.isValid) {
    const errorMessage = `MCP Configuration Error:\n${configValidation.errors.join('\n')}`;
    console.error(errorMessage);
    vscode.window.showErrorMessage(errorMessage);
    
    // Update status bar
    statusBarItem.text = '$(error) MCP';
    statusBarItem.tooltip = 'MCP Server: Configuration Error';
    
    // Register mock tool for testing
    await registerMockTool(ctx);
    return;
  }

  let client: McpClient;
  
  try {
    // Show status message
    vscode.window.showInformationMessage('Connecting to MCP server...');
    statusBarItem.text = '$(sync~spin) MCP';
    statusBarItem.tooltip = 'Connecting to MCP server...';
    
    // Create client with configuration
    client = new McpClient({
      baseUrl: config.server,
      authToken: config.token,
      timeout: config.timeout,
      retries: config.retries,
      allowInsecure: config.allowInsecure
    });

    // Initialize connection
    await client.init();
    console.log('MCP client initialized successfully');

    // Get available tools from the server
    const toolsResult = await client.getClient().request({
      method: 'tools/list',
      params: {}
    }, ListToolsResultSchema);

    console.log(`Found ${toolsResult.tools.length} tools from MCP server`);
    
    // Debug: Log all tool names
    toolsResult.tools.forEach((tool, index) => {
      console.log(`Tool ${index + 1}: name="${tool.name}", displayName="${tool.displayName}"`);
    });

    // Dynamically register each tool
    let registeredCount = 0;
    for (const tool of toolsResult.tools) {
      try {
        await registerTool(ctx, client, tool);
        registeredCount++;
      } catch (error) {
        console.error(`Failed to register tool ${tool.name}:`, error);
      }
    }

    // Show success message
    vscode.window.showInformationMessage(
      `Successfully connected to MCP server and registered ${registeredCount} tools.`
    );

    // Update status bar
    statusBarItem.text = `$(check) MCP (${registeredCount})`;
    statusBarItem.tooltip = `Connected to ${config.server}\n${registeredCount} tools available`;

    // Call success callback
    onSuccess(client, toolsResult.tools);

  } catch (error) {
    console.error('Failed to initialize MCP client:', error);
    
    // Show detailed error message
    const errorMessage = `Failed to connect to MCP server at ${config.server}. ` +
      `Please check your configuration settings or environment variables. ` +
      `Error: ${error}`;
    
    vscode.window.showErrorMessage(errorMessage);
    
    // Log detailed error for debugging
    console.error('MCP Connection Details:', {
      server: config.server,
      hasToken: !!config.token,
      allowInsecure: config.allowInsecure,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Update status bar
    statusBarItem.text = '$(error) MCP';
    statusBarItem.tooltip = `Failed to connect to ${config.server}`;
    
    // For testing: Register a mock tool to verify the extension works
    console.log('Registering mock tool for testing...');
    await registerMockTool(ctx);
    
    // Return early - tools won't be available
    return;
  }
}

/** Register a mock tool for testing when server is unavailable */
async function registerMockTool(ctx: vscode.ExtensionContext) {
  const toolName = 'mcp_testTool';
  
  try {
    ctx.subscriptions.push(
      vscode.lm.registerTool(toolName, {
        async invoke(input: any, token: vscode.CancellationToken) {
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart('Mock tool working! MCP server is not available.')]
          );
        }
      })
    );
    
    console.log(`Registered mock tool: ${toolName}`);
  } catch (error) {
    console.error(`Failed to register mock tool: ${error}`);
    vscode.window.showInformationMessage(
      'Language Model Tools API not available in this VS Code version.'
    );
  }
}

/** Dynamically register a tool based on server response */
async function registerTool(ctx: vscode.ExtensionContext, client: McpClient, tool: any) {
  try {
    const toolName = `mcp_${tool.name}`;
    const displayName = tool.displayName || tool.name;
    const description = tool.description || `Execute ${displayName} via MCP server`;
    
    console.log(`Registering tool: ${toolName} (${displayName})`);

    ctx.subscriptions.push(
      vscode.lm.registerTool(toolName, {
        async invoke(input: any, token: vscode.CancellationToken) {
          try {
            if (!client.isReady()) {
              throw new Error('MCP client not ready');
            }

            // Validate input parameters if schema is provided
            if (tool.inputSchema && tool.inputSchema.properties) {
              const validationResult = validateToolInput(input.input || {}, tool.inputSchema);
              if (!validationResult.isValid) {
                throw new Error(`Invalid input parameters: ${validationResult.errors.join(', ')}`);
              }
            }

            // Show confirmation message for tool execution
            const config = getMcpConfiguration();
            const confirmationMessage = `Executing ${displayName} on MCP server (${config.server})`;
            console.log(confirmationMessage);

            // Handle streaming vs non-streaming tools
            if (tool.inputSchema?.type === 'object' && tool.inputSchema.properties?.stream === 'boolean') {
              // Streaming tool
              const chunks: string[] = [];
              const close = await client.stream(
                tool.name,
                input.input || {},
                data => chunks.push(JSON.stringify(data))
              );
              token.onCancellationRequested(close);
              await new Promise(r => setTimeout(r, 1)); // yield till first chunk
              return new vscode.LanguageModelToolResult(
                [new vscode.LanguageModelTextPart(chunks.join('\n'))]
              );
            } else {
              // Non-streaming tool
              const result = await client.json(
                tool.name,
                input.input || {}
              );
              return new vscode.LanguageModelToolResult(
                [new vscode.LanguageModelTextPart(JSON.stringify(result))]
              );
            }
          } catch (error) {
            console.error(`${toolName} failed:`, error);
            const errorMessage = `Error executing ${displayName}: ${error instanceof Error ? error.message : String(error)}`;
            return new vscode.LanguageModelToolResult(
              [new vscode.LanguageModelTextPart(errorMessage)]
            );
          }
        }
      })
    );

    console.log(`Successfully registered tool: ${toolName}`);
  } catch (error) {
    console.error(`Failed to register tool ${tool.name}:`, error);
    throw error; // Re-throw to let caller handle it
  }
}

/** Validate tool input against schema */
function validateToolInput(input: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!schema.properties) {
    return { isValid: true, errors: [] };
  }
  
  for (const [key, prop] of Object.entries(schema.properties)) {
    const value = input[key];
    const propSchema = prop as { type?: string };
    
    // Check required fields
    if (schema.required && schema.required.includes(key) && value === undefined) {
      errors.push(`Missing required parameter: ${key}`);
      continue;
    }
    
    // Skip validation if value is undefined and not required
    if (value === undefined) {
      continue;
    }
    
    // Type validation
    if (propSchema.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
    } else if (propSchema.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    } else if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    } else if (propSchema.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key} must be an array`);
    } else if (propSchema.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(`${key} must be an object`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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
      return Promise.resolve([]);
    }

    if (this.tools.length === 0) {
      return Promise.resolve([
        new McpToolItem(
          'No tools available',
          vscode.TreeItemCollapsibleState.None,
          '$(error) No MCP tools found. Check your server connection.'
        )
      ]);
    }

    return Promise.resolve(
      this.tools.map(tool => 
        new McpToolItem(
          tool.displayName || tool.name,
          vscode.TreeItemCollapsibleState.None,
          '$(tools)',
          tool.description || 'No description available',
          tool
        )
      )
    );
  }
}

// Tree item for MCP tools
class McpToolItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly icon: string,
    public readonly tooltip?: string,
    public readonly tool?: any
  ) {
    super(label, collapsibleState);
    this.iconPath = new vscode.ThemeIcon(icon.replace('$(', '').replace(')', ''));
    this.tooltip = tooltip;
    this.contextValue = tool ? 'mcpTool' : 'noTools';
  }
}

export function deactivate() {}