import * as vscode from 'vscode';
import { McpClient } from './mcpClient';

const SERVER = process.env['MCP_BASE'] ?? 'https://mcp.internal.example';

export async function activate(ctx: vscode.ExtensionContext) {
  const client = new McpClient(SERVER, process.env['MCP_TOKEN']);
  await client.init();

  // --- db_listSchemas -------------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_listSchemas', {
      async invoke() {
        const rows = await client.json<string[]>('/tools/listSchemas', {});
        return new vscode.LanguageModelToolResult(
          [new vscode.LanguageModelTextPart(JSON.stringify(rows))]
        );
      }
    })
  );

  // --- db_findRelatedTables --------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_findRelatedTables', {
      async invoke(o: { input: { schema: string; baseTable: string } }) {
        const { schema, baseTable } = o.input;
        const related = await client.json<string[]>(
          '/tools/findRelatedTables',
          { schema, baseTable }
        );
        return new vscode.LanguageModelToolResult(
          [new vscode.LanguageModelTextPart(JSON.stringify(related))]
        );
      }
    })
  );

  // --- db_runQuery (streams SSE) --------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_runQuery', {
      async invoke(o: { input: { sql: string } }, tok: vscode.CancellationToken) {
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
      }
    })
  );

  // --- db_generateErd --------------------------------------------------------
  ctx.subscriptions.push(
    vscode.lm.registerTool('db_generateErd', {
      async invoke(o: { input: { schema: string; format?: string } }) {
        const { schema, format = 'mermaid' } = o.input;
        const body = await client.json<string>(
          '/tools/generateErd',
          { schema, format }
        );
        return new vscode.LanguageModelToolResult(
          [new vscode.LanguageModelTextPart(body)]
        );
      }
    })
  );
}

export function deactivate() {}