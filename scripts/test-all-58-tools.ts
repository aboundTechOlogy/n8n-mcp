#!/usr/bin/env ts-node
/**
 * Comprehensive Test for All 58 n8n-mcp Tools
 *
 * Tests all available MCP tools:
 * - 24 Documentation tools (tools.ts)
 * - 34 n8n Management tools (tools-n8n-manager.ts)
 */

import { N8NDocumentationMCPServer } from '../src/mcp/server';

interface TestResult {
  toolName: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
  duration: number;
  error?: string;
  result?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  duration: number;
  results: TestResult[];
}

class AllToolsTester {
  private server: N8NDocumentationMCPServer;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.server = new N8NDocumentationMCPServer();
  }

  async initialize(): Promise<void> {
    // Server initializes automatically
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  private async testTool(
    toolName: string,
    params: any,
    skipReason?: string
  ): Promise<TestResult> {
    const start = Date.now();

    if (skipReason) {
      return {
        toolName,
        status: 'SKIP',
        duration: Date.now() - start,
        error: skipReason,
      };
    }

    try {
      const result = await this.server.executeTool(toolName, params);

      // Check if result indicates success
      // Most tools return objects with data, validation tools return { valid: boolean }, etc.
      // Some tools (like tools_documentation) return strings
      const hasError = result?.error || result?.errors?.length > 0;
      const hasData = result !== null && result !== undefined &&
                     (typeof result === 'object' || typeof result === 'string');
      const isSuccess = hasData && !hasError;

      return {
        toolName,
        status: isSuccess ? 'PASS' : 'FAIL',
        duration: Date.now() - start,
        result: result,
        error: result?.error || (result?.errors?.length > 0 ? result.errors[0]?.message : undefined),
      };
    } catch (error) {
      return {
        toolName,
        status: 'ERROR',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Documentation Tools (24 tools from tools.ts)
   */
  async testDocumentationTools(): Promise<void> {
    console.log('\n=== Testing Documentation Tools (24 tools) ===\n');

    // 1. tools_documentation
    this.results.push(await this.testTool('tools_documentation', { topic: 'overview' }));

    // 2. list_nodes
    this.results.push(await this.testTool('list_nodes', { limit: 5 }));

    // 3. get_node_info
    this.results.push(await this.testTool('get_node_info', {
      nodeType: 'n8n-nodes-base.webhook'
    }));

    // 4. search_nodes
    this.results.push(await this.testTool('search_nodes', {
      query: 'webhook',
      limit: 5
    }));

    // 5. list_ai_tools
    this.results.push(await this.testTool('list_ai_tools', {}));

    // 6. get_node_documentation
    this.results.push(await this.testTool('get_node_documentation', {
      nodeType: 'n8n-nodes-base.slack'
    }));

    // 7. get_database_statistics
    this.results.push(await this.testTool('get_database_statistics', {}));

    // 8. get_node_essentials
    this.results.push(await this.testTool('get_node_essentials', {
      nodeType: 'n8n-nodes-base.httpRequest'
    }));

    // 9. search_node_properties
    this.results.push(await this.testTool('search_node_properties', {
      nodeType: 'n8n-nodes-base.httpRequest',
      query: 'authentication'
    }));

    // 10. get_node_for_task
    this.results.push(await this.testTool('get_node_for_task', {
      task: 'receive_webhook'
    }));

    // 11. list_tasks
    this.results.push(await this.testTool('list_tasks', {}));

    // 12. validate_node_operation
    this.results.push(await this.testTool('validate_node_operation', {
      nodeType: 'n8n-nodes-base.webhook',
      config: { path: 'test' }
    }));

    // 13. validate_node_minimal
    this.results.push(await this.testTool('validate_node_minimal', {
      nodeType: 'n8n-nodes-base.webhook',
      config: {}
    }));

    // 14. get_property_dependencies
    this.results.push(await this.testTool('get_property_dependencies', {
      nodeType: 'n8n-nodes-base.httpRequest'
    }));

    // 15. get_node_as_tool_info
    this.results.push(await this.testTool('get_node_as_tool_info', {
      nodeType: 'n8n-nodes-base.slack'
    }));

    // 16. list_templates
    this.results.push(await this.testTool('list_templates', {
      limit: 5
    }));

    // 17. list_node_templates
    this.results.push(await this.testTool('list_node_templates', {
      nodeTypes: ['n8n-nodes-base.webhook'],
      limit: 5
    }));

    // 18. get_template - Find a valid template first
    const templates = await this.server.executeTool('list_templates', { limit: 1 });
    if (templates?.items?.[0]?.id) {
      this.results.push(await this.testTool('get_template', {
        templateId: templates.items[0].id
      }));
    } else {
      // Skip if no templates available
      this.results.push({
        toolName: 'get_template',
        status: 'SKIP',
        duration: 0,
        error: 'No templates available in database to test'
      });
    }

    // 19. search_templates
    this.results.push(await this.testTool('search_templates', {
      query: 'webhook',
      limit: 5
    }));

    // 20. get_templates_for_task
    this.results.push(await this.testTool('get_templates_for_task', {
      task: 'webhook_processing',
      limit: 5
    }));

    // 21. search_templates_by_metadata
    this.results.push(await this.testTool('search_templates_by_metadata', {
      complexity: 'simple',
      limit: 5
    }));

    // 22. validate_workflow
    this.results.push(await this.testTool('validate_workflow', {
      workflow: {
        nodes: [
          {
            id: '1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: { path: 'test' }
          }
        ],
        connections: {}
      }
    }));

    // 23. validate_workflow_connections
    this.results.push(await this.testTool('validate_workflow_connections', {
      workflow: {
        nodes: [
          {
            id: '1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {}
          }
        ],
        connections: {}
      }
    }));

    // 24. validate_workflow_expressions
    this.results.push(await this.testTool('validate_workflow_expressions', {
      workflow: {
        nodes: [
          {
            id: '1',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              values: {
                string: [
                  {
                    name: 'test',
                    value: '={{ $json.data }}'
                  }
                ]
              }
            }
          }
        ],
        connections: {}
      }
    }));
  }

  /**
   * n8n Management Tools (34 tools from tools-n8n-manager.ts)
   * Most require n8n API configuration, so we'll skip those that need it
   */
  async testManagementTools(): Promise<void> {
    console.log('\n=== Testing n8n Management Tools (34 tools) ===\n');

    const apiConfigured = process.env.N8N_API_URL && process.env.N8N_API_KEY;
    const skipReason = apiConfigured ? undefined : 'N8N_API_URL or N8N_API_KEY not configured';

    // Workflow Management (14 tools)
    // 25. n8n_create_workflow - Use webhook-only workflow (valid single-node)
    this.results.push(await this.testTool('n8n_create_workflow', {
      name: 'Test Workflow',
      nodes: [{
        id: '1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          path: 'test-webhook'
        }
      }],
      connections: {}
    }, skipReason));

    // 26. n8n_get_workflow
    this.results.push(await this.testTool('n8n_get_workflow', {
      id: '1'
    }, skipReason));

    // 27. n8n_get_workflow_details
    this.results.push(await this.testTool('n8n_get_workflow_details', {
      id: '1'
    }, skipReason));

    // 28. n8n_get_workflow_structure
    this.results.push(await this.testTool('n8n_get_workflow_structure', {
      id: '1'
    }, skipReason));

    // 29. n8n_get_workflow_minimal
    this.results.push(await this.testTool('n8n_get_workflow_minimal', {
      id: '1'
    }, skipReason));

    // 30. n8n_update_full_workflow
    this.results.push(await this.testTool('n8n_update_full_workflow', {
      id: '1',
      name: 'Updated Workflow'
    }, skipReason));

    // 31. n8n_update_partial_workflow
    this.results.push(await this.testTool('n8n_update_partial_workflow', {
      id: '1',
      operations: [{ type: 'updateName', name: 'New Name' }]
    }, skipReason));

    // 32. n8n_delete_workflow
    this.results.push(await this.testTool('n8n_delete_workflow', {
      id: '999999'
    }, skipReason));

    // 33. n8n_list_workflows
    this.results.push(await this.testTool('n8n_list_workflows', {
      limit: 5
    }, skipReason));

    // 34. n8n_validate_workflow
    this.results.push(await this.testTool('n8n_validate_workflow', {
      id: '1'
    }, skipReason));

    // 35. n8n_autofix_workflow
    this.results.push(await this.testTool('n8n_autofix_workflow', {
      id: '1',
      applyFixes: false
    }, skipReason));

    // 36. n8n_activate_workflow
    this.results.push(await this.testTool('n8n_activate_workflow', {
      id: '1'
    }, skipReason));

    // 37. n8n_deactivate_workflow
    this.results.push(await this.testTool('n8n_deactivate_workflow', {
      id: '1'
    }, skipReason));

    // 38. n8n_duplicate_workflow
    this.results.push(await this.testTool('n8n_duplicate_workflow', {
      id: '1'
    }, skipReason));

    // Execution Management (9 tools)
    // 39. n8n_trigger_webhook_workflow
    this.results.push(await this.testTool('n8n_trigger_webhook_workflow', {
      webhookUrl: 'https://example.com/webhook/test'
    }, skipReason));

    // 40. n8n_get_execution
    this.results.push(await this.testTool('n8n_get_execution', {
      id: '1'
    }, skipReason));

    // 41. n8n_list_executions
    this.results.push(await this.testTool('n8n_list_executions', {
      limit: 5
    }, skipReason));

    // 42. n8n_delete_execution
    this.results.push(await this.testTool('n8n_delete_execution', {
      id: '999999'
    }, skipReason));

    // 43. n8n_retry_execution
    this.results.push(await this.testTool('n8n_retry_execution', {
      id: '1'
    }, skipReason));

    // 44. n8n_cancel_execution
    this.results.push(await this.testTool('n8n_cancel_execution', {
      id: '1'
    }, skipReason));

    // 45. n8n_stop_execution
    this.results.push(await this.testTool('n8n_stop_execution', {
      workflowId: '1'
    }, skipReason));

    // 46. n8n_get_execution_data
    this.results.push(await this.testTool('n8n_get_execution_data', {
      id: '1'
    }, skipReason));

    // 47. n8n_get_execution_logs
    this.results.push(await this.testTool('n8n_get_execution_logs', {
      id: '1'
    }, skipReason));

    // Webhook Management (5 tools)
    // 48. n8n_create_webhook
    this.results.push(await this.testTool('n8n_create_webhook', {
      workflowId: '1'
    }, skipReason));

    // 49. n8n_delete_webhook
    this.results.push(await this.testTool('n8n_delete_webhook', {
      workflowId: '1',
      webhookId: '1'
    }, skipReason));

    // 50. n8n_list_webhooks
    this.results.push(await this.testTool('n8n_list_webhooks', {}, skipReason));

    // 51. n8n_test_webhook
    this.results.push(await this.testTool('n8n_test_webhook', {
      webhookUrl: 'https://example.com/webhook/test'
    }, skipReason));

    // 52. n8n_get_webhook_logs
    this.results.push(await this.testTool('n8n_get_webhook_logs', {
      workflowId: '1'
    }, skipReason));

    // Template Management (2 tools)
    // 53. n8n_apply_template
    this.results.push(await this.testTool('n8n_apply_template', {
      templateId: '1'
    }, skipReason));

    // 54. n8n_create_template
    this.results.push(await this.testTool('n8n_create_template', {
      workflowId: '1',
      name: 'Test Template'
    }, skipReason));

    // Utility Tools (4 tools)
    // 55. n8n_analyze_dependencies
    this.results.push(await this.testTool('n8n_analyze_dependencies', {
      workflowId: '1'
    }, skipReason));

    // 56. n8n_health_check
    this.results.push(await this.testTool('n8n_health_check', {}, skipReason));

    // 57. n8n_list_available_tools
    this.results.push(await this.testTool('n8n_list_available_tools', {}, skipReason));

    // 58. n8n_diagnostic
    this.results.push(await this.testTool('n8n_diagnostic', {}, skipReason));
  }

  async runAllTests(): Promise<TestSummary> {
    this.startTime = Date.now();

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         Testing All 58 n8n-mcp Tools                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    await this.testDocumentationTools();
    await this.testManagementTools();

    const duration = Date.now() - this.startTime;
    const summary: TestSummary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      skipped: this.results.filter(r => r.status === 'SKIP').length,
      errors: this.results.filter(r => r.status === 'ERROR').length,
      duration,
      results: this.results,
    };

    return summary;
  }

  printSummary(summary: TestSummary): void {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Overall stats
    console.log(`Total Tools Tested:  ${summary.total}/58`);
    console.log(`✓ Passed:            ${summary.passed}`);
    console.log(`✗ Failed:            ${summary.failed}`);
    console.log(`⊘ Skipped:           ${summary.skipped}`);
    console.log(`⚠ Errors:            ${summary.errors}`);
    console.log(`Duration:            ${(summary.duration / 1000).toFixed(2)}s\n`);

    // Detailed results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DETAILED RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const grouped = {
      PASS: summary.results.filter(r => r.status === 'PASS'),
      FAIL: summary.results.filter(r => r.status === 'FAIL'),
      ERROR: summary.results.filter(r => r.status === 'ERROR'),
      SKIP: summary.results.filter(r => r.status === 'SKIP'),
    };

    // Show passed tests
    if (grouped.PASS.length > 0) {
      console.log(`✓ PASSED (${grouped.PASS.length}):`);
      grouped.PASS.forEach(r => {
        console.log(`  • ${r.toolName} (${r.duration}ms)`);
      });
      console.log();
    }

    // Show failed tests
    if (grouped.FAIL.length > 0) {
      console.log(`✗ FAILED (${grouped.FAIL.length}):`);
      grouped.FAIL.forEach(r => {
        console.log(`  • ${r.toolName} (${r.duration}ms)`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
      console.log();
    }

    // Show errors
    if (grouped.ERROR.length > 0) {
      console.log(`⚠ ERRORS (${grouped.ERROR.length}):`);
      grouped.ERROR.forEach(r => {
        console.log(`  • ${r.toolName} (${r.duration}ms)`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
      console.log();
    }

    // Show skipped tests
    if (grouped.SKIP.length > 0) {
      console.log(`⊘ SKIPPED (${grouped.SKIP.length}):`);
      console.log(`  Reason: ${grouped.SKIP[0]?.error || 'Unknown'}`);
      grouped.SKIP.forEach(r => {
        console.log(`  • ${r.toolName}`);
      });
      console.log();
    }

    // Success rate
    const successRate = summary.total > 0
      ? ((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1)
      : '0.0';

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Success Rate: ${successRate}% (excluding skipped tests)`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const tester = new AllToolsTester();

  try {
    await tester.initialize();
    const summary = await tester.runAllTests();
    tester.printSummary(summary);

    // Exit with appropriate code
    const hasFailures = summary.failed > 0 || summary.errors > 0;
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();
