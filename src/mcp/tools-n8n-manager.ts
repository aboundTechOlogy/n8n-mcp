import { ToolDefinition } from '../types';

/**
 * n8n Management Tools
 * 
 * These tools enable AI agents to manage n8n workflows through the n8n API.
 * They require N8N_API_URL and N8N_API_KEY to be configured.
 */
export const n8nManagementTools: ToolDefinition[] = [
  // Workflow Management Tools
  {
    name: 'n8n_create_workflow',
    description: `Create workflow. Requires: name, nodes[], connections{}. Created inactive. Returns workflow with ID.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          description: 'Workflow name (required)' 
        },
        nodes: { 
          type: 'array', 
          description: 'Array of workflow nodes. Each node must have: id, name, type, typeVersion, position, and parameters',
          items: {
            type: 'object',
            required: ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              typeVersion: { type: 'number' },
              position: { 
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2
              },
              parameters: { type: 'object' },
              credentials: { type: 'object' },
              disabled: { type: 'boolean' },
              notes: { type: 'string' },
              continueOnFail: { type: 'boolean' },
              retryOnFail: { type: 'boolean' },
              maxTries: { type: 'number' },
              waitBetweenTries: { type: 'number' }
            }
          }
        },
        connections: { 
          type: 'object', 
          description: 'Workflow connections object. Keys are source node IDs, values define output connections' 
        },
        settings: {
          type: 'object',
          description: 'Optional workflow settings (execution order, timezone, error handling)',
          properties: {
            executionOrder: { type: 'string', enum: ['v0', 'v1'] },
            timezone: { type: 'string' },
            saveDataErrorExecution: { type: 'string', enum: ['all', 'none'] },
            saveDataSuccessExecution: { type: 'string', enum: ['all', 'none'] },
            saveManualExecutions: { type: 'boolean' },
            saveExecutionProgress: { type: 'boolean' },
            executionTimeout: { type: 'number' },
            errorWorkflow: { type: 'string' }
          }
        }
      },
      required: ['name', 'nodes', 'connections']
    }
  },
  {
    name: 'n8n_get_workflow',
    description: `Get a workflow by ID. Returns the complete workflow including nodes, connections, and settings.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_details',
    description: `Get workflow details with metadata, version, execution stats. More info than get_workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_structure',
    description: `Get workflow structure: nodes and connections only. No parameter details.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_workflow_minimal',
    description: `Get minimal info: ID, name, active status, tags. Fast for listings.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_update_full_workflow',
    description: `Full workflow update. Requires complete nodes[] and connections{}. For incremental use n8n_update_partial_workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to update' 
        },
        name: { 
          type: 'string', 
          description: 'New workflow name' 
        },
        nodes: { 
          type: 'array', 
          description: 'Complete array of workflow nodes (required if modifying workflow structure)',
          items: {
            type: 'object',
            additionalProperties: true
          }
        },
        connections: { 
          type: 'object', 
          description: 'Complete connections object (required if modifying workflow structure)' 
        },
        settings: { 
          type: 'object', 
          description: 'Workflow settings to update' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_update_partial_workflow',
    description: `Update workflow incrementally with diff operations. Types: addNode, removeNode, updateNode, moveNode, enable/disableNode, addConnection, removeConnection, updateSettings, updateName, add/removeTag. See tools_documentation("n8n_update_partial_workflow", "full") for details.`,
    inputSchema: {
      type: 'object',
      additionalProperties: true,  // Allow any extra properties Claude Desktop might add
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to update' 
        },
        operations: {
          type: 'array',
          description: 'Array of diff operations to apply. Each operation must have a "type" field and relevant properties for that operation type.',
          items: {
            type: 'object',
            additionalProperties: true
          }
        },
        validateOnly: {
          type: 'boolean',
          description: 'If true, only validate operations without applying them'
        }
      },
      required: ['id', 'operations']
    }
  },
  {
    name: 'n8n_delete_workflow',
    description: `Permanently delete a workflow. This action cannot be undone.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to delete' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_list_workflows',
    description: `List workflows (minimal metadata only). Returns id/name/active/dates/tags. Check hasMore/nextCursor for pagination.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Number of workflows to return (1-100, default: 100)' 
        },
        cursor: { 
          type: 'string', 
          description: 'Pagination cursor from previous response' 
        },
        active: { 
          type: 'boolean', 
          description: 'Filter by active status' 
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Filter by tags (exact match)' 
        },
        projectId: { 
          type: 'string', 
          description: 'Filter by project ID (enterprise feature)' 
        },
        excludePinnedData: { 
          type: 'boolean', 
          description: 'Exclude pinned data from response (default: true)' 
        }
      }
    }
  },
  {
    name: 'n8n_validate_workflow',
    description: `Validate workflow by ID. Checks nodes, connections, expressions. Returns errors/warnings/suggestions.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Workflow ID to validate' 
        },
        options: {
          type: 'object',
          description: 'Validation options',
          properties: {
            validateNodes: { 
              type: 'boolean', 
              description: 'Validate node configurations (default: true)' 
            },
            validateConnections: { 
              type: 'boolean', 
              description: 'Validate workflow connections (default: true)' 
            },
            validateExpressions: { 
              type: 'boolean', 
              description: 'Validate n8n expressions (default: true)' 
            },
            profile: { 
              type: 'string', 
              enum: ['minimal', 'runtime', 'ai-friendly', 'strict'],
              description: 'Validation profile to use (default: runtime)' 
            }
          }
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_autofix_workflow',
    description: `Automatically fix common workflow validation errors. Preview fixes or apply them. Fixes expression format, typeVersion, error output config, webhook paths.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to fix'
        },
        applyFixes: {
          type: 'boolean',
          description: 'Apply fixes to workflow (default: false - preview mode)'
        },
        fixTypes: {
          type: 'array',
          description: 'Types of fixes to apply (default: all)',
          items: {
            type: 'string',
            enum: ['expression-format', 'typeversion-correction', 'error-output-config', 'node-type-correction', 'webhook-missing-path']
          }
        },
        confidenceThreshold: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Minimum confidence level for fixes (default: medium)'
        },
        maxFixes: {
          type: 'number',
          description: 'Maximum number of fixes to apply (default: 50)'
        }
      },
      required: ['id']
    }
  },

  // Execution Management Tools
  {
    name: 'n8n_trigger_webhook_workflow',
    description: `Trigger workflow via webhook. Must be ACTIVE with Webhook node. Method must match config.`,
    inputSchema: {
      type: 'object',
      properties: {
        webhookUrl: { 
          type: 'string', 
          description: 'Full webhook URL from n8n workflow (e.g., https://n8n.example.com/webhook/abc-def-ghi)' 
        },
        httpMethod: { 
          type: 'string', 
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'HTTP method (must match webhook configuration, often GET)' 
        },
        data: { 
          type: 'object', 
          description: 'Data to send with the webhook request' 
        },
        headers: { 
          type: 'object', 
          description: 'Additional HTTP headers' 
        },
        waitForResponse: { 
          type: 'boolean', 
          description: 'Wait for workflow completion (default: true)' 
        }
      },
      required: ['webhookUrl']
    }
  },
  {
    name: 'n8n_get_execution',
    description: `Get details of a specific execution by ID.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Execution ID' 
        },
        includeData: { 
          type: 'boolean', 
          description: 'Include full execution data (default: false)' 
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_list_executions',
    description: `List workflow executions (returns up to limit). Check hasMore/nextCursor for pagination.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Number of executions to return (1-100, default: 100)' 
        },
        cursor: { 
          type: 'string', 
          description: 'Pagination cursor from previous response' 
        },
        workflowId: { 
          type: 'string', 
          description: 'Filter by workflow ID' 
        },
        projectId: { 
          type: 'string', 
          description: 'Filter by project ID (enterprise feature)' 
        },
        status: { 
          type: 'string', 
          enum: ['success', 'error', 'waiting'],
          description: 'Filter by execution status' 
        },
        includeData: { 
          type: 'boolean', 
          description: 'Include execution data (default: false)' 
        }
      }
    }
  },
  {
    name: 'n8n_delete_execution',
    description: `Delete an execution record. This only removes the execution history, not any data processed.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'Execution ID to delete' 
        }
      },
      required: ['id']
    }
  },

  // Additional Execution Tools
  {
    name: 'n8n_retry_execution',
    description: `Retry a failed execution with the same input data. Useful for transient errors.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the failed execution to retry'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_cancel_execution',
    description: `Cancel a currently running execution. Stops the workflow mid-process.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the running execution to cancel'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_stop_execution',
    description: `Stop all running executions for a workflow. Emergency stop for runaway workflows.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID to stop all executions'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'n8n_get_execution_data',
    description: `Get detailed input/output data for an execution. Shows what data flowed through each node.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Execution ID'
        },
        nodeNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Specific nodes to get data for'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_get_execution_logs',
    description: `Get execution logs and error details. Useful for debugging failed executions.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Execution ID'
        },
        includeNodeLogs: {
          type: 'boolean',
          description: 'Include detailed node-level logs (default: true)'
        }
      },
      required: ['id']
    }
  },

  // Webhook Management Tools
  {
    name: 'n8n_create_webhook',
    description: `Create a webhook endpoint for a workflow. Returns the webhook URL to call.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID to create webhook for'
        },
        path: {
          type: 'string',
          description: 'Custom webhook path (optional)'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'HTTP method (default: POST)'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'n8n_delete_webhook',
    description: `Delete a webhook endpoint from a workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID'
        },
        webhookId: {
          type: 'string',
          description: 'Webhook ID to delete'
        }
      },
      required: ['workflowId', 'webhookId']
    }
  },
  {
    name: 'n8n_list_webhooks',
    description: `List all webhooks for a workflow or all workflows.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Optional: Filter by workflow ID'
        }
      }
    }
  },
  {
    name: 'n8n_test_webhook',
    description: `Test a webhook with sample data. Triggers a test execution.`,
    inputSchema: {
      type: 'object',
      properties: {
        webhookUrl: {
          type: 'string',
          description: 'Full webhook URL to test'
        },
        testData: {
          type: 'object',
          description: 'Test payload to send'
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP headers'
        }
      },
      required: ['webhookUrl']
    }
  },
  {
    name: 'n8n_get_webhook_logs',
    description: `Get webhook call logs and history. Shows recent webhook invocations.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID'
        },
        limit: {
          type: 'number',
          description: 'Number of log entries (default: 10)'
        }
      },
      required: ['workflowId']
    }
  },

  // Workflow Operation Tools
  {
    name: 'n8n_activate_workflow',
    description: `Activate a workflow to enable execution. Required for webhooks and scheduled triggers.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to activate'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_deactivate_workflow',
    description: `Deactivate a workflow to stop execution. Useful for maintenance or debugging.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to deactivate'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'n8n_duplicate_workflow',
    description: `Create a copy of an existing workflow. Useful for creating variations or backups.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Workflow ID to duplicate'
        },
        name: {
          type: 'string',
          description: 'Optional name for the duplicate (default: "Copy of [original]")'
        }
      },
      required: ['id']
    }
  },

  // Template Tools
  {
    name: 'n8n_apply_template',
    description: `Apply a template to an existing workflow or create new from template.`,
    inputSchema: {
      type: 'object',
      properties: {
        templateId: {
          type: 'string',
          description: 'Template ID to apply'
        },
        workflowId: {
          type: 'string',
          description: 'Optional: Existing workflow to apply template to'
        },
        name: {
          type: 'string',
          description: 'Name for new workflow (if not updating existing)'
        }
      },
      required: ['templateId']
    }
  },
  {
    name: 'n8n_create_template',
    description: `Create a reusable template from an existing workflow.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID to create template from'
        },
        name: {
          type: 'string',
          description: 'Template name'
        },
        description: {
          type: 'string',
          description: 'Template description'
        }
      },
      required: ['workflowId', 'name']
    }
  },

  // Analysis Tools
  {
    name: 'n8n_analyze_dependencies',
    description: `Analyze workflow dependencies: which nodes depend on others, data flow paths.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Workflow ID to analyze'
        },
        nodeId: {
          type: 'string',
          description: 'Optional: Analyze dependencies for specific node'
        }
      },
      required: ['workflowId']
    }
  },

  // System Tools
  {
    name: 'n8n_health_check',
    description: `Check n8n instance health and API connectivity. Returns status and available features.`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'n8n_list_available_tools',
    description: `List available n8n tools and capabilities.`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'n8n_diagnostic',
    description: `Diagnose n8n API config. Shows tool status, API connectivity, env vars. Helps troubleshoot missing tools.`,
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Include detailed debug information (default: false)'
        }
      }
    }
  }
];