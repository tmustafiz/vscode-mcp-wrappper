const fs = require('fs');
const path = require('path');

// Import the MCP SDK
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function readVSCodeSettings() {
  const settingsPath = path.join(__dirname, '..', '.vscode', 'settings.json');
  console.log('Looking for settings at:', settingsPath);
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    console.log('Found settings:', JSON.stringify(settings, null, 2));
    return settings["mcpWrapper.servers"] || [];
  }
  console.log('Settings file not found');
  return [];
}

// Try using 'url' instead of 'server' for the StreamableHTTPClientTransport config
// If that doesn't work, try passing config.url as the first argument and the options as the second argument

async function createMcpClient(config) {
  const client = new Client({
    name: 'vscode-mcp-wrapper-tool-discovery',
    version: '0.0.1'
  }, {
    capabilities: {
      tools: {}
    }
  });

  let transport;
  switch (config.transport) {
    case 'http':
      transport = new StreamableHTTPClientTransport(config.url);
      break;
    case 'sse':
      transport = new SSEClientTransport({
        server: config.url,
        headers: config.authToken ? { 'Authorization': `Bearer ${config.authToken}` } : {}
      });
      break;
    case 'stdio':
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || []
      });
      break;
    default:
      throw new Error(`Unsupported transport type: ${config.transport}`);
  }

  return { client, transport };
}

async function discoverToolsFromServer(config) {
  console.log(`Connecting to MCP server: ${config.name} (${config.transport})`);
  
  try {
    const { client, transport } = await createMcpClient(config);
    
    // Connect to the server
    await client.connect(transport);
    console.log(`✅ Connected to server: ${config.name}`);
    
    // Discover tools
    const result = await client.listTools();
    console.log(`✅ Discovered tools from server: ${config.name}`);
    
    // Parse the tools
    const tools = [];
    if (result && typeof result === 'object' && 'tools' in result) {
      const toolList = result.tools || [];
      
      for (const tool of toolList) {
        const languageModelTool = {
          name: tool.name, // No mcp_ prefix
          displayName: tool.description?.name || tool.name,
          modelDescription: tool.description?.description || tool.description?.name || tool.name,
          description: tool.description?.description || tool.description?.name || tool.name,
          canBeReferencedInPrompt: true,
          toolReferenceName: tool.name,
          userDescription: tool.description?.name || tool.name,
          inputSchema: tool.inputSchema || {
            type: "object",
            properties: {
              arguments: {
                type: "object",
                description: "Tool arguments"
              }
            }
          }
        };
        
        tools.push(languageModelTool);
        console.log(`  - ${languageModelTool.name}: ${languageModelTool.description}`);
      }
    }
    
    // Disconnect
    await client.close();
    console.log(`✅ Disconnected from server: ${config.name}`);
    
    return tools;
  } catch (error) {
    console.error(`❌ Failed to discover tools from server ${config.name}:`, error.message);
    return [];
  }
}

async function discoverMcpTools() {
  const serverConfigs = await readVSCodeSettings();
  
  console.log(`Found ${serverConfigs.length} configured MCP servers`);
  console.log('Server configs:', JSON.stringify(serverConfigs, null, 2));
  
  if (serverConfigs.length === 0) {
    console.log('No MCP servers configured in .vscode/settings.json');
    return [];
  }

  // Discover tools from all configured servers
  const allTools = [];
  
  for (const config of serverConfigs) {
    console.log(`\n🔍 Discovering tools from server: ${config.name}`);
    const tools = await discoverToolsFromServer(config);
    allTools.push(...tools);
  }
  
  console.log(`\n📊 Total tools discovered: ${allTools.length}`);
  return allTools;
}

async function updatePackageJson() {
  try {
    const tools = await discoverMcpTools();
    
    if (tools.length === 0) {
      console.log('No tools discovered, keeping existing package.json');
      return;
    }
    
    // Read the base package.json
    const basePackagePath = path.join(__dirname, '..', 'package.json');
    const basePackage = JSON.parse(fs.readFileSync(basePackagePath, 'utf8'));
    
    // Update the languageModelTools section
    basePackage.contributes.languageModelTools = tools;
    
    // Write the updated package.json
    fs.writeFileSync(basePackagePath, JSON.stringify(basePackage, null, 4));
    
    console.log(`\n✅ Updated package.json with ${tools.length} discovered tools`);
    console.log('Tools:', tools.map(t => t.name).join(', '));
    console.log('\n⚠️  IMPORTANT: You must reload the extension for changes to take effect!');
    console.log('   - Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)');
    console.log('   - Run "Developer: Reload Window"');
    
  } catch (error) {
    console.error('❌ Failed to update package.json:', error);
  }
}

// Run the update
updatePackageJson(); 