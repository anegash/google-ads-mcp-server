import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleAdsApiClient } from './api/client';
import { CredentialManager } from './auth/credentials';
import { GoogleAdsConfig } from './types';

export class GoogleAdsMCPServer {
  private server: Server;
  private apiClient: GoogleAdsApiClient;
  private credentialManager: CredentialManager;

  constructor(config?: GoogleAdsConfig) {
    this.server = new Server(
      {
        name: 'google-ads-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.credentialManager = new CredentialManager(config);
    this.apiClient = new GoogleAdsApiClient(this.credentialManager);

    this.setupHandlers();
  }

  private getArg(args: any, key: string): any {
    if (!args || typeof args !== 'object') {
      throw new Error(`Arguments are required for this tool`);
    }
    return args[key];
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Read operations
        {
          name: 'list_accounts',
          description: 'List all accessible Google Ads accounts',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_campaigns',
          description: 'Get campaigns for a customer',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID (10 digits)',
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_campaign_performance',
          description: 'Get campaign performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              campaignId: {
                type: 'string',
                description: 'Optional campaign ID',
              },
              dateRange: {
                type: 'string',
                description: 'Date range (e.g., LAST_30_DAYS, LAST_7_DAYS)',
                enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'ALL_TIME'],
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_ad_groups',
          description: 'Get ad groups for a customer or campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              campaignId: {
                type: 'string',
                description: 'Optional campaign ID to filter by',
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_ads',
          description: 'Get ads for a customer or ad group',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              adGroupId: {
                type: 'string',
                description: 'Optional ad group ID to filter by',
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_keywords',
          description: 'Get keywords for a customer or ad group',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              adGroupId: {
                type: 'string',
                description: 'Optional ad group ID to filter by',
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'execute_gaql_query',
          description: 'Execute a custom GAQL (Google Ads Query Language) query',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              query: {
                type: 'string',
                description: 'GAQL query string',
              },
              outputFormat: {
                type: 'string',
                description: 'Output format',
                enum: ['json', 'table', 'csv'],
              },
            },
            required: ['customerId', 'query'],
          },
        },
        {
          name: 'get_image_assets',
          description: 'Get image assets for a customer',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
            },
            required: ['customerId'],
          },
        },
        // Write operations
        {
          name: 'create_campaign',
          description: 'Create a new campaign (in PAUSED state)',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              name: {
                type: 'string',
                description: 'Campaign name',
              },
              advertisingChannelType: {
                type: 'string',
                description: 'Advertising channel type',
                enum: ['SEARCH', 'DISPLAY', 'SHOPPING', 'VIDEO'],
              },
              budgetAmountMicros: {
                type: 'number',
                description: 'Daily budget in micros (1,000,000 = $1)',
              },
              startDate: {
                type: 'string',
                description: 'Start date (YYYY-MM-DD)',
              },
              endDate: {
                type: 'string',
                description: 'End date (YYYY-MM-DD)',
              },
            },
            required: ['customerId', 'name', 'budgetAmountMicros'],
          },
        },
        {
          name: 'update_campaign_status',
          description: 'Update campaign status (ENABLED, PAUSED, REMOVED)',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              campaignId: {
                type: 'string',
                description: 'Campaign ID',
              },
              status: {
                type: 'string',
                description: 'New status',
                enum: ['ENABLED', 'PAUSED', 'REMOVED'],
              },
            },
            required: ['customerId', 'campaignId', 'status'],
          },
        },
        {
          name: 'create_ad_group',
          description: 'Create a new ad group (in PAUSED state)',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              campaignId: {
                type: 'string',
                description: 'Campaign ID',
              },
              name: {
                type: 'string',
                description: 'Ad group name',
              },
              cpcBidMicros: {
                type: 'number',
                description: 'CPC bid in micros',
              },
            },
            required: ['customerId', 'campaignId', 'name'],
          },
        },
        {
          name: 'create_responsive_search_ad',
          description: 'Create a responsive search ad (in PAUSED state)',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              adGroupId: {
                type: 'string',
                description: 'Ad group ID',
              },
              headlines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Headlines (3-15, max 30 chars each)',
              },
              descriptions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Descriptions (2-4, max 90 chars each)',
              },
              finalUrls: {
                type: 'array',
                items: { type: 'string' },
                description: 'Final URLs',
              },
            },
            required: ['customerId', 'adGroupId', 'headlines', 'descriptions', 'finalUrls'],
          },
        },
        {
          name: 'add_keywords',
          description: 'Add keywords to an ad group',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              adGroupId: {
                type: 'string',
                description: 'Ad group ID',
              },
              keywords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    matchType: {
                      type: 'string',
                      enum: ['EXACT', 'PHRASE', 'BROAD'],
                    },
                    cpcBidMicros: { type: 'number' },
                  },
                  required: ['text'],
                },
                description: 'Keywords to add',
              },
            },
            required: ['customerId', 'adGroupId', 'keywords'],
          },
        },
        {
          name: 'add_negative_keywords',
          description: 'Add negative keywords to an ad group',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: {
                type: 'string',
                description: 'Google Ads customer ID',
              },
              adGroupId: {
                type: 'string',
                description: 'Ad group ID',
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Negative keywords to add',
              },
            },
            required: ['customerId', 'adGroupId', 'keywords'],
          },
        },
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'gaql://reference',
          name: 'GAQL Reference',
          description: 'Google Ads Query Language reference and examples',
          mimeType: 'text/markdown',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (request.params.uri === 'gaql://reference') {
        return {
          contents: [
            {
              uri: 'gaql://reference',
              mimeType: 'text/markdown',
              text: `# Google Ads Query Language (GAQL) Reference

## Basic Syntax
\`\`\`sql
SELECT
  field1,
  field2
FROM resource
WHERE condition
ORDER BY field
LIMIT n
\`\`\`

## Common Resources
- campaign
- ad_group
- ad_group_ad
- ad_group_criterion
- customer
- asset
- campaign_budget

## Common Fields
- campaign.name
- campaign.status
- metrics.impressions
- metrics.clicks
- metrics.cost_micros
- metrics.conversions

## Example Queries

### Get Campaign Performance
\`\`\`sql
SELECT
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
\`\`\`

### Get Keywords
\`\`\`sql
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  metrics.impressions
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'KEYWORD'
\`\`\`
`,
            },
          ],
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${request.params.uri}`);
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'analyze_campaign',
          description: 'Analyze campaign performance and provide recommendations',
          arguments: [
            {
              name: 'customerId',
              description: 'Google Ads customer ID',
              required: true,
            },
          ],
        },
        {
          name: 'gaql_help',
          description: 'Get help with writing GAQL queries',
          arguments: [
            {
              name: 'objective',
              description: 'What you want to query',
              required: true,
            },
          ],
        },
      ],
    }));

    // Get prompt content
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'analyze_campaign') {
        return {
          description: 'Analyze campaign performance',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Analyze the Google Ads campaigns for customer ${args?.customerId} and provide recommendations for improvement.`,
              },
            },
          ],
        };
      }

      if (name === 'gaql_help') {
        return {
          description: 'Help with GAQL queries',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Help me write a GAQL query to: ${args?.objective}`,
              },
            },
          ],
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Read operations
          case 'list_accounts':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.apiClient.listAccounts(), null, 2),
                },
              ],
            };

          case 'get_campaigns':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getCampaigns(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_campaign_performance':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getCampaignPerformance(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'campaignId'),
                      this.getArg(args, 'dateRange') || 'LAST_30_DAYS'
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_ad_groups':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAdGroups(this.getArg(args, 'customerId'), this.getArg(args, 'campaignId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_ads':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAds(this.getArg(args, 'customerId'), this.getArg(args, 'adGroupId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_keywords':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getKeywords(this.getArg(args, 'customerId'), this.getArg(args, 'adGroupId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'execute_gaql_query':
            const result = await this.apiClient.executeGAQLQuery({
              customerId: this.getArg(args, 'customerId'),
              query: this.getArg(args, 'query'),
              outputFormat: this.getArg(args, 'outputFormat') || 'json',
            });

            return {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            };

          case 'get_image_assets':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getImageAssets(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          // Write operations
          case 'create_campaign':
            const campaignId = await this.apiClient.createCampaign(this.getArg(args, 'customerId'), {
              name: this.getArg(args, 'name'),
              advertisingChannelType: this.getArg(args, 'advertisingChannelType') || 'SEARCH',
              budget: this.getArg(args, 'budgetAmountMicros') / 1000000,
              startDate: this.getArg(args, 'startDate'),
              endDate: this.getArg(args, 'endDate'),
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `Campaign created successfully. ID: ${campaignId}`,
                },
              ],
            };

          case 'update_campaign_status':
            await this.apiClient.updateCampaignStatus(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'campaignId'),
              this.getArg(args, 'status')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Campaign ${this.getArg(args, 'campaignId')} status updated to ${this.getArg(args, 'status')}`,
                },
              ],
            };

          case 'create_ad_group':
            const adGroupId = await this.apiClient.createAdGroup(this.getArg(args, 'customerId'), {
              name: this.getArg(args, 'name'),
              campaignId: this.getArg(args, 'campaignId'),
              cpcBidMicros: this.getArg(args, 'cpcBidMicros') || 1000000,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `Ad group created successfully. ID: ${adGroupId}`,
                },
              ],
            };

          case 'create_responsive_search_ad':
            // Validate input
            const headlines = this.getArg(args, 'headlines');
            const descriptions = this.getArg(args, 'descriptions');
            if (headlines.length < 3 || headlines.length > 15) {
              throw new Error('Headlines must be between 3 and 15');
            }
            if (descriptions.length < 2 || descriptions.length > 4) {
              throw new Error('Descriptions must be between 2 and 4');
            }

            const adId = await this.apiClient.createResponsiveSearchAd(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adGroupId'),
              headlines,
              descriptions,
              this.getArg(args, 'finalUrls')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Responsive search ad created successfully. ID: ${adId}`,
                },
              ],
            };

          case 'add_keywords':
            const keywordIds = await this.apiClient.addKeywords(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adGroupId'),
              this.getArg(args, 'keywords')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Added ${keywordIds.length} keywords successfully`,
                },
              ],
            };

          case 'add_negative_keywords':
            const negativeKeywordIds = await this.apiClient.addNegativeKeywords(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adGroupId'),
              this.getArg(args, 'keywords')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Added ${negativeKeywordIds.length} negative keywords successfully`,
                },
              ],
            };

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        // Log detailed error for debugging
        console.error('=== MCP Server Tool Error ===');
        console.error('Tool:', name);
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('=============================');

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Ads MCP server started');
  }
}