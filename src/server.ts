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

        // ==================== PHASE 1: CONVERSION TRACKING ====================
        {
          name: 'get_conversions',
          description: 'Get conversion actions and their performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: {
                type: 'string',
                description: 'Date range for metrics',
                enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_MONTH', 'LAST_MONTH'],
              },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_conversion_action',
          description: 'Create a new conversion action for tracking',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Name of the conversion action' },
              category: {
                type: 'string',
                enum: ['DEFAULT', 'PAGE_VIEW', 'PURCHASE', 'SIGNUP', 'LEAD', 'DOWNLOAD'],
                description: 'Conversion category',
              },
              type: {
                type: 'string',
                enum: ['WEBPAGE', 'PHONE_CALL_FROM_ADS', 'APP_INSTALLS', 'IMPORT'],
                description: 'Conversion type',
              },
              defaultValue: { type: 'number', description: 'Default conversion value' },
              countingType: {
                type: 'string',
                enum: ['ONE_PER_CLICK', 'MANY_PER_CLICK'],
                description: 'How to count conversions',
              },
            },
            required: ['customerId', 'name', 'category', 'type'],
          },
        },
        {
          name: 'update_conversion_action',
          description: 'Update an existing conversion action',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              conversionId: { type: 'string', description: 'Conversion action ID' },
              updates: { type: 'object', description: 'Fields to update' },
            },
            required: ['customerId', 'conversionId', 'updates'],
          },
        },
        {
          name: 'get_conversion_attribution',
          description: 'Get conversion attribution analysis',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              conversionId: { type: 'string', description: 'Optional conversion action ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_conversion_path_data',
          description: 'Get customer journey conversion path data',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', description: 'Date range', default: 'LAST_30_DAYS' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'import_offline_conversions',
          description: 'Upload offline conversion data',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              conversions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    gclid: { type: 'string', description: 'Google Click Identifier' },
                    conversionDateTime: { type: 'string', description: 'Conversion date-time' },
                    conversionValue: { type: 'number', description: 'Conversion value' },
                    currencyCode: { type: 'string', description: 'Currency code' },
                    orderId: { type: 'string', description: 'Order ID' },
                  },
                  required: ['conversionDateTime'],
                },
                description: 'Array of offline conversions',
              },
            },
            required: ['customerId', 'conversions'],
          },
        },

        // ==================== PHASE 2: AUDIENCE MANAGEMENT ====================
        {
          name: 'get_audiences',
          description: 'List all available audiences and user lists',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_custom_audience',
          description: 'Create a custom audience list',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Audience name' },
              description: { type: 'string', description: 'Audience description' },
              membershipDurationDays: { type: 'number', description: 'Membership duration in days' },
            },
            required: ['customerId', 'name'],
          },
        },
        {
          name: 'add_audience_to_campaign',
          description: 'Apply audience targeting to a campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
              audienceId: { type: 'string', description: 'Audience ID' },
            },
            required: ['customerId', 'campaignId', 'audienceId'],
          },
        },
        {
          name: 'remove_audience_from_campaign',
          description: 'Remove audience targeting from a campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
              audienceId: { type: 'string', description: 'Audience ID' },
            },
            required: ['customerId', 'campaignId', 'audienceId'],
          },
        },
        {
          name: 'get_audience_insights',
          description: 'Get audience performance insights',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              audienceId: { type: 'string', description: 'Optional audience ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_customer_match_list',
          description: 'Create a customer match audience list',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'List name' },
              uploadKeyType: {
                type: 'string',
                enum: ['CONTACT_INFO', 'CRM_ID', 'MOBILE_ADVERTISING_ID'],
                description: 'Type of customer data',
              },
            },
            required: ['customerId', 'name', 'uploadKeyType'],
          },
        },
        {
          name: 'upload_customer_match_data',
          description: 'Upload customer data to customer match list',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              userListId: { type: 'string', description: 'User list ID' },
              customerData: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    hashedEmail: { type: 'string' },
                    hashedPhoneNumber: { type: 'string' },
                    mobileId: { type: 'string' },
                  },
                },
                description: 'Customer data to upload',
              },
            },
            required: ['customerId', 'userListId', 'customerData'],
          },
        },
        {
          name: 'create_lookalike_audience',
          description: 'Create a lookalike/similar audience',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              seedAudienceId: { type: 'string', description: 'Seed audience ID' },
              name: { type: 'string', description: 'New audience name' },
            },
            required: ['customerId', 'seedAudienceId', 'name'],
          },
        },

        // ==================== PHASE 3: ENHANCED REPORTING ====================
        {
          name: 'get_search_term_report',
          description: 'Get search query performance report',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_30_DAYS' },
              minImpressions: { type: 'number', description: 'Minimum impressions filter' },
              campaignIds: { type: 'array', items: { type: 'string' } },
              limit: { type: 'number', description: 'Result limit' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_demographic_report',
          description: 'Get age and gender performance report',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_30_DAYS' },
              campaignIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_geographic_report',
          description: 'Get location performance report',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_30_DAYS' },
              campaignIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_auction_insights',
          description: 'Get competitive analysis and auction insights',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Optional campaign ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_change_history',
          description: 'Get account change history log',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_7_DAYS' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'generate_forecast_metrics',
          description: 'Generate traffic and conversion forecasts',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              keywordTexts: { type: 'array', items: { type: 'string' } },
              maxCpcBidMicros: { type: 'number' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
            },
            required: ['customerId', 'keywordTexts'],
          },
        },
        {
          name: 'get_click_view_report',
          description: 'Get detailed click-level data',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_7_DAYS' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_video_report',
          description: 'Get video campaign performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_30_DAYS' },
            },
            required: ['customerId'],
          },
        },

        // ==================== PHASE 4: BUDGET & BIDDING ====================
        {
          name: 'get_shared_budgets',
          description: 'List shared campaign budgets',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_shared_budget',
          description: 'Create a shared budget for multiple campaigns',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Budget name' },
              amountMicros: { type: 'number', description: 'Budget amount in micros' },
              deliveryMethod: { type: 'string', enum: ['STANDARD', 'ACCELERATED'] },
            },
            required: ['customerId', 'name', 'amountMicros'],
          },
        },
        {
          name: 'get_bidding_strategies',
          description: 'List automated bidding strategies',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_bidding_strategy',
          description: 'Create an automated bidding strategy',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Strategy name' },
              type: {
                type: 'string',
                enum: ['TARGET_CPA', 'TARGET_ROAS', 'MAXIMIZE_CONVERSIONS', 'MAXIMIZE_CONVERSION_VALUE'],
              },
              targetCpa: { type: 'number', description: 'Target CPA in currency' },
              targetRoas: { type: 'number', description: 'Target ROAS' },
            },
            required: ['customerId', 'name', 'type'],
          },
        },
        {
          name: 'get_bid_simulations',
          description: 'Get bid simulation forecasts',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              resourceId: { type: 'string', description: 'Campaign or ad group ID' },
              resourceType: { type: 'string', enum: ['campaign', 'ad_group'] },
            },
            required: ['customerId', 'resourceId', 'resourceType'],
          },
        },
        {
          name: 'update_bid_adjustments',
          description: 'Update device/location bid adjustments',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              adjustments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    resourceId: { type: 'string' },
                    device: { type: 'string', enum: ['MOBILE', 'DESKTOP', 'TABLET'] },
                    bidModifier: { type: 'number' },
                  },
                },
              },
            },
            required: ['customerId', 'adjustments'],
          },
        },
        {
          name: 'get_budget_recommendations',
          description: 'Get Google budget optimization recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
            },
            required: ['customerId', 'campaignId'],
          },
        },

        // ==================== PHASE 5: ASSET MANAGEMENT ====================
        {
          name: 'upload_image_asset',
          description: 'Upload image asset for ads',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              imageData: { type: 'string', description: 'Base64 encoded image data' },
              name: { type: 'string', description: 'Asset name' },
            },
            required: ['customerId', 'imageData', 'name'],
          },
        },
        {
          name: 'get_video_assets',
          description: 'List video assets',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_asset_group',
          description: 'Create asset group for Performance Max',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
              name: { type: 'string', description: 'Asset group name' },
              finalUrls: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId', 'campaignId', 'name', 'finalUrls'],
          },
        },
        {
          name: 'get_asset_performance',
          description: 'Get asset performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              assetId: { type: 'string', description: 'Optional asset ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_sitelink_assets',
          description: 'Create sitelink extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              sitelinks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    linkText: { type: 'string' },
                    finalUrls: { type: 'array', items: { type: 'string' } },
                    description1: { type: 'string' },
                    description2: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'sitelinks'],
          },
        },
        {
          name: 'create_callout_assets',
          description: 'Create callout extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              callouts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    calloutText: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'callouts'],
          },
        },
        {
          name: 'create_structured_snippet_assets',
          description: 'Create structured snippet extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              snippets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    header: {
                      type: 'string',
                      enum: ['BRANDS', 'COURSES', 'DEGREE_PROGRAMS', 'DESTINATIONS', 'FEATURED_HOTELS'],
                    },
                    values: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
            required: ['customerId', 'snippets'],
          },
        },

        // ==================== PHASE 6: ADVANCED CAMPAIGNS ====================
        {
          name: 'create_performance_max_campaign',
          description: 'Create a Performance Max campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Campaign name' },
              budgetAmountMicros: { type: 'number', description: 'Daily budget in micros' },
              biddingStrategyType: {
                type: 'string',
                enum: ['MAXIMIZE_CONVERSIONS', 'MAXIMIZE_CONVERSION_VALUE', 'TARGET_CPA', 'TARGET_ROAS'],
              },
              targetCpaMicros: { type: 'number' },
              targetRoas: { type: 'number' },
            },
            required: ['customerId', 'name', 'budgetAmountMicros'],
          },
        },
        {
          name: 'create_demand_gen_campaign',
          description: 'Create a Demand Gen campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Campaign name' },
              budgetAmountMicros: { type: 'number', description: 'Daily budget in micros' },
              targetAudience: { type: 'string', enum: ['DISCOVERY', 'YOUTUBE_IN_FEED', 'GMAIL'] },
            },
            required: ['customerId', 'name', 'budgetAmountMicros'],
          },
        },
        {
          name: 'create_app_campaign',
          description: 'Create an App promotion campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Campaign name' },
              appId: { type: 'string', description: 'App ID' },
              appStore: { type: 'string', enum: ['GOOGLE_APP_STORE', 'APPLE_APP_STORE'] },
              budgetAmountMicros: { type: 'number', description: 'Daily budget in micros' },
            },
            required: ['customerId', 'name', 'appId', 'appStore', 'budgetAmountMicros'],
          },
        },
        {
          name: 'create_smart_campaign',
          description: 'Create a Smart campaign',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Campaign name' },
              budgetAmountMicros: { type: 'number', description: 'Daily budget in micros' },
              businessName: { type: 'string', description: 'Business name' },
              finalUrl: { type: 'string', description: 'Website URL' },
            },
            required: ['customerId', 'name', 'budgetAmountMicros', 'businessName'],
          },
        },
        {
          name: 'get_campaign_experiments',
          description: 'List campaign experiments',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'create_campaign_experiment',
          description: 'Create a campaign A/B test experiment',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              name: { type: 'string', description: 'Experiment name' },
              baseCampaignId: { type: 'string', description: 'Base campaign ID' },
              trafficSplitPercent: { type: 'number', description: 'Traffic split percentage' },
            },
            required: ['customerId', 'name', 'baseCampaignId', 'trafficSplitPercent'],
          },
        },

        // ==================== PHASE 7: GEOGRAPHIC & DEMOGRAPHIC TARGETING ====================
        {
          name: 'get_geographic_performance',
          description: 'Get performance breakdown by location',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              dateRange: { type: 'string', default: 'LAST_30_DAYS' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'add_location_targets',
          description: 'Add geographic targeting to campaigns',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
              locations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    locationId: { type: 'string' },
                    bidModifier: { type: 'number' },
                  },
                },
              },
            },
            required: ['customerId', 'campaignId', 'locations'],
          },
        },
        {
          name: 'add_demographic_targets',
          description: 'Add age/gender targeting',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              adGroupId: { type: 'string', description: 'Ad group ID' },
              demographics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ageRange: { type: 'string' },
                    gender: { type: 'string' },
                    bidModifier: { type: 'number' },
                  },
                },
              },
            },
            required: ['customerId', 'adGroupId', 'demographics'],
          },
        },
        {
          name: 'get_location_insights',
          description: 'Get location targeting insights',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              locationIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId', 'locationIds'],
          },
        },
        {
          name: 'set_location_bid_adjustments',
          description: 'Adjust bids by location',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              adjustments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    campaignId: { type: 'string' },
                    locationId: { type: 'string' },
                    bidModifier: { type: 'number' },
                  },
                },
              },
            },
            required: ['customerId', 'adjustments'],
          },
        },
        {
          name: 'manage_language_targets',
          description: 'Manage language targeting',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              campaignId: { type: 'string', description: 'Campaign ID' },
              languageCodes: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId', 'campaignId', 'languageCodes'],
          },
        },

        // ==================== PHASE 8: EXTENSIONS & RECOMMENDATIONS ====================
        {
          name: 'create_sitelink_extensions',
          description: 'Create sitelink ad extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              sitelinks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    linkText: { type: 'string' },
                    finalUrls: { type: 'array', items: { type: 'string' } },
                    description1: { type: 'string' },
                    description2: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'sitelinks'],
          },
        },
        {
          name: 'create_call_extensions',
          description: 'Create call extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              callExtensions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phoneNumber: { type: 'string' },
                    countryCode: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'callExtensions'],
          },
        },
        {
          name: 'create_callout_extensions',
          description: 'Create callout extensions',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              callouts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    calloutText: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'callouts'],
          },
        },
        {
          name: 'get_extension_performance',
          description: 'Get extension performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              extensionType: { type: 'string', description: 'Type of extension' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'get_recommendations',
          description: 'Get Google optimization recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              types: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'apply_recommendation',
          description: 'Apply a Google recommendation',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              recommendationId: { type: 'string', description: 'Recommendation ID' },
            },
            required: ['customerId', 'recommendationId'],
          },
        },
        {
          name: 'dismiss_recommendation',
          description: 'Dismiss a Google recommendation',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              recommendationId: { type: 'string', description: 'Recommendation ID' },
            },
            required: ['customerId', 'recommendationId'],
          },
        },
        {
          name: 'get_keyword_ideas',
          description: 'Get keyword suggestions and ideas',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              keywordSeed: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId', 'keywordSeed'],
          },
        },

        // ==================== PHASE 9: ORGANIZATION & MANAGEMENT ====================
        {
          name: 'create_labels',
          description: 'Create organizational labels',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              labels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    backgroundColor: { type: 'string' },
                  },
                },
              },
            },
            required: ['customerId', 'labels'],
          },
        },
        {
          name: 'apply_labels',
          description: 'Apply labels to campaigns/ads',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              resourceType: { type: 'string', enum: ['campaign', 'ad_group', 'ad'] },
              resourceIds: { type: 'array', items: { type: 'string' } },
              labelIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['customerId', 'resourceType', 'resourceIds', 'labelIds'],
          },
        },
        {
          name: 'get_labeled_resources',
          description: 'Find resources by label',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              labelId: { type: 'string', description: 'Label ID' },
            },
            required: ['customerId', 'labelId'],
          },
        },
        {
          name: 'bulk_edit_operations',
          description: 'Perform bulk edit operations',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    operationType: { type: 'string', enum: ['CREATE', 'UPDATE', 'REMOVE'] },
                    resourceType: { type: 'string' },
                    operations: { type: 'array' },
                  },
                },
              },
            },
            required: ['customerId', 'operations'],
          },
        },
        {
          name: 'get_account_hierarchy',
          description: 'Get account structure and hierarchy',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
            },
            required: ['customerId'],
          },
        },
        {
          name: 'manage_link_invitations',
          description: 'Manage account linking invitations',
          inputSchema: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Google Ads customer ID' },
              targetCustomerId: { type: 'string', description: 'Target customer ID' },
              action: { type: 'string', enum: ['LINK', 'UNLINK'] },
            },
            required: ['customerId', 'targetCustomerId', 'action'],
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

          // ==================== PHASE 1: CONVERSION TRACKING ====================
          case 'get_conversions':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getConversions(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'dateRange') || 'LAST_30_DAYS'
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_conversion_action':
            const conversionActionId = await this.apiClient.createConversionAction(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                category: this.getArg(args, 'category'),
                type: this.getArg(args, 'type'),
                counting_type: this.getArg(args, 'countingType'),
                value_settings: this.getArg(args, 'defaultValue') ? {
                  default_value: this.getArg(args, 'defaultValue'),
                  always_use_default_value: true
                } : undefined
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Conversion action created successfully. Resource: ${conversionActionId}`,
                },
              ],
            };

          case 'update_conversion_action':
            await this.apiClient.updateConversionAction(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'conversionId'),
              this.getArg(args, 'updates')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Conversion action updated successfully`,
                },
              ],
            };

          case 'get_conversion_attribution':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getConversionAttribution(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'conversionId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_conversion_path_data':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getConversionPathData(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'dateRange') || 'LAST_30_DAYS'
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'import_offline_conversions':
            await this.apiClient.importOfflineConversions(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'conversions')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Imported ${this.getArg(args, 'conversions').length} offline conversions successfully`,
                },
              ],
            };

          // ==================== PHASE 2: AUDIENCE MANAGEMENT ====================
          case 'get_audiences':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAudiences(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_custom_audience':
            const audienceId = await this.apiClient.createCustomAudience(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                description: this.getArg(args, 'description'),
                membership_duration_days: this.getArg(args, 'membershipDurationDays'),
                type: 'NORMAL'
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Custom audience created successfully. Resource: ${audienceId}`,
                },
              ],
            };

          case 'add_audience_to_campaign':
            const audienceTargetId = await this.apiClient.addAudienceToCampaign(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'campaignId'),
              this.getArg(args, 'audienceId')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Audience added to campaign successfully. Resource: ${audienceTargetId}`,
                },
              ],
            };

          case 'remove_audience_from_campaign':
            await this.apiClient.removeAudienceFromCampaign(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'campaignId'),
              this.getArg(args, 'audienceId')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Audience removed from campaign successfully`,
                },
              ],
            };

          case 'get_audience_insights':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAudienceInsights(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'audienceId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_customer_match_list':
            const customerMatchId = await this.apiClient.createCustomerMatchList(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                upload_key_type: this.getArg(args, 'uploadKeyType')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Customer match list created successfully. Resource: ${customerMatchId}`,
                },
              ],
            };

          case 'upload_customer_match_data':
            await this.apiClient.uploadCustomerMatchData(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'userListId'),
              this.getArg(args, 'customerData')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Customer data uploaded successfully to list`,
                },
              ],
            };

          case 'create_lookalike_audience':
            const lookalikeId = await this.apiClient.createLookalikeAudience(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'seedAudienceId'),
              this.getArg(args, 'name')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Lookalike audience created successfully. Resource: ${lookalikeId}`,
                },
              ],
            };

          // ==================== PHASE 3: ENHANCED REPORTING ====================
          case 'get_search_term_report':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getSearchTermReport(
                      this.getArg(args, 'customerId'),
                      {
                        dateRange: this.getArg(args, 'dateRange'),
                        minImpressions: this.getArg(args, 'minImpressions'),
                        campaignIds: this.getArg(args, 'campaignIds'),
                        limit: this.getArg(args, 'limit')
                      }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_demographic_report':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getDemographicReport(
                      this.getArg(args, 'customerId'),
                      {
                        dateRange: this.getArg(args, 'dateRange'),
                        campaignIds: this.getArg(args, 'campaignIds')
                      }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_geographic_report':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getGeographicReport(
                      this.getArg(args, 'customerId'),
                      {
                        dateRange: this.getArg(args, 'dateRange'),
                        campaignIds: this.getArg(args, 'campaignIds')
                      }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_auction_insights':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAuctionInsights(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'campaignId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_change_history':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getChangeHistory(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'dateRange') || 'LAST_7_DAYS'
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'generate_forecast_metrics':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.generateForecastMetrics(
                      this.getArg(args, 'customerId'),
                      {
                        keywordTexts: this.getArg(args, 'keywordTexts'),
                        maxCpcBidMicros: this.getArg(args, 'maxCpcBidMicros'),
                        dateRange: {
                          start_date: this.getArg(args, 'startDate'),
                          end_date: this.getArg(args, 'endDate')
                        }
                      }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_click_view_report':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getClickViewReport(
                      this.getArg(args, 'customerId'),
                      { dateRange: this.getArg(args, 'dateRange') }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_video_report':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getVideoReport(
                      this.getArg(args, 'customerId'),
                      { dateRange: this.getArg(args, 'dateRange') }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          // ==================== PHASE 4: BUDGET & BIDDING ====================
          case 'get_shared_budgets':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getSharedBudgets(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_shared_budget':
            const sharedBudgetId = await this.apiClient.createSharedBudget(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                amount_micros: this.getArg(args, 'amountMicros'),
                delivery_method: this.getArg(args, 'deliveryMethod')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Shared budget created successfully. Resource: ${sharedBudgetId}`,
                },
              ],
            };

          case 'get_bidding_strategies':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getBiddingStrategies(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_bidding_strategy':
            const biddingStrategyId = await this.apiClient.createBiddingStrategy(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                type: this.getArg(args, 'type'),
                target_cpa: this.getArg(args, 'targetCpa') ? {
                  target_cpa_micros: this.getArg(args, 'targetCpa') * 1000000
                } : undefined,
                target_roas: this.getArg(args, 'targetRoas') ? {
                  target_roas: this.getArg(args, 'targetRoas')
                } : undefined
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Bidding strategy created successfully. Resource: ${biddingStrategyId}`,
                },
              ],
            };

          case 'get_bid_simulations':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getBidSimulations(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'resourceId'),
                      this.getArg(args, 'resourceType')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'update_bid_adjustments':
            await this.apiClient.updateBidAdjustments(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adjustments').map((adj: any) => ({
                resource_type: 'CAMPAIGN',
                resource_id: adj.resourceId,
                device: adj.device,
                bid_modifier: adj.bidModifier
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Bid adjustments updated successfully`,
                },
              ],
            };

          case 'get_budget_recommendations':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getBudgetRecommendations(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'campaignId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          // ==================== PHASE 5: ASSET MANAGEMENT ====================
          case 'upload_image_asset':
            const imageAssetId = await this.apiClient.uploadImageAsset(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'imageData'),
              this.getArg(args, 'name')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Image asset uploaded successfully. Resource: ${imageAssetId}`,
                },
              ],
            };

          case 'get_video_assets':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getVideoAssets(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_asset_group':
            const assetGroupId = await this.apiClient.createAssetGroup(
              this.getArg(args, 'customerId'),
              {
                campaign_id: this.getArg(args, 'campaignId'),
                name: this.getArg(args, 'name'),
                final_urls: this.getArg(args, 'finalUrls'),
                status: 'PAUSED',
                headline_assets: [],
                description_assets: []
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Asset group created successfully. Resource: ${assetGroupId}`,
                },
              ],
            };

          case 'get_asset_performance':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAssetPerformance(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'assetId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_sitelink_assets':
            const sitelinkAssetIds = await this.apiClient.createSitelinkAssets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'sitelinks').map((sl: any) => ({
                link_text: sl.linkText,
                final_urls: sl.finalUrls,
                description1: sl.description1,
                description2: sl.description2
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${sitelinkAssetIds.length} sitelink assets successfully`,
                },
              ],
            };

          case 'create_callout_assets':
            const calloutAssetIds = await this.apiClient.createCalloutAssets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'callouts').map((co: any) => ({
                callout_text: co.calloutText
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${calloutAssetIds.length} callout assets successfully`,
                },
              ],
            };

          case 'create_structured_snippet_assets':
            const snippetAssetIds = await this.apiClient.createStructuredSnippetAssets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'snippets')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${snippetAssetIds.length} structured snippet assets successfully`,
                },
              ],
            };

          // ==================== PHASE 6: ADVANCED CAMPAIGNS ====================
          case 'create_performance_max_campaign':
            const pmaxCampaignId = await this.apiClient.createPerformanceMaxCampaign(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                budget_amount_micros: this.getArg(args, 'budgetAmountMicros'),
                bidding_strategy_type: this.getArg(args, 'biddingStrategyType'),
                target_cpa_micros: this.getArg(args, 'targetCpaMicros'),
                target_roas: this.getArg(args, 'targetRoas')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Performance Max campaign created successfully. Resource: ${pmaxCampaignId}`,
                },
              ],
            };

          case 'create_demand_gen_campaign':
            const demandGenId = await this.apiClient.createDemandGenCampaign(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                budget_amount_micros: this.getArg(args, 'budgetAmountMicros'),
                target_audience: this.getArg(args, 'targetAudience')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Demand Gen campaign created successfully. Resource: ${demandGenId}`,
                },
              ],
            };

          case 'create_app_campaign':
            const appCampaignId = await this.apiClient.createAppCampaign(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                app_id: this.getArg(args, 'appId'),
                app_store: this.getArg(args, 'appStore'),
                budget_amount_micros: this.getArg(args, 'budgetAmountMicros')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `App campaign created successfully. Resource: ${appCampaignId}`,
                },
              ],
            };

          case 'create_smart_campaign':
            const smartCampaignId = await this.apiClient.createSmartCampaign(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                budget_amount_micros: this.getArg(args, 'budgetAmountMicros'),
                business_name: this.getArg(args, 'businessName'),
                final_url: this.getArg(args, 'finalUrl')
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Smart campaign created successfully. Resource: ${smartCampaignId}`,
                },
              ],
            };

          case 'get_campaign_experiments':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getCampaignExperiments(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'create_campaign_experiment':
            const experimentId = await this.apiClient.createCampaignExperiment(
              this.getArg(args, 'customerId'),
              {
                name: this.getArg(args, 'name'),
                base_campaign_id: this.getArg(args, 'baseCampaignId'),
                traffic_split_percent: this.getArg(args, 'trafficSplitPercent'),
                start_date: new Date().toISOString().split('T')[0]
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Campaign experiment created successfully. Resource: ${experimentId}`,
                },
              ],
            };

          // ==================== PHASE 7: GEOGRAPHIC & DEMOGRAPHIC TARGETING ====================
          case 'get_geographic_performance':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getGeographicPerformance(
                      this.getArg(args, 'customerId'),
                      { dateRange: this.getArg(args, 'dateRange') }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'add_location_targets':
            await this.apiClient.addLocationTargets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'campaignId'),
              this.getArg(args, 'locations').map((loc: any) => ({
                location_id: loc.locationId,
                bid_modifier: loc.bidModifier,
                location_type: 'COUNTRY'
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Location targets added successfully`,
                },
              ],
            };

          case 'add_demographic_targets':
            await this.apiClient.addDemographicTargets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adGroupId'),
              this.getArg(args, 'demographics').map((demo: any) => ({
                age_range: demo.ageRange,
                gender: demo.gender,
                bid_modifier: demo.bidModifier
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Demographic targets added successfully`,
                },
              ],
            };

          case 'get_location_insights':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getLocationInsights(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'locationIds')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'set_location_bid_adjustments':
            await this.apiClient.setLocationBidAdjustments(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'adjustments')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Location bid adjustments updated successfully`,
                },
              ],
            };

          case 'manage_language_targets':
            await this.apiClient.manageLanguageTargets(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'campaignId'),
              this.getArg(args, 'languageCodes')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Language targets updated successfully`,
                },
              ],
            };

          // ==================== PHASE 8: EXTENSIONS & RECOMMENDATIONS ====================
          case 'create_sitelink_extensions':
            const sitelinkExtIds = await this.apiClient.createSitelinkExtensions(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'sitelinks').map((sl: any) => ({
                link_text: sl.linkText,
                final_urls: sl.finalUrls,
                description1: sl.description1,
                description2: sl.description2
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${sitelinkExtIds.length} sitelink extensions successfully`,
                },
              ],
            };

          case 'create_call_extensions':
            const callExtIds = await this.apiClient.createCallExtensions(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'callExtensions').map((ce: any) => ({
                phone_number: ce.phoneNumber,
                country_code: ce.countryCode
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${callExtIds.length} call extensions successfully`,
                },
              ],
            };

          case 'create_callout_extensions':
            const calloutExtIds = await this.apiClient.createCalloutExtensions(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'callouts').map((co: any) => ({
                callout_text: co.calloutText
              }))
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${calloutExtIds.length} callout extensions successfully`,
                },
              ],
            };

          case 'get_extension_performance':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getExtensionPerformance(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'extensionType')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_recommendations':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getRecommendations(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'types')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'apply_recommendation':
            await this.apiClient.applyRecommendation(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'recommendationId')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Recommendation applied successfully`,
                },
              ],
            };

          case 'dismiss_recommendation':
            await this.apiClient.dismissRecommendation(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'recommendationId')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Recommendation dismissed successfully`,
                },
              ],
            };

          case 'get_keyword_ideas':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getKeywordIdeas(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'keywordSeed')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          // ==================== PHASE 9: ORGANIZATION & MANAGEMENT ====================
          case 'create_labels':
            const labelIds = await this.apiClient.createLabels(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'labels')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Created ${labelIds.length} labels successfully`,
                },
              ],
            };

          case 'apply_labels':
            await this.apiClient.applyLabels(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'resourceType'),
              this.getArg(args, 'resourceIds'),
              this.getArg(args, 'labelIds')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Labels applied successfully`,
                },
              ],
            };

          case 'get_labeled_resources':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getLabeledResources(
                      this.getArg(args, 'customerId'),
                      this.getArg(args, 'labelId')
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'bulk_edit_operations':
            await this.apiClient.bulkEditOperations(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'operations')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Bulk operations completed successfully`,
                },
              ],
            };

          case 'get_account_hierarchy':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.apiClient.getAccountHierarchy(this.getArg(args, 'customerId')),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'manage_link_invitations':
            await this.apiClient.manageLinkInvitations(
              this.getArg(args, 'customerId'),
              this.getArg(args, 'targetCustomerId'),
              this.getArg(args, 'action')
            );

            return {
              content: [
                {
                  type: 'text',
                  text: `Account link invitation ${this.getArg(args, 'action').toLowerCase()}ed successfully`,
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