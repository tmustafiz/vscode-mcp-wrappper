import * as vscode from 'vscode';
import { McpClient } from './mcpClient';

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

  // --- db_listSchemas -------------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_listSchemas', {
      async invoke() {
        try {
          if (!client.isReady()) {
            throw new Error('MCP client not ready');
          }
          const rows = await client.json<string[]>('/tools/listSchemas', {});
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(JSON.stringify(rows))]
          );
        } catch (error) {
          console.error('db_listSchemas failed:', error);
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(`Error: Unable to list schemas. ${error}`)]
          );
        }
      }
    })
  );

  // --- db_findRelatedTables --------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_findRelatedTables', {
      async invoke(o: { input: { schema: string; baseTable: string } }) {
        try {
          if (!client.isReady()) {
            throw new Error('MCP client not ready');
          }
          const { schema, baseTable } = o.input;
          const related = await client.json<string[]>(
            '/tools/findRelatedTables',
            { schema, baseTable }
          );
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(JSON.stringify(related))]
          );
        } catch (error) {
          console.error('db_findRelatedTables failed:', error);
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(`Error: Unable to find related tables. ${error}`)]
          );
        }
      }
    })
  );

  // --- db_runQuery (streams SSE) --------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_runQuery', {
      async invoke(o: { input: { sql: string } }, tok: vscode.CancellationToken) {
        try {
          if (!client.isReady()) {
            throw new Error('MCP client not ready');
          }
          const { sql } = o.input;
          const chunks: string[] = [];
          const close = await client.stream(
            '/tools/runQuery',
            { sql, limit: 250 },
            data => chunks.push(JSON.stringify(data))
          );
          tok.onCancellationRequested(close);
          await new Promise(r => setTimeout(r, 1)); // yield till first chunk
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(chunks.join('\n'))]
          );
        } catch (error) {
          console.error('db_runQuery failed:', error);
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(`Error: Unable to run query. ${error}`)]
          );
        }
      }
    })
  );

  // --- db_generateErd --------------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_generateErd', {
      async invoke(o: { input: { schema: string; format?: string } }) {
        try {
          if (!client.isReady()) {
            throw new Error('MCP client not ready');
          }
          const { schema, format = 'mermaid' } = o.input;
          const body = await client.json<string>(
            '/tools/generateErd',
            { schema, format }
          );
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(body)]
          );
        } catch (error) {
          console.error('db_generateErd failed:', error);
          return new vscode.LanguageModelToolResult(
            [new vscode.LanguageModelTextPart(`Error: Unable to generate ERD. ${error}`)]
          );
        }
      }
    })
  );
}

export function deactivate() {}