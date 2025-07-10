const fs = require('fs');
const path = require('path');

// Read the base package.json
const basePackagePath = path.join(__dirname, '..', 'package.json');
const basePackage = JSON.parse(fs.readFileSync(basePackagePath, 'utf8'));

// Function to generate languageModelTools from discovered MCP tools
function generateLanguageModelTools() {
  // This will be populated with actual discovered tools
  // For now, we'll create a template that can be updated
  return [
    {
      "name": "mcp_generate_erd_json",
      "description": "Generate ERD (Entity Relationship Diagram) in JSON format",
      "inputSchema": {
        "type": "object",
        "properties": {
          "arguments": {
            "type": "object",
            "description": "Tool arguments"
          }
        }
      }
    },
    {
      "name": "mcp_list_tables",
      "description": "List all tables in the database",
      "inputSchema": {
        "type": "object",
        "properties": {
          "arguments": {
            "type": "object",
            "description": "Tool arguments"
          }
        }
      }
    }
  ];
}

// Update the package.json with generated tools
basePackage.contributes.languageModelTools = generateLanguageModelTools();

// Write the updated package.json
fs.writeFileSync(basePackagePath, JSON.stringify(basePackage, null, 4));

console.log('✅ Generated package.json with languageModelTools'); 