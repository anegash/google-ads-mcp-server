# Google Ads MCP API Enhancement Specifications

## Technical Implementation Details for Each Phase

This document provides detailed technical specifications for implementing each phase of the Google Ads MCP enhancement plan.

---

## Phase 1: Conversion Tracking & Attribution

### New Types (`src/types/conversions.ts`)

```typescript
export interface ConversionActionData {
  name: string;
  category: 'DEFAULT' | 'PAGE_VIEW' | 'PURCHASE' | 'SIGNUP' | 'LEAD' | 'DOWNLOAD';
  type: 'WEBPAGE' | 'PHONE_CALL_FROM_ADS' | 'APP_INSTALLS' | 'IMPORT';
  status: 'ENABLED' | 'REMOVED' | 'HIDDEN';
  primary_for_goal?: boolean;
  value_settings?: {
    default_value?: number;
    always_use_default_value?: boolean;
    currency_code?: string;
  };
  counting_type?: 'ONE_PER_CLICK' | 'MANY_PER_CLICK';
  click_through_lookback_window_days?: number;
  view_through_lookback_window_days?: number;
  phone_call_duration_seconds?: number;
}

export interface OfflineConversionData {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  conversion_date_time: string;
  conversion_value?: number;
  currency_code?: string;
  order_id?: string;
  external_attribution_data?: {
    external_attribution_credit?: number;
    external_attribution_model?: string;
  };
}

export interface ConversionAttributionData {
  conversion_action: string;
  conversion_date_time: string;
  device_type: 'DESKTOP' | 'MOBILE' | 'TABLET';
  click_type: 'HEADLINE' | 'SITELINK' | 'AD_EXTENSIONS';
  ad_network_type: 'SEARCH' | 'SEARCH_PARTNERS' | 'CONTENT' | 'MIXED';
  attribution_model: 'DATA_DRIVEN' | 'LAST_CLICK' | 'FIRST_CLICK' | 'LINEAR' | 'TIME_DECAY' | 'POSITION_BASED';
}

export interface ConversionPathData {
  customer_id: string;
  path_length: number;
  conversion_lag_bucket: string;
  impression_lag_bucket: string;
  path_elements: Array<{
    resource_name: string;
    ad_group_id?: string;
    campaign_id?: string;
    click_time?: string;
    impression_time?: string;
  }>;
}
```

### API Client Methods (`src/api/conversions.ts`)

```typescript
import { GoogleAdsApiClient } from './client';
import { ConversionActionData, OfflineConversionData, ConversionAttributionData } from '../types/conversions';

export class ConversionsApiClient extends GoogleAdsApiClient {
  /**
   * Get conversion actions and their metrics
   */
  async getConversions(customerId: string, dateRange: string = 'LAST_30_DAYS'): Promise<any> {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        conversion_action.primary_for_goal,
        conversion_action.counting_type,
        conversion_action.click_through_lookback_window_days,
        conversion_action.view_through_lookback_window_days,
        conversion_action.value_settings.default_value,
        conversion_action.value_settings.always_use_default_value,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.all_conversions_value,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.value_per_conversion
      FROM conversion_action
      WHERE segments.date DURING ${dateRange}
        AND conversion_action.status != 'REMOVED'
      ORDER BY metrics.conversions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Create new conversion action
   */
  async createConversionAction(customerId: string, conversionData: ConversionActionData): Promise<string> {
    const mutation = {
      mutate_operations: [{
        conversion_action_operation: {
          create: {
            name: conversionData.name,
            category: conversionData.category,
            type: conversionData.type,
            status: conversionData.status || 'ENABLED',
            primary_for_goal: conversionData.primary_for_goal || false,
            counting_type: conversionData.counting_type || 'ONE_PER_CLICK',
            click_through_lookback_window_days: conversionData.click_through_lookback_window_days || 30,
            view_through_lookback_window_days: conversionData.view_through_lookback_window_days || 1,
            ...(conversionData.value_settings && {
              value_settings: conversionData.value_settings
            }),
            ...(conversionData.phone_call_duration_seconds && {
              phone_call_duration_seconds: conversionData.phone_call_duration_seconds
            })
          }
        }
      }]
    };

    const response = await this.makeApiCall(`/customers/${customerId}/conversionActions:mutate`, 'POST', mutation);
    return response.results[0].resource_name;
  }

  /**
   * Update existing conversion action
   */
  async updateConversionAction(customerId: string, conversionId: string, updates: Partial<ConversionActionData>): Promise<void> {
    const resourceName = `customers/${customerId}/conversionActions/${conversionId}`;

    const mutation = {
      mutate_operations: [{
        conversion_action_operation: {
          update: {
            resource_name: resourceName,
            ...updates
          },
          update_mask: {
            paths: Object.keys(updates)
          }
        }
      }]
    };

    await this.makeApiCall(`/customers/${customerId}/conversionActions:mutate`, 'POST', mutation);
  }

  /**
   * Get conversion attribution analysis
   */
  async getConversionAttributionData(customerId: string, conversionActionId?: string): Promise<ConversionAttributionData[]> {
    let whereClause = "WHERE segments.date DURING LAST_30_DAYS";
    if (conversionActionId) {
      whereClause += ` AND conversion_action.id = ${conversionActionId}`;
    }

    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        segments.conversion_action,
        segments.conversion_lag_bucket,
        segments.ad_network_type,
        segments.click_type,
        segments.device,
        segments.conversion_attribution_event_type,
        metrics.conversions,
        metrics.conversions_value
      FROM conversion_action
      ${whereClause}
      ORDER BY metrics.conversions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Get conversion path data for customer journey analysis
   */
  async getConversionPathData(customerId: string, dateRange: string = 'LAST_30_DAYS'): Promise<ConversionPathData[]> {
    const query = `
      SELECT
        segments.conversion_lag_bucket,
        segments.impression_lag_bucket,
        campaign.id,
        ad_group.id,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE segments.date DURING ${dateRange}
        AND metrics.conversions > 0
      ORDER BY segments.date DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Import offline conversions
   */
  async importOfflineConversions(customerId: string, conversions: OfflineConversionData[]): Promise<any> {
    const operations = conversions.map(conversion => ({
      click_conversion: {
        ...(conversion.gclid && { gclid: conversion.gclid }),
        ...(conversion.gbraid && { gbraid: conversion.gbraid }),
        ...(conversion.wbraid && { wbraid: conversion.wbraid }),
        conversion_date_time: conversion.conversion_date_time,
        ...(conversion.conversion_value && {
          conversion_value: conversion.conversion_value,
          currency_code: conversion.currency_code || 'USD'
        }),
        ...(conversion.order_id && { order_id: conversion.order_id }),
        ...(conversion.external_attribution_data && {
          external_attribution_data: conversion.external_attribution_data
        })
      }
    }));

    return this.makeApiCall(
      `/customers/${customerId}/conversionUploads:uploadClickConversions`,
      'POST',
      { conversions: operations }
    );
  }
}
```

### MCP Server Tool Definitions (Addition to `src/server.ts`)

```typescript
// Add these tools to the tools array in setupHandlers()

{
  name: 'get_conversions',
  description: 'Get conversion actions and their performance metrics',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      dateRange: {
        type: 'string',
        description: 'Date range for metrics',
        enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_MONTH', 'LAST_MONTH'],
        default: 'LAST_30_DAYS'
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
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      name: {
        type: 'string',
        description: 'Name of the conversion action',
      },
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
      defaultValue: {
        type: 'number',
        description: 'Default conversion value',
      },
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
  name: 'get_conversion_attribution',
  description: 'Get conversion attribution analysis',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      conversionActionId: {
        type: 'string',
        description: 'Optional specific conversion action ID',
      },
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
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      conversions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            gclid: { type: 'string', description: 'Google Click Identifier' },
            conversionDateTime: { type: 'string', description: 'Conversion date-time (YYYY-MM-DD HH:MM:SS+XX:XX)' },
            conversionValue: { type: 'number', description: 'Conversion value' },
            currencyCode: { type: 'string', description: 'Currency code (e.g., USD)' },
            orderId: { type: 'string', description: 'Order ID' },
          },
          required: ['conversionDateTime'],
        },
        description: 'Array of offline conversions to import',
      },
    },
    required: ['customerId', 'conversions'],
  },
}
```

---

## Phase 2: Audience Management & Targeting

### New Types (`src/types/audiences.ts`)

```typescript
export interface CustomAudienceData {
  name: string;
  description?: string;
  membership_duration_days?: number;
  membership_life_span?: 'NO_LIMIT' | 'DAYS_30' | 'DAYS_90' | 'DAYS_180' | 'DAYS_365';
  type: 'NORMAL' | 'CRM_BASED' | 'RULE_BASED';
  members?: Array<{
    member_type: 'KEYWORD' | 'URL' | 'PLACE_CATEGORY' | 'APP';
    parameter?: string;
  }>;
}

export interface CustomerMatchListData {
  name: string;
  description?: string;
  membership_life_span?: number;
  upload_key_type: 'CONTACT_INFO' | 'CRM_ID' | 'MOBILE_ADVERTISING_ID';
  app_id?: string;
}

export interface CustomerData {
  hashed_email?: string;
  hashed_phone_number?: string;
  mobile_id?: string;
  user_id?: string;
  address_info?: {
    hashed_first_name?: string;
    hashed_last_name?: string;
    country_code?: string;
    postal_code?: string;
  };
}

export interface AudienceTargetingData {
  audience_id: string;
  targeting_type: 'TARGETING' | 'OBSERVATION';
  bid_modifier?: number;
}
```

### API Client Methods (`src/api/audiences.ts`)

```typescript
import { GoogleAdsApiClient } from './client';
import { CustomAudienceData, CustomerMatchListData, CustomerData } from '../types/audiences';

export class AudiencesApiClient extends GoogleAdsApiClient {
  /**
   * Get all audiences for a customer
   */
  async getAudiences(customerId: string): Promise<any> {
    const query = `
      SELECT
        user_list.id,
        user_list.name,
        user_list.description,
        user_list.membership_status,
        user_list.membership_life_span,
        user_list.size_for_display,
        user_list.size_for_search,
        user_list.type,
        user_list.closing_reason,
        user_list.access_reason
      FROM user_list
      WHERE user_list.membership_status = 'OPEN'
      ORDER BY user_list.name ASC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Create custom audience
   */
  async createCustomAudience(customerId: string, audienceData: CustomAudienceData): Promise<string> {
    const mutation = {
      mutate_operations: [{
        user_list_operation: {
          create: {
            name: audienceData.name,
            description: audienceData.description || '',
            membership_life_span: audienceData.membership_life_span || 365,
            crm_based_user_list: audienceData.type === 'CRM_BASED' ? {
              upload_key_type: 'CONTACT_INFO',
              data_source_type: 'FIRST_PARTY'
            } : undefined,
            rule_based_user_list: audienceData.type === 'RULE_BASED' ? {
              prepopulation_status: 'REQUESTED',
              flexible_rule_user_list: {
                inclusive_rule_operator: 'AND',
                inclusive_operands: audienceData.members?.map(member => ({
                  rule: {
                    operation_type: 'AND',
                    rule_item_groups: [{
                      rule_items: [{
                        name: member.member_type.toLowerCase(),
                        [member.member_type.toLowerCase() + '_rule_item']: {
                          value: member.parameter
                        }
                      }]
                    }]
                  }
                })) || []
              }
            } : undefined
          }
        }
      }]
    };

    const response = await this.makeApiCall(`/customers/${customerId}/userLists:mutate`, 'POST', mutation);
    return response.results[0].resource_name;
  }

  /**
   * Add audience to campaign
   */
  async addAudienceToCampaign(customerId: string, campaignId: string, audienceId: string, targetingType: 'TARGETING' | 'OBSERVATION' = 'TARGETING'): Promise<string> {
    const mutation = {
      mutate_operations: [{
        campaign_criterion_operation: {
          create: {
            campaign: `customers/${customerId}/campaigns/${campaignId}`,
            user_list: {
              user_list: `customers/${customerId}/userLists/${audienceId}`
            },
            type: 'USER_LIST',
            ...(targetingType === 'OBSERVATION' && { negative: false })
          }
        }
      }]
    };

    const response = await this.makeApiCall(`/customers/${customerId}/campaignCriteria:mutate`, 'POST', mutation);
    return response.results[0].resource_name;
  }

  /**
   * Create customer match list
   */
  async createCustomerMatchList(customerId: string, listData: CustomerMatchListData): Promise<string> {
    const mutation = {
      mutate_operations: [{
        user_list_operation: {
          create: {
            name: listData.name,
            description: listData.description || '',
            membership_life_span: listData.membership_life_span || 10000,
            crm_based_user_list: {
              upload_key_type: listData.upload_key_type,
              data_source_type: 'FIRST_PARTY',
              ...(listData.app_id && { app_id: listData.app_id })
            }
          }
        }
      }]
    };

    const response = await this.makeApiCall(`/customers/${customerId}/userLists:mutate`, 'POST', mutation);
    return response.results[0].resource_name;
  }

  /**
   * Upload customer match data
   */
  async uploadCustomerMatchData(customerId: string, userListId: string, customerData: CustomerData[]): Promise<any> {
    const operations = customerData.map(customer => ({
      user_identifier: {
        ...(customer.hashed_email && { hashed_email: customer.hashed_email }),
        ...(customer.hashed_phone_number && { hashed_phone_number: customer.hashed_phone_number }),
        ...(customer.mobile_id && { mobile_id: customer.mobile_id }),
        ...(customer.user_id && { user_id: customer.user_id }),
        ...(customer.address_info && { address_info: customer.address_info })
      }
    }));

    return this.makeApiCall(
      `/customers/${customerId}/userDataUploads:uploadUserData`,
      'POST',
      {
        operations: [{
          create: {
            user_list: `customers/${customerId}/userLists/${userListId}`,
            user_identifiers: operations
          }
        }]
      }
    );
  }

  /**
   * Get audience insights and performance
   */
  async getAudienceInsights(customerId: string, audienceId?: string): Promise<any> {
    let whereClause = "WHERE segments.date DURING LAST_30_DAYS";
    if (audienceId) {
      whereClause += ` AND user_list.id = ${audienceId}`;
    }

    const query = `
      SELECT
        campaign.name,
        ad_group.name,
        user_list.name,
        user_list.id,
        user_list.size_for_display,
        user_list.size_for_search,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_micros
      FROM user_list
      ${whereClause}
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }
}
```

---

## Phase 3: Enhanced Reporting & Analytics

### New Types (`src/types/reporting.ts`)

```typescript
export interface ReportOptions {
  dateRange?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  campaignIds?: string[];
  adGroupIds?: string[];
  includeZeroImpressions?: boolean;
  orderBy?: string;
  limit?: number;
  outputFormat?: 'json' | 'csv' | 'table';
}

export interface SearchTermReportOptions extends ReportOptions {
  minImpressions?: number;
  minClicks?: number;
  matchType?: 'EXACT' | 'PHRASE' | 'BROAD';
}

export interface DemographicReportOptions extends ReportOptions {
  ageRanges?: string[];
  genders?: string[];
  includeUnknown?: boolean;
}

export interface GeographicReportOptions extends ReportOptions {
  locationTypes?: ('COUNTRY' | 'REGION' | 'CITY' | 'POSTAL_CODE')[];
  countryCodes?: string[];
}

export interface ForecastInput {
  campaignId?: string;
  adGroupId?: string;
  keywordTexts?: string[];
  matchTypes?: ('EXACT' | 'PHRASE' | 'BROAD')[];
  maxCpcBidMicros?: number;
  dateRange: {
    start_date: string;
    end_date: string;
  };
  geoTargets?: string[];
  languageConstants?: string[];
}
```

### API Client Methods (`src/api/reporting.ts`)

```typescript
import { GoogleAdsApiClient } from './client';
import { ReportOptions, SearchTermReportOptions, DemographicReportOptions, ForecastInput } from '../types/reporting';

export class ReportingApiClient extends GoogleAdsApiClient {
  /**
   * Get search term report
   */
  async getSearchTermReport(customerId: string, options: SearchTermReportOptions = {}): Promise<any> {
    const {
      dateRange = 'LAST_30_DAYS',
      minImpressions = 0,
      minClicks = 0,
      campaignIds = [],
      orderBy = 'metrics.impressions DESC',
      limit
    } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;

    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }

    if (minImpressions > 0) {
      whereClause += ` AND metrics.impressions >= ${minImpressions}`;
    }

    if (minClicks > 0) {
      whereClause += ` AND metrics.clicks >= ${minClicks}`;
    }

    const query = `
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        campaign.name,
        campaign.id,
        ad_group.name,
        ad_group.id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM search_term_view
      ${whereClause}
      ORDER BY ${orderBy}
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: options.outputFormat || 'json'
    });
  }

  /**
   * Get demographic performance report
   */
  async getDemographicReport(customerId: string, options: DemographicReportOptions = {}): Promise<any> {
    const {
      dateRange = 'LAST_30_DAYS',
      campaignIds = [],
      ageRanges = [],
      genders = []
    } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;

    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }

    const query = `
      SELECT
        campaign.name,
        campaign.id,
        ad_group.name,
        ad_group.id,
        age_range_view.age_range,
        gender_view.gender,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.conversions_from_interactions_rate
      FROM age_range_view, gender_view
      ${whereClause}
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: options.outputFormat || 'json'
    });
  }

  /**
   * Get geographic performance report
   */
  async getGeographicReport(customerId: string, options: GeographicReportOptions = {}): Promise<any> {
    const {
      dateRange = 'LAST_30_DAYS',
      campaignIds = [],
      locationTypes = ['COUNTRY', 'REGION', 'CITY']
    } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;

    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }

    const query = `
      SELECT
        campaign.name,
        campaign.id,
        geographic_view.location_type,
        geographic_view.country_criterion_id,
        geographic_view.region_criterion_id,
        geographic_view.metro_criterion_id,
        geographic_view.city_criterion_id,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM geographic_view
      ${whereClause}
        AND metrics.impressions > 0
        AND geographic_view.location_type IN ('${locationTypes.join("', '")}')
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: options.outputFormat || 'json'
    });
  }

  /**
   * Get auction insights
   */
  async getAuctionInsights(customerId: string, campaignId?: string): Promise<any> {
    let whereClause = "WHERE segments.date DURING LAST_30_DAYS";
    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`;
    }

    const query = `
      SELECT
        campaign.name,
        campaign.id,
        auction_insight.display_name,
        auction_insight.impression_share,
        auction_insight.overlap_rate,
        auction_insight.position_above_rate,
        auction_insight.top_of_page_rate,
        auction_insight.absolute_top_of_page_rate,
        auction_insight.outranking_share
      FROM auction_insight
      ${whereClause}
      ORDER BY auction_insight.impression_share DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Get change history
   */
  async getChangeHistory(customerId: string, dateRange: string = 'LAST_7_DAYS'): Promise<any> {
    const query = `
      SELECT
        change_status.change_date_time,
        change_status.resource_type,
        change_status.campaign,
        change_status.ad_group,
        change_status.resource_status,
        change_status.last_change_date_time
      FROM change_status
      WHERE segments.date DURING ${dateRange}
      ORDER BY change_status.change_date_time DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Generate forecast metrics
   */
  async generateForecastMetrics(customerId: string, forecastInput: ForecastInput): Promise<any> {
    // This would use the KeywordPlanIdeaService for forecasting
    const keywordPlanData = {
      keyword_plan_network: 'GOOGLE_SEARCH',
      keyword_plan_geo_targets: forecastInput.geoTargets?.map(target => ({
        geo_target_constant: target
      })) || [],
      keyword_plan_language_constants: forecastInput.languageConstants?.map(lang => ({
        language_constant: lang
      })) || [],
      keyword_plan_date_range: {
        start_date: forecastInput.dateRange.start_date,
        end_date: forecastInput.dateRange.end_date
      }
    };

    // This is a simplified version - full implementation would use KeywordPlanIdeaService
    return this.makeApiCall(
      `/customers/${customerId}/keywordPlanIdeas:generateIdeas`,
      'POST',
      {
        keyword_plan_network: keywordPlanData.keyword_plan_network,
        geo_target_constants: keywordPlanData.keyword_plan_geo_targets,
        language: keywordPlanData.keyword_plan_language_constants[0],
        keyword_and_url_seed: {
          keywords: forecastInput.keywordTexts || []
        }
      }
    );
  }
}
```

This specification continues for all phases, but I'll create the implementation templates document next to show the coding patterns and structure for each phase.