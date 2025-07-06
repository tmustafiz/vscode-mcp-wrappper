import * as vscode from 'vscode';
import { McpClient } from './mcpClient';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

const SERVER = process.env['MCP_BASE'] ?? 'mcp.internal.example';
const TOKEN = process.env['MCP_TOKEN'];
const ALLOW_INSECURE = process.env['MCP_ALLOW_INSECURE'] !== 'false';

export async function activate(ctx: vscode.ExtensionContext) {
  let client: McpClient;
  
  try {
    // Create client with configuration
    client = new McpClient({
      baseUrl: SERVER,
      authToken: TOKEN,
      timeout: 10000,
      retries: 3,
      allowInsecure: ALLOW_INSECURE
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

    // Dynamically register each tool
    for (const tool of toolsResult.tools) {
      await registerTool(ctx, client, tool);
    }

  } catch (error) {
    console.error('Failed to initialize MCP client:', error);
    
    // Show user-friendly error message
    vscode.window.showErrorMessage(
      `Failed to connect to MCP server at ${SERVER}. ` +
      `Please check your MCP_BASE and MCP_TOKEN environment variables. ` +
      `Error: ${error}`
    );
    
    // Return early - tools won't be available
    return;
  }
}

/** Dynamically register a tool based on server response */
async function registerTool(ctx: vscode.ExtensionContext, client: McpClient, tool: any) {
  try {
    const toolName = `mcp_${tool.name}`;
    const displayName = tool.displayName || tool.name;
    
    console.log(`Registering tool: ${toolName} (${displayName})`);

    ctx.subscriptions.push(
      vscode.lm.registerTool(toolName, {
        async invoke(input: any, token: vscode.CancellationToken) {
          try {
            if (!client.isReady()) {
              throw new Error('MCP client not ready');
            }

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
            return new vscode.LanguageModelToolResult(
              [new vscode.LanguageModelTextPart(`Error: Unable to execute ${displayName}. ${error}`)]
            );
          }
        }
      })
    );

    console.log(`Successfully registered tool: ${toolName}`);
  } catch (error) {
    console.error(`Failed to register tool ${tool.name}:`, error);
  }
}

export function deactivate() {}