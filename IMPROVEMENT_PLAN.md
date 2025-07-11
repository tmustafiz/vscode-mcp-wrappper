# VS Code MCP Wrapper - Improvement Plan & TODO List

## Executive Summary

The current VS Code MCP Wrapper extension has several critical issues that prevent it from functioning properly and following best practices. The main problems are:

1. **Incorrect SDK Usage**: Using low-level `request()` calls instead of high-level SDK methods
2. **Missing Language Model Integration**: Tools are discovered but not made available to VS Code's AI features
3. **Architectural Issues**: Singleton anti-pattern, poor error handling, missing validation
4. **Security & Performance**: Inadequate security measures and performance optimizations

## Improvement Categories

### **Category 1: Critical MCP SDK Fixes (Priority: HIGH)**
*Must be completed before the extension can function properly*

### **Category 2: Language Model Integration (Priority: HIGH)**
*Required for the extension to provide value to users*

### **Category 3: Architecture & Code Quality (Priority: MEDIUM)**
*Improves maintainability, testability, and reliability*

### **Category 4: Security & Performance (Priority: MEDIUM)**
*Enhances security and user experience*

### **Category 5: User Experience & Features (Priority: LOW)**
*Improves usability and adds useful features*

---

## **TODO List**

### **Category 1: Critical MCP SDK Fixes**

#### **TODO 1.1: Replace Low-Level Request Calls**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: Using `client.request()` instead of SDK high-level methods
- **Action**: 
  - Replace `client.request({method: 'tools/list'})` with `client.listTools()`
  - Replace `client.request({method: 'tools/call'})` with `client.callTool()`
  - Update result parsing to use SDK types
  - Remove unused `McpClient` class (dead code)
- **Estimated Time**: 2-3 hours
- **Dependencies**: None
- **Status**: ✅ Completed

#### **TODO 1.2: Fix Tool Discovery Implementation**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: Manual parsing of tool list response, incorrect schema handling
- **Action**:
  - Use `client.listTools()` method
  - Properly extract tool metadata using SDK types
  - Fix tool schema mapping
- **Estimated Time**: 1-2 hours
- **Dependencies**: TODO 1.1
- **Status**: ✅ Completed

#### **TODO 1.3: Fix Tool Execution Implementation**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: Manual tool call construction, incorrect result parsing
- **Action**:
  - Use `client.callTool()` method
  - Proper error handling with SDK error types
  - Fix result content extraction
- **Estimated Time**: 2-3 hours
- **Dependencies**: TODO 1.1
- **Status**: ✅ Completed

#### **TODO 1.4: Implement Proper Streaming Support**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: Manual streaming implementation, not using SDK streaming
- **Action**:
  - Use `client.callToolStream()` method
  - Implement proper async iteration
  - Add streaming cancellation support
- **Estimated Time**: 2-3 hours
- **Dependencies**: TODO 1.1
- **Status**: ✅ Completed

#### **TODO 1.5: Fix Transport Configuration**
- **File**: `src/transport/mcpTransport.ts`
- **Issue**: Manual transport setup, missing proper configuration
- **Action**:
  - Use SDK's transport configuration options
  - Implement proper timeout and retry settings
  - Fix authentication handling
- **Estimated Time**: 1-2 hours
- **Dependencies**: None
- **Status**: ✅ Completed

### **Category 2: Language Model Integration**

#### **TODO 2.1: Implement Language Model Tool Provider (Agent Mode)**
- **File**: `src/languageModel/languageModelIntegration.ts`
- **Issue**: Missing actual integration with VS Code's language model system
- **Action**:
  - Implement dynamic tool registration for agent mode
  - Register each MCP tool as `mcp_toolName` for direct agent access
  - Handle tool execution requests from AI agents
  - Add debugging commands to show available agent tools
- **Estimated Time**: 4-6 hours
- **Dependencies**: TODO 1.1, TODO 1.3
- **Status**: ✅ Completed

#### **TODO 2.2: Add Tool Schema Validation**
- **File**: `src/languageModel/languageModelIntegration.ts`
- **Issue**: No validation of tool parameters from language model
- **Action**:
  - Implement JSON schema validation for tool inputs
  - Add parameter type checking
  - Provide helpful error messages for invalid inputs
- **Estimated Time**: 2-3 hours
- **Dependencies**: TODO 2.1
- **Status**: ✅ Completed

#### **TODO 2.3: Implement Tool Result Formatting**
- **File**: `src/languageModel/languageModelIntegration.ts`
- **Issue**: Raw tool results not formatted for AI consumption
- **Action**:
  - Format tool results for language model display
  - Handle different result types (text, data, errors)
  - Add result metadata and context
- **Estimated Time**: 2-3 hours
- **Dependencies**: TODO 2.1
- **Status**: 🔴 Not Started

### **Category 3: Architecture & Code Quality**

#### **TODO 3.1: Replace Singleton Pattern with Dependency Injection**
- **File**: All manager classes
- **Issue**: Singleton anti-pattern makes testing difficult
- **Action**:
  - Create proper dependency injection container
  - Replace singletons with injectable services
  - Add interface abstractions for testability
- **Estimated Time**: 6-8 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

#### **TODO 3.2: Add Comprehensive Error Handling**
- **File**: All files
- **Issue**: Generic error handling, missing proper error types
- **Action**:
  - Create custom error types for different scenarios
  - Implement proper error propagation
  - Add retry mechanisms with exponential backoff
  - Add circuit breaker pattern for failing servers
- **Estimated Time**: 4-6 hours
- **Dependencies**: TODO 1.1
- **Status**: 🔴 Not Started

#### **TODO 3.3: Add Input Validation**
- **File**: `src/config/mcpConfig.ts`, `src/registry/toolsRegistry.ts`
- **Issue**: Limited input validation, missing schema validation
- **Action**:
  - Add comprehensive configuration validation
  - Implement tool parameter validation
  - Add URL validation and sanitization
  - Create validation utilities
- **Estimated Time**: 3-4 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

#### **TODO 3.4: Add Unit Tests**
- **File**: New test files
- **Issue**: No unit tests, difficult to verify functionality
- **Action**:
  - Set up testing framework (Jest)
  - Create unit tests for all components
  - Add mock MCP servers for testing
  - Add test utilities and helpers
- **Estimated Time**: 8-12 hours
- **Dependencies**: TODO 3.1
- **Status**: 🔴 Not Started

#### **TODO 3.5: Add Integration Tests**
- **File**: New test files
- **Issue**: No integration tests for MCP communication
- **Action**:
  - Create integration tests with real MCP servers
  - Test end-to-end tool discovery and execution
  - Add CI/CD pipeline for automated testing
- **Estimated Time**: 4-6 hours
- **Dependencies**: TODO 3.4
- **Status**: 🔴 Not Started

### **Category 4: Security & Performance**

#### **TODO 4.1: Implement Proper Security Measures**
- **File**: `src/transport/mcpTransport.ts`, `src/config/mcpConfig.ts`
- **Issue**: Inadequate security, plain text tokens, missing certificate validation
- **Action**:
  - Implement secure token storage
  - Add proper certificate validation
  - Implement input sanitization
  - Add security audit logging
- **Estimated Time**: 3-4 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

#### **TODO 4.2: Add Connection Pooling and Resource Management**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: No connection pooling, potential resource leaks
- **Action**:
  - Implement connection pooling for HTTP transports
  - Add proper resource cleanup
  - Implement connection health checks
  - Add resource usage monitoring
- **Estimated Time**: 4-5 hours
- **Dependencies**: TODO 3.1
- **Status**: 🔴 Not Started

#### **TODO 4.3: Add Performance Optimizations**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: No caching, inefficient operations
- **Action**:
  - Implement tool result caching
  - Add request batching for multiple tools
  - Optimize tool discovery process
  - Add performance metrics collection
- **Estimated Time**: 3-4 hours
- **Dependencies**: TODO 4.2
- **Status**: 🔴 Not Started

### **Category 5: User Experience & Features**

#### **TODO 5.1: Improve Status Reporting**
- **File**: `src/registry/toolsRegistry.ts`
- **Issue**: Basic status bar, annoying information dialogs
- **Action**:
  - Implement proper status reporting system
  - Add progress indicators for long operations
  - Replace information dialogs with status bar updates
  - Add detailed status information
- **Estimated Time**: 2-3 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

#### **TODO 5.2: Add Configuration Validation UI**
- **File**: `src/config/mcpConfig.ts`, `src/registry/commandRegistry.ts`
- **Issue**: No visual feedback for configuration errors
- **Action**:
  - Add configuration validation UI
  - Show configuration errors in problems panel
  - Add configuration wizard for new users
  - Provide helpful error messages
- **Estimated Time**: 3-4 hours
- **Dependencies**: TODO 3.3
- **Status**: 🔴 Not Started

#### **TODO 5.3: Add Tool Management Features**
- **File**: `src/registry/commandRegistry.ts`
- **Issue**: Limited tool management capabilities
- **Action**:
  - Add tool filtering and search
  - Implement tool categorization
  - Add tool usage statistics
  - Create tool documentation viewer
- **Estimated Time**: 4-5 hours
- **Dependencies**: TODO 2.1
- **Status**: 🔴 Not Started

#### **TODO 5.4: Add Debugging and Logging**
- **File**: All files
- **Issue**: Limited debugging capabilities, basic logging
- **Action**:
  - Implement comprehensive logging system
  - Add debug mode with detailed logging
  - Create debugging tools and utilities
  - Add log viewer in VS Code
- **Estimated Time**: 3-4 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

#### **TODO 5.5: Add Documentation and Help**
- **File**: `README.md`, new documentation files
- **Issue**: Limited documentation, missing troubleshooting guide
- **Action**:
  - Update README with proper setup instructions
  - Add troubleshooting guide
  - Create API documentation
  - Add examples and tutorials
- **Estimated Time**: 2-3 hours
- **Dependencies**: None
- **Status**: 🔴 Not Started

---

## **Implementation Priority Order**

### **Phase 1: Foundation (Weeks 1-2)**
1. ✅ TODO 1.1: Replace Low-Level Request Calls
2. ✅ TODO 1.2: Fix Tool Discovery Implementation
3. ✅ TODO 1.3: Fix Tool Execution Implementation
4. ✅ TODO 1.4: Implement Proper Streaming Support
5. ✅ TODO 1.5: Fix Transport Configuration

### **Phase 2: Core Functionality (Weeks 3-4)**
6. ✅ TODO 2.1: Implement Language Model Tool Provider
7. TODO 2.2: Add Tool Schema Validation
8. TODO 2.3: Implement Tool Result Formatting
9. TODO 3.2: Add Comprehensive Error Handling
10. TODO 4.1: Implement Proper Security Measures

### **Phase 3: Quality & Testing (Weeks 5-6)**
11. TODO 3.1: Replace Singleton Pattern with Dependency Injection
12. TODO 3.3: Add Input Validation
13. TODO 3.4: Add Unit Tests
14. TODO 3.5: Add Integration Tests
15. TODO 5.4: Add Debugging and Logging

### **Phase 4: Performance & UX (Weeks 7-8)**
16. TODO 4.2: Add Connection Pooling and Resource Management
17. TODO 4.3: Add Performance Optimizations
18. TODO 5.1: Improve Status Reporting
19. TODO 5.2: Add Configuration Validation UI
20. TODO 5.3: Add Tool Management Features

### **Phase 5: Documentation & Polish (Week 9)**
21. TODO 5.5: Add Documentation and Help

---

## **Recent Updates**

### **Completed Items (Latest Session)**
- ✅ **TODO 1.1**: Replaced low-level `client.request()` calls with proper SDK methods (`client.listTools()`, `client.callTool()`)
- ✅ **TODO 1.2**: Fixed tool discovery implementation using SDK's `listTools()` method
- ✅ **TODO 1.3**: Fixed tool execution implementation using SDK's `callTool()` method  
- ✅ **TODO 1.4**: Implemented proper streaming support using SDK's `callToolStream()` method
- ✅ **TODO 1.5**: Fixed transport configuration with proper SDK options, timeout, retry settings, and authentication
- ✅ **TODO 2.1**: Implemented language model integration for agent mode with dynamic tool registration
- ✅ **TODO 2.2**: Added tool schema validation and input filtering to handle VS Code's additional metadata properties (corrected to preserve toolInvokationToken)
- ✅ **Deleted**: Removed unused `McpClient` class (dead code cleanup)
- ✅ **Added**: Command to show available agent tools (`mcp-wrapper.showAgentTools`)

### **Key Improvements Made**
1. **Proper MCP SDK Usage**: Now using high-level SDK methods instead of low-level requests
2. **Agent Mode Integration**: Tools are registered with `mcp_` prefix for direct AI agent access
3. **Streaming Support**: Full streaming support for long-running tool operations
4. **Better Error Handling**: More specific error messages and proper error propagation
5. **Command Integration**: Added debugging commands to inspect available tools
6. **Transport Configuration**: Proper timeout, retry, and authentication handling for all transport types
7. **Input Validation**: Automatic filtering of VS Code's additional metadata properties while preserving MCP protocol properties like toolInvokationToken

### **Current Status**
- **Phase 1**: 100% complete (5/5 items done) ✅
- **Phase 2**: 67% complete (2/3 items done)
- **Overall**: 33.3% complete (7/21 items done)

### **What's Next - Recommended Priority**

#### **Immediate Next Steps (High Priority)**
1. **✅ TODO 1.5: Fix Transport Configuration** - Phase 1 foundation completed!

2. **TODO 2.2: Add Tool Schema Validation** - Improve reliability
   - Implement JSON schema validation for tool inputs
   - Add parameter type checking
   - Provide helpful error messages for invalid inputs

3. **TODO 3.2: Add Comprehensive Error Handling** - Critical for stability
   - Create custom error types for different scenarios
   - Implement proper error propagation
   - Add retry mechanisms with exponential backoff

#### **Medium Priority**
4. **TODO 2.3: Implement Tool Result Formatting** - Improve user experience
5. **TODO 4.1: Implement Proper Security Measures** - Security hardening

#### **Testing & Quality (Next Phase)**
6. **TODO 3.4: Add Unit Tests** - Essential for reliability
7. **TODO 3.1: Replace Singleton Pattern** - Architecture improvement

---

## **Progress Tracking**

### **Overall Progress**
- **Total Items**: 21
- **Completed**: 6
- **In Progress**: 0
- **Not Started**: 15
- **Completion Rate**: 28.6%

### **Category Progress**
- **Category 1 (Critical SDK Fixes)**: 5/5 (100%)
- **Category 2 (Language Model Integration)**: 1/3 (33%)
- **Category 3 (Architecture & Code Quality)**: 0/5 (0%)
- **Category 4 (Security & Performance)**: 0/3 (0%)
- **Category 5 (User Experience & Features)**: 0/5 (0%)

---

## **Success Criteria**

- [ ] Extension successfully connects to MCP servers using proper SDK methods
- [ ] Tools are discoverable and executable through VS Code's language model system
- [ ] All unit and integration tests pass
- [ ] Security audit shows no critical vulnerabilities
- [ ] Performance benchmarks meet acceptable thresholds
- [ ] User documentation is complete and helpful
- [ ] Extension is ready for production deployment

---

## **Risk Mitigation**

### **High Risk Items**
- **Language model integration complexity**
  - *Mitigation*: Start with simple tool provider implementation, iterate based on feedback
  - *Fallback*: Implement basic tool execution without full AI integration

### **Medium Risk Items**
- **Breaking changes to existing functionality**
  - *Mitigation*: Implement changes incrementally, maintain backward compatibility where possible
  - *Fallback*: Keep old implementation as fallback during transition

### **Low Risk Items**
- **Performance impact of new features**
  - *Mitigation*: Monitor performance metrics, optimize as needed
  - *Fallback*: Disable features if performance impact is too high

---

## **Resource Requirements**

### **Development Time**
- **Total Estimated Time**: 60-80 hours
- **Phase 1**: 8-13 hours
- **Phase 2**: 10-15 hours
- **Phase 3**: 21-30 hours
- **Phase 4**: 12-17 hours
- **Phase 5**: 2-3 hours

### **Skills Required**
- TypeScript/JavaScript expertise
- VS Code extension development experience
- MCP protocol knowledge
- Testing and CI/CD experience
- Security best practices knowledge

### **Tools & Dependencies**
- VS Code extension development environment
- MCP TypeScript SDK
- Testing framework (Jest)
- Mock MCP servers for testing
- Security scanning tools

---

## **Notes & Considerations**

1. **Backward Compatibility**: Ensure changes don't break existing configurations
2. **Performance**: Monitor impact of changes on extension startup and runtime performance
3. **Security**: All security improvements should be implemented before production deployment
4. **Testing**: Comprehensive testing is required before each phase completion
5. **Documentation**: Update documentation as changes are implemented

---

*Last Updated: [Current Date]*
*Version: 1.0* 