export interface McpServerConfig {
  name: string;
  transport: 'http' | 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  authToken?: string;
  allowInsecure?: boolean;
  timeout?: number;
  retries?: number;
}

export interface McpTool {
  name: string;
  displayName?: string;
  description?: string;
  inputSchema: any;
  outputSchema?: any;
  serverName: string;
}

export interface ToolsRegistry {
  servers: Map<string, any>; // MCP client instances
  tools: Map<string, McpTool>; // tool name -> tool definition
  serverTools: Map<string, string[]>; // server name -> tool names
}

export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
} 