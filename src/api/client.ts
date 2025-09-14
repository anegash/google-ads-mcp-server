import axios, { AxiosInstance } from 'axios';
import { CredentialManager } from '../auth/credentials';
import {
  CustomerInfo,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  PerformanceMetrics,
  AssetInfo,
  GAQLQuery,
  OutputFormat,
  // Phase 1: Conversions
  ConversionActionData,
  OfflineConversionData,
  // Phase 2: Audiences
  CustomAudienceData,
  CustomerMatchListData,
  CustomerData,
  // Phase 3: Reporting
  ReportOptions,
  SearchTermReportOptions,
  DemographicReportOptions,
  GeographicReportOptions,
  ForecastInput,
  // Phase 4: Budgets
  SharedBudgetData,
  BiddingStrategyData,
  BidAdjustmentData,
  // Phase 5: Assets
  AssetGroupData,
  SitelinkAssetData,
  CalloutAssetData,
  StructuredSnippetAssetData,
  // Phase 6: Campaigns
  PerformanceMaxCampaignData,
  DemandGenCampaignData,
  AppCampaignData,
  SmartCampaignData,
  CampaignExperimentData,
  // Phase 7: Targeting
  LocationTarget,
  DemographicTarget,
  LocationBidAdjustment,
  // Phase 8: Extensions
  SitelinkExtension,
  CallExtension,
  CalloutExtension,
  // Phase 9: Management
  LabelData,
  BulkOperation
} from '../types';

export class GoogleAdsApiClient {
  private credentialManager: CredentialManager;
  private axiosInstance: AxiosInstance;
  private readonly apiVersion = 'v19';
  private readonly baseUrl = `https://googleads.googleapis.com/${this.apiVersion}`;

  constructor(credentialManager: CredentialManager) {
    this.credentialManager = credentialManager;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Add request interceptor to include auth headers
    this.axiosInstance.interceptors.request.use(async (config) => {
      const accessToken = await this.credentialManager.getAccessToken();
      const developerToken = this.credentialManager.getDeveloperToken();
      const loginCustomerId = this.credentialManager.getLoginCustomerId();

      config.headers!.Authorization = `Bearer ${accessToken}`;
      config.headers!['developer-token'] = developerToken;

      // Add login-customer-id header for manager account access
      if (loginCustomerId) {
        config.headers!['login-customer-id'] = loginCustomerId.replace(/-/g, '');
      }

      return config;
    });
  }

  // GAQL Query Execution
  async executeGAQLQuery(params: GAQLQuery): Promise<any> {
    const customerId = this.credentialManager.formatCustomerId(params.customerId).replace(/-/g, '');
    const loginCustomerId = this.credentialManager.getLoginCustomerId();

    // Always use login customer ID (manager account) for authentication
    // The customerId parameter specifies which account to query
    if (!loginCustomerId) {
      throw new Error('Login customer ID (manager account) must be configured to access accounts');
    }

    const response = await this.axiosInstance.post(
      `/customers/${customerId}/googleAds:searchStream`,
      {
        query: params.query,
      }
    );

    return this.formatQueryResponse(response.data, params.outputFormat || 'json');
  }

  private formatQueryResponse(data: any, format: OutputFormat): any {
    const results = data[0]?.results || [];

    switch (format) {
      case 'table':
        return this.formatAsTable(results);
      case 'csv':
        return this.formatAsCSV(results);
      case 'json':
      default:
        return results;
    }
  }

  private formatAsTable(results: any[]): string {
    if (results.length === 0) return 'No results found';

    const headers = Object.keys(this.flattenObject(results[0]));
    const rows = results.map(r => Object.values(this.flattenObject(r)));

    // Simple table formatting
    const table = [headers, ...rows];
    return table.map(row => row.join('\t')).join('\n');
  }

  private formatAsCSV(results: any[]): string {
    if (results.length === 0) return '';

    const headers = Object.keys(this.flattenObject(results[0]));
    const rows = results.map(r => Object.values(this.flattenObject(r)));

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ];

    return csvRows.join('\n');
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  // List accessible accounts
  async listAccounts(): Promise<CustomerInfo[]> {
    let response, customerIds;
    try {
      response = await this.axiosInstance.get('/customers:listAccessibleCustomers');
      customerIds = response.data.resourceNames || [];
    } catch (error: any) {
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        baseURL: error.config?.baseURL,
        headers: error.config?.headers ? {
          'developer-token': error.config.headers['developer-token'] ? '[PRESENT]' : '[MISSING]',
          'authorization': error.config.headers['Authorization'] ? '[PRESENT]' : '[MISSING]',
          'login-customer-id': error.config.headers['login-customer-id'] ? error.config.headers['login-customer-id'] : '[MISSING]',
        } : {},
      };

      // Throw a more detailed error that will be visible in MCP response
      throw new Error(`Google Ads API Error Details: ${JSON.stringify(errorDetails, null, 2)}`);
    }

    const customers: CustomerInfo[] = [];
    for (const resourceName of customerIds) {
      const customerId = resourceName.split('/').pop();
      try {
        const customerInfo = await this.getCustomerInfo(customerId);
        customers.push(customerInfo);
      } catch (error: any) {
        // If we can't access customer details, add basic info
        console.warn(`Cannot access details for customer ${customerId}: ${error.message}`);
        customers.push({
          id: customerId,
          descriptiveName: `Customer ${customerId}`,
          currencyCode: 'USD',
          timeZone: '',
          manager: false,
        });
      }
    }

    return customers;
  }

  async getCustomerInfo(customerId: string): Promise<CustomerInfo> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.manager
      FROM customer
      LIMIT 1
    `;

    const response = await this.executeGAQLQuery({
      query,
      customerId: formattedId,
    });

    const data = response[0]?.customer || {};

    return {
      id: data.id,
      descriptiveName: data.descriptiveName || '',
      currencyCode: data.currencyCode || 'USD',
      timeZone: data.timeZone || '',
      manager: data.manager || false,
    };
  }

  // Campaign operations
  async getCampaigns(customerId: string): Promise<Campaign[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign_budget.amount_micros,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
    `;

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      advertisingChannelType: row.campaign.advertisingChannelType,
      biddingStrategyType: row.campaign.biddingStrategyType,
      budget: row.campaignBudget?.amountMicros ? row.campaignBudget.amountMicros / 1000000 : 0,
      startDate: row.campaign.startDate,
      endDate: row.campaign.endDate,
    }));
  }

  async getCampaignPerformance(
    customerId: string,
    campaignId?: string,
    dateRange: string = 'LAST_30_DAYS'
  ): Promise<any> {
    let query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING ${dateRange}
    `;

    if (campaignId) {
      query += ` AND campaign.id = ${campaignId}`;
    }

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      metrics: {
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        ctr: row.metrics.ctr,
        averageCpc: row.metrics.averageCpc / 1000000,
        costMicros: row.metrics.costMicros,
        conversions: row.metrics.conversions,
        conversionRate: row.metrics.conversionsFromInteractionsRate,
        conversionValue: row.metrics.conversionsValue,
      } as PerformanceMetrics,
    }));
  }

  // Ad Group operations
  async getAdGroups(customerId: string, campaignId?: string): Promise<AdGroup[]> {
    let query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.campaign,
        ad_group.status,
        ad_group.cpc_bid_micros
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND ad_group.campaign = 'customers/${customerId}/campaigns/${campaignId}'`;
    }

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      id: row.adGroup.id,
      name: row.adGroup.name,
      campaignId: row.adGroup.campaign.split('/').pop(),
      status: row.adGroup.status,
      cpcBidMicros: row.adGroup.cpcBidMicros,
    }));
  }

  // Ad operations
  async getAds(customerId: string, adGroupId?: string): Promise<Ad[]> {
    let query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad_group,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group_ad.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'`;
    }

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      id: row.adGroupAd.ad.id,
      adGroupId: row.adGroupAd.adGroup.split('/').pop(),
      type: row.adGroupAd.ad.type,
      finalUrls: row.adGroupAd.ad.finalUrls || [],
      headlines: row.adGroupAd.ad.responsiveSearchAd?.headlines?.map((h: any) => h.text) || [],
      descriptions: row.adGroupAd.ad.responsiveSearchAd?.descriptions?.map((d: any) => d.text) || [],
      status: row.adGroupAd.status,
    }));
  }

  // Keyword operations
  async getKeywords(customerId: string, adGroupId?: string): Promise<Keyword[]> {
    let query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.ad_group,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.cpc_bid_micros,
        ad_group_criterion.status
      FROM ad_group_criterion
      WHERE ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group_criterion.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'`;
    }

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      id: row.adGroupCriterion.criterionId,
      adGroupId: row.adGroupCriterion.adGroup.split('/').pop(),
      text: row.adGroupCriterion.keyword.text,
      matchType: row.adGroupCriterion.keyword.matchType,
      cpcBidMicros: row.adGroupCriterion.cpcBidMicros,
      status: row.adGroupCriterion.status,
    }));
  }

  // Asset operations
  async getImageAssets(customerId: string): Promise<AssetInfo[]> {
    const query = `
      SELECT
        asset.id,
        asset.name,
        asset.type,
        asset.image_asset.full_size.url
      FROM asset
      WHERE asset.type = 'IMAGE'
      ORDER BY asset.name
    `;

    const response = await this.executeGAQLQuery({
      query,
      customerId,
    });

    return response.map((row: any) => ({
      id: row.asset.id,
      name: row.asset.name || '',
      type: row.asset.type,
      url: row.asset.imageAsset?.fullSize?.url || '',
    }));
  }

  // Mutation operations (Create, Update, Delete)
  async mutate(customerId: string, operations: any[]): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');
    const loginCustomerId = this.credentialManager.getLoginCustomerId();

    // Always use login customer ID (manager account) for authentication
    if (!loginCustomerId) {
      throw new Error('Login customer ID (manager account) must be configured to access accounts');
    }

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/googleAds:mutate`,
      {
        mutateOperations: operations,
      }
    );

    return response.data;
  }

  // Campaign mutations
  async createCampaign(customerId: string, campaign: Partial<Campaign>): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // First create a campaign budget
    const budgetOperations = [{
      campaignBudgetOperation: {
        create: {
          name: `${campaign.name} Budget`,
          amountMicros: (campaign.budget || 10) * 1000000,
          deliveryMethod: 'STANDARD',
        }
      }
    }];

    const budgetResponse = await this.mutate(formattedId, budgetOperations);
    const budgetResourceName = budgetResponse.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName;

    if (!budgetResourceName) {
      throw new Error('Failed to create campaign budget');
    }

    // Then create the campaign with the budget
    const campaignOperations = [{
      campaignOperation: {
        create: {
          name: campaign.name,
          status: 'PAUSED',
          advertisingChannelType: campaign.advertisingChannelType || 'SEARCH',
          campaignBudget: budgetResourceName,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        }
      }
    }];

    const campaignResponse = await this.mutate(formattedId, campaignOperations);
    const campaignResourceName = campaignResponse.mutateOperationResponses?.[0]?.campaignResult?.resourceName;

    if (!campaignResourceName) {
      throw new Error('Failed to create campaign');
    }

    return campaignResourceName.split('/').pop();
  }

  async updateCampaignStatus(customerId: string, campaignId: string, status: string): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      campaignOperation: {
        update: {
          resourceName: `customers/${formattedId}/campaigns/${campaignId}`,
          status,
        },
        updateMask: 'status',
      }
    }];

    const response = await this.mutate(formattedId, operations);

    if (!response.mutateOperationResponses?.[0]?.campaignResult) {
      throw new Error('Failed to update campaign status');
    }
  }

  // Ad Group mutations
  async createAdGroup(customerId: string, adGroup: Partial<AdGroup>): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      adGroupOperation: {
        create: {
          name: adGroup.name,
          campaign: `customers/${formattedId}/campaigns/${adGroup.campaignId}`,
          status: 'PAUSED',
          cpcBidMicros: adGroup.cpcBidMicros || 1000000,
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    const adGroupResourceName = response.mutateOperationResponses?.[0]?.adGroupResult?.resourceName;

    if (!adGroupResourceName) {
      throw new Error('Failed to create ad group');
    }

    return adGroupResourceName.split('/').pop();
  }

  // Ad mutations
  async createResponsiveSearchAd(
    customerId: string,
    adGroupId: string,
    headlines: string[],
    descriptions: string[],
    finalUrls: string[]
  ): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      adGroupAdOperation: {
        create: {
          adGroup: `customers/${formattedId}/adGroups/${adGroupId}`,
          status: 'PAUSED',
          ad: {
            responsiveSearchAd: {
              headlines: headlines.map(text => ({ text })),
              descriptions: descriptions.map(text => ({ text })),
            },
            finalUrls,
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    const adResourceName = response.mutateOperationResponses?.[0]?.adGroupAdResult?.resourceName;

    if (!adResourceName) {
      throw new Error('Failed to create responsive search ad');
    }

    return adResourceName.split('/').pop();
  }

  // Keyword mutations
  async addKeywords(customerId: string, adGroupId: string, keywords: Partial<Keyword>[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    if (!keywords || !Array.isArray(keywords)) {
      throw new Error('Keywords must be an array');
    }

    const operations = keywords.map(keyword => ({
      adGroupCriterionOperation: {
        create: {
          adGroup: `customers/${formattedId}/adGroups/${adGroupId}`,
          status: 'ENABLED',
          keyword: {
            text: keyword.text,
            matchType: keyword.matchType || 'BROAD',
          },
          cpcBidMicros: keyword.cpcBidMicros,
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);

    if (!response.mutateOperationResponses || !Array.isArray(response.mutateOperationResponses)) {
      throw new Error('Invalid API response structure');
    }

    return response.mutateOperationResponses
      .filter((r: any) => r.adGroupCriterionResult?.resourceName)
      .map((r: any) => r.adGroupCriterionResult.resourceName.split('/').pop());
  }

  async addNegativeKeywords(customerId: string, adGroupId: string, keywords: string[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    if (!keywords || !Array.isArray(keywords)) {
      throw new Error('Keywords must be an array');
    }

    const operations = keywords.map(text => ({
      adGroupCriterionOperation: {
        create: {
          adGroup: `customers/${formattedId}/adGroups/${adGroupId}`,
          negative: true,
          keyword: {
            text,
            matchType: 'BROAD',
          },
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);

    if (!response.mutateOperationResponses || !Array.isArray(response.mutateOperationResponses)) {
      throw new Error('Invalid API response structure');
    }

    return response.mutateOperationResponses
      .filter((r: any) => r.adGroupCriterionResult?.resourceName)
      .map((r: any) => r.adGroupCriterionResult.resourceName.split('/').pop());
  }

  // ==================== PHASE 1: CONVERSION TRACKING ====================

  async getConversions(customerId: string, dateRange: string = 'LAST_30_DAYS'): Promise<any> {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        conversion_action.counting_type,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.cost_per_conversion
      FROM conversion_action
      WHERE segments.date DURING ${dateRange}
        AND conversion_action.status != 'REMOVED'
      ORDER BY metrics.conversions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createConversionAction(customerId: string, conversionData: ConversionActionData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      conversionActionOperation: {
        create: {
          name: conversionData.name,
          category: conversionData.category,
          type: conversionData.type,
          status: conversionData.status || 'ENABLED',
          countingType: conversionData.counting_type || 'ONE_PER_CLICK',
          clickThroughLookbackWindowDays: conversionData.click_through_lookback_window_days || 30,
          viewThroughLookbackWindowDays: conversionData.view_through_lookback_window_days || 1,
          valueSettings: conversionData.value_settings
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.conversionActionResult?.resourceName || '';
  }

  async updateConversionAction(customerId: string, conversionId: string, updates: Partial<ConversionActionData>): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      conversionActionOperation: {
        update: {
          resourceName: `customers/${formattedId}/conversionActions/${conversionId}`,
          ...updates
        },
        updateMask: Object.keys(updates).join(',')
      }
    }];

    await this.mutate(formattedId, operations);
  }

  async getConversionAttribution(customerId: string, conversionId?: string): Promise<any> {
    let whereClause = `WHERE segments.date DURING LAST_30_DAYS`;
    if (conversionId) {
      whereClause += ` AND conversion_action.id = ${conversionId}`;
    }

    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        segments.conversion_lag_bucket,
        segments.ad_network_type,
        segments.device,
        metrics.conversions,
        metrics.conversions_value
      FROM conversion_action
      ${whereClause}
      ORDER BY metrics.conversions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async getConversionPathData(customerId: string, dateRange: string = 'LAST_30_DAYS'): Promise<any> {
    const query = `
      SELECT
        segments.conversion_lag_bucket,
        campaign.id,
        ad_group.id,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING ${dateRange}
        AND metrics.conversions > 0
      ORDER BY segments.date DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async importOfflineConversions(customerId: string, conversions: OfflineConversionData[]): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = conversions.map(conv => ({
      clickConversion: {
        gclid: conv.gclid,
        conversionDateTime: conv.conversion_date_time,
        conversionValue: conv.conversion_value,
        currencyCode: conv.currency_code || 'USD',
        orderId: conv.order_id
      }
    }));

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/conversions:uploadClickConversions`,
      { conversions: operations }
    );

    return response.data;
  }

  // ==================== PHASE 2: AUDIENCE MANAGEMENT ====================

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
        user_list.type
      FROM user_list
      WHERE user_list.membership_status = 'OPEN'
      ORDER BY user_list.name ASC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createCustomAudience(customerId: string, audienceData: CustomAudienceData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      userListOperation: {
        create: {
          name: audienceData.name,
          description: audienceData.description || '',
          membershipLifeSpan: audienceData.membership_life_span || 365
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.userListResult?.resourceName || '';
  }

  async addAudienceToCampaign(customerId: string, campaignId: string, audienceId: string): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      campaignCriterionOperation: {
        create: {
          campaign: `customers/${formattedId}/campaigns/${campaignId}`,
          userList: {
            userList: `customers/${formattedId}/userLists/${audienceId}`
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.campaignCriterionResult?.resourceName || '';
  }

  async removeAudienceFromCampaign(customerId: string, campaignId: string, audienceId: string): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      campaignCriterionOperation: {
        remove: `customers/${formattedId}/campaignCriteria/${campaignId}~${audienceId}`
      }
    }];

    await this.mutate(formattedId, operations);
  }

  async getAudienceInsights(customerId: string, audienceId?: string): Promise<any> {
    let whereClause = `WHERE segments.date DURING LAST_30_DAYS`;
    if (audienceId) {
      whereClause += ` AND user_list.id = ${audienceId}`;
    }

    const query = `
      SELECT
        user_list.name,
        user_list.id,
        user_list.size_for_display,
        user_list.size_for_search,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM user_list
      ${whereClause}
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createCustomerMatchList(customerId: string, listData: CustomerMatchListData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      userListOperation: {
        create: {
          name: listData.name,
          description: listData.description || '',
          membershipLifeSpan: listData.membership_life_span || 10000,
          crmBasedUserList: {
            uploadKeyType: listData.upload_key_type,
            dataSourceType: 'FIRST_PARTY'
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.userListResult?.resourceName || '';
  }

  async uploadCustomerMatchData(customerId: string, userListId: string, customerData: CustomerData[]): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = customerData.map(customer => ({
      userIdentifier: {
        hashedEmail: customer.hashed_email,
        hashedPhoneNumber: customer.hashed_phone_number,
        mobileId: customer.mobile_id,
        addressInfo: customer.address_info
      }
    }));

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/userDataOperations:uploadUserData`,
      {
        operations: [{
          create: {
            userList: `customers/${formattedId}/userLists/${userListId}`,
            userIdentifiers: operations
          }
        }]
      }
    );

    return response.data;
  }

  async createLookalikeAudience(customerId: string, seedAudienceId: string, name: string): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      userListOperation: {
        create: {
          name: name,
          lookalikeUserList: {
            seedUserListIds: [`customers/${formattedId}/userLists/${seedAudienceId}`]
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.userListResult?.resourceName || '';
  }

  // ==================== PHASE 3: ENHANCED REPORTING ====================

  async getSearchTermReport(customerId: string, options: SearchTermReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_30_DAYS', minImpressions = 0, campaignIds = [] } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;
    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }
    if (minImpressions > 0) {
      whereClause += ` AND metrics.impressions >= ${minImpressions}`;
    }

    const query = `
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        campaign.name,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      ${whereClause}
      ORDER BY metrics.impressions DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: options.outputFormat || 'json'
    });
  }

  async getDemographicReport(customerId: string, options: DemographicReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_30_DAYS', campaignIds = [] } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;
    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }

    const query = `
      SELECT
        campaign.name,
        ad_group.name,
        age_range_view.age_range,
        gender_view.gender,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM age_range_view
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

  async getGeographicReport(customerId: string, options: GeographicReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_30_DAYS', campaignIds = [] } = options;

    let whereClause = `WHERE segments.date DURING ${dateRange}`;
    if (campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`;
    }

    const query = `
      SELECT
        campaign.name,
        geographic_view.location_type,
        geographic_view.country_criterion_id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM geographic_view
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

  async getAuctionInsights(customerId: string, campaignId?: string): Promise<any> {
    let whereClause = `WHERE segments.date DURING LAST_30_DAYS`;
    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`;
    }

    const query = `
      SELECT
        campaign.name,
        auction_insight.domain,
        auction_insight.impression_share,
        auction_insight.overlap_rate,
        auction_insight.position_above_rate,
        auction_insight.top_of_page_rate
      FROM auction_insight
      ${whereClause}
      ORDER BY auction_insight.impression_share DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async getChangeHistory(customerId: string, dateRange: string = 'LAST_7_DAYS'): Promise<any> {
    const query = `
      SELECT
        change_status.change_date_time,
        change_status.resource_type,
        change_status.campaign,
        change_status.ad_group,
        change_status.resource_status
      FROM change_status
      WHERE segments.date DURING ${dateRange}
      ORDER BY change_status.change_date_time DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async generateForecastMetrics(customerId: string, forecastInput: ForecastInput): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // Simplified forecast using keyword planner
    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/keywordPlanIdeas:generateKeywordIdeas`,
      {
        keywordPlanNetwork: 'GOOGLE_SEARCH',
        keywordAndUrlSeed: {
          keywords: forecastInput.keywordTexts || []
        }
      }
    );

    return response.data;
  }

  async getClickViewReport(customerId: string, options: ReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_7_DAYS' } = options;

    const query = `
      SELECT
        click_view.gclid,
        click_view.campaign,
        click_view.ad_group,
        click_view.click_date_time,
        click_view.page_number,
        click_view.slot
      FROM click_view
      WHERE segments.date DURING ${dateRange}
      ORDER BY click_view.click_date_time DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async getVideoReport(customerId: string, options: ReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_30_DAYS' } = options;

    const query = `
      SELECT
        campaign.name,
        ad_group.name,
        metrics.video_views,
        metrics.video_view_rate,
        metrics.video_quartile_p25_rate,
        metrics.video_quartile_p50_rate,
        metrics.video_quartile_p75_rate,
        metrics.video_quartile_p100_rate
      FROM campaign
      WHERE segments.date DURING ${dateRange}
        AND campaign.advertising_channel_type = 'VIDEO'
      ORDER BY metrics.video_views DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  // ==================== PHASE 4: BUDGET & BIDDING ====================

  async getSharedBudgets(customerId: string): Promise<any> {
    const query = `
      SELECT
        campaign_budget.id,
        campaign_budget.name,
        campaign_budget.amount_micros,
        campaign_budget.status,
        campaign_budget.delivery_method,
        campaign_budget.reference_count
      FROM campaign_budget
      WHERE campaign_budget.explicitly_shared = true
      ORDER BY campaign_budget.name
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createSharedBudget(customerId: string, budgetData: SharedBudgetData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      campaignBudgetOperation: {
        create: {
          name: budgetData.name,
          amountMicros: budgetData.amount_micros,
          deliveryMethod: budgetData.delivery_method || 'STANDARD',
          explicitlyShared: true
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName || '';
  }

  async getBiddingStrategies(customerId: string): Promise<any> {
    const query = `
      SELECT
        bidding_strategy.id,
        bidding_strategy.name,
        bidding_strategy.type,
        bidding_strategy.status,
        bidding_strategy.campaign_count
      FROM bidding_strategy
      WHERE bidding_strategy.status != 'REMOVED'
      ORDER BY bidding_strategy.name
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createBiddingStrategy(customerId: string, strategyData: BiddingStrategyData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      biddingStrategyOperation: {
        create: {
          name: strategyData.name,
          status: strategyData.status || 'ENABLED',
          ...(strategyData.type === 'TARGET_CPA' && {
            targetCpa: strategyData.target_cpa
          }),
          ...(strategyData.type === 'TARGET_ROAS' && {
            targetRoas: strategyData.target_roas
          })
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.biddingStrategyResult?.resourceName || '';
  }

  async getBidSimulations(customerId: string, resourceId: string, resourceType: string): Promise<any> {
    const query = `
      SELECT
        bid_modifier_simulation.start_date,
        bid_modifier_simulation.end_date,
        bid_modifier_simulation.modification_method,
        bid_modifier_simulation.bid_modifier,
        bid_modifier_simulation.clicks,
        bid_modifier_simulation.impressions,
        bid_modifier_simulation.cost_micros
      FROM bid_modifier_simulation
      WHERE ${resourceType}.id = ${resourceId}
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async updateBidAdjustments(customerId: string, adjustments: BidAdjustmentData[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = adjustments.map(adj => ({
      campaignBidModifierOperation: {
        create: {
          campaign: `customers/${formattedId}/campaigns/${adj.resource_id}`,
          bidModifier: adj.bid_modifier,
          ...(adj.device && { device: { type: adj.device } })
        }
      }
    }));

    await this.mutate(formattedId, operations);
  }

  async getBudgetRecommendations(customerId: string, campaignId: string): Promise<any> {
    const query = `
      SELECT
        recommendation.campaign_budget_recommendation.current_budget_amount_micros,
        recommendation.campaign_budget_recommendation.recommended_budget_amount_micros,
        recommendation.impact.base_metrics.clicks,
        recommendation.impact.potential_metrics.clicks
      FROM recommendation
      WHERE recommendation.type = 'CAMPAIGN_BUDGET'
        AND campaign.id = ${campaignId}
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  // ==================== PHASE 5: ASSET MANAGEMENT ====================

  async uploadImageAsset(customerId: string, imageData: Buffer | string, name: string): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      assetOperation: {
        create: {
          name: name,
          type: 'IMAGE',
          imageAsset: {
            data: typeof imageData === 'string' ? imageData : imageData.toString('base64')
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.assetResult?.resourceName || '';
  }

  async getVideoAssets(customerId: string): Promise<any> {
    const query = `
      SELECT
        asset.id,
        asset.name,
        asset.type,
        asset.youtube_video_asset.youtube_video_id
      FROM asset
      WHERE asset.type = 'YOUTUBE_VIDEO'
      ORDER BY asset.name
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createAssetGroup(customerId: string, assetGroupData: AssetGroupData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      assetGroupOperation: {
        create: {
          campaign: `customers/${formattedId}/campaigns/${assetGroupData.campaign_id}`,
          name: assetGroupData.name,
          finalUrls: assetGroupData.final_urls,
          status: assetGroupData.status
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.assetGroupResult?.resourceName || '';
  }

  async getAssetPerformance(customerId: string, assetId?: string): Promise<any> {
    let whereClause = `WHERE segments.date DURING LAST_30_DAYS`;
    if (assetId) {
      whereClause += ` AND asset.id = ${assetId}`;
    }

    const query = `
      SELECT
        asset.id,
        asset.name,
        asset_group_asset.performance_label,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM asset_group_asset
      ${whereClause}
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createSitelinkAssets(customerId: string, sitelinks: SitelinkAssetData[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = sitelinks.map(sitelink => ({
      assetOperation: {
        create: {
          sitelinkAsset: {
            linkText: sitelink.link_text,
            finalUrls: sitelink.final_urls,
            description1: sitelink.description1,
            description2: sitelink.description2
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.assetResult?.resourceName) || [];
  }

  async createCalloutAssets(customerId: string, callouts: CalloutAssetData[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = callouts.map(callout => ({
      assetOperation: {
        create: {
          calloutAsset: {
            calloutText: callout.callout_text
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.assetResult?.resourceName) || [];
  }

  async createStructuredSnippetAssets(customerId: string, snippets: StructuredSnippetAssetData[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = snippets.map(snippet => ({
      assetOperation: {
        create: {
          structuredSnippetAsset: {
            header: snippet.header,
            values: snippet.values
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.assetResult?.resourceName) || [];
  }

  // ==================== PHASE 6: ADVANCED CAMPAIGNS ====================

  async createPerformanceMaxCampaign(customerId: string, campaignData: PerformanceMaxCampaignData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // Create budget first
    const budgetOp = [{
      campaignBudgetOperation: {
        create: {
          name: `${campaignData.name} Budget`,
          amountMicros: campaignData.budget_amount_micros,
          deliveryMethod: 'STANDARD'
        }
      }
    }];

    const budgetResponse = await this.mutate(formattedId, budgetOp);
    const budgetResourceName = budgetResponse.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName;

    // Create Performance Max campaign
    const campaignOp = [{
      campaignOperation: {
        create: {
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          advertisingChannelType: 'PERFORMANCE_MAX',
          campaignBudget: budgetResourceName,
          biddingStrategyType: campaignData.bidding_strategy_type || 'MAXIMIZE_CONVERSIONS'
        }
      }
    }];

    const response = await this.mutate(formattedId, campaignOp);
    return response.mutateOperationResponses?.[0]?.campaignResult?.resourceName || '';
  }

  async createDemandGenCampaign(customerId: string, campaignData: DemandGenCampaignData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // Create budget
    const budgetOp = [{
      campaignBudgetOperation: {
        create: {
          name: `${campaignData.name} Budget`,
          amountMicros: campaignData.budget_amount_micros
        }
      }
    }];

    const budgetResponse = await this.mutate(formattedId, budgetOp);
    const budgetResourceName = budgetResponse.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName;

    // Create Demand Gen campaign
    const campaignOp = [{
      campaignOperation: {
        create: {
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          advertisingChannelType: 'DEMAND_GEN',
          campaignBudget: budgetResourceName
        }
      }
    }];

    const response = await this.mutate(formattedId, campaignOp);
    return response.mutateOperationResponses?.[0]?.campaignResult?.resourceName || '';
  }

  async createAppCampaign(customerId: string, campaignData: AppCampaignData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // Create budget
    const budgetOp = [{
      campaignBudgetOperation: {
        create: {
          name: `${campaignData.name} Budget`,
          amountMicros: campaignData.budget_amount_micros
        }
      }
    }];

    const budgetResponse = await this.mutate(formattedId, budgetOp);
    const budgetResourceName = budgetResponse.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName;

    // Create App campaign
    const campaignOp = [{
      campaignOperation: {
        create: {
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          advertisingChannelType: 'MULTI_CHANNEL',
          advertisingChannelSubType: 'APP_CAMPAIGN',
          campaignBudget: budgetResourceName,
          appCampaignSetting: {
            appId: campaignData.app_id,
            appStore: campaignData.app_store
          }
        }
      }
    }];

    const response = await this.mutate(formattedId, campaignOp);
    return response.mutateOperationResponses?.[0]?.campaignResult?.resourceName || '';
  }

  async createSmartCampaign(customerId: string, campaignData: SmartCampaignData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    // Create budget
    const budgetOp = [{
      campaignBudgetOperation: {
        create: {
          name: `${campaignData.name} Budget`,
          amountMicros: campaignData.budget_amount_micros
        }
      }
    }];

    const budgetResponse = await this.mutate(formattedId, budgetOp);
    const budgetResourceName = budgetResponse.mutateOperationResponses?.[0]?.campaignBudgetResult?.resourceName;

    // Create Smart campaign
    const campaignOp = [{
      campaignOperation: {
        create: {
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          advertisingChannelType: 'SMART',
          campaignBudget: budgetResourceName
        }
      }
    }];

    const response = await this.mutate(formattedId, campaignOp);
    return response.mutateOperationResponses?.[0]?.campaignResult?.resourceName || '';
  }

  async getCampaignExperiments(customerId: string): Promise<any> {
    const query = `
      SELECT
        campaign_experiment.id,
        campaign_experiment.name,
        campaign_experiment.status,
        campaign_experiment.traffic_split_percent,
        campaign_experiment.base_campaign
      FROM campaign_experiment
      WHERE campaign_experiment.status != 'REMOVED'
      ORDER BY campaign_experiment.name
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async createCampaignExperiment(customerId: string, experimentData: CampaignExperimentData): Promise<string> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = [{
      campaignExperimentOperation: {
        create: {
          name: experimentData.name,
          baseCampaign: `customers/${formattedId}/campaigns/${experimentData.base_campaign_id}`,
          trafficSplitPercent: experimentData.traffic_split_percent,
          status: experimentData.status || 'ENABLED'
        }
      }
    }];

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.[0]?.campaignExperimentResult?.resourceName || '';
  }

  // ==================== PHASE 7: GEOGRAPHIC & DEMOGRAPHIC TARGETING ====================

  async getGeographicPerformance(customerId: string, options: GeographicReportOptions = {}): Promise<any> {
    const { dateRange = 'LAST_30_DAYS' } = options;

    const query = `
      SELECT
        geographic_view.location_type,
        geographic_view.country_criterion_id,
        geographic_view.region_criterion_id,
        geographic_view.city_criterion_id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM geographic_view
      WHERE segments.date DURING ${dateRange}
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async addLocationTargets(customerId: string, campaignId: string, locations: LocationTarget[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = locations.map(location => ({
      campaignCriterionOperation: {
        create: {
          campaign: `customers/${formattedId}/campaigns/${campaignId}`,
          location: {
            geoTargetConstant: `geoTargetConstants/${location.location_id}`
          },
          negative: location.negative || false,
          bidModifier: location.bid_modifier
        }
      }
    }));

    await this.mutate(formattedId, operations);
  }

  async addDemographicTargets(customerId: string, adGroupId: string, demographics: DemographicTarget[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = demographics.map(demo => ({
      adGroupCriterionOperation: {
        create: {
          adGroup: `customers/${formattedId}/adGroups/${adGroupId}`,
          ...(demo.age_range && { ageRange: { type: demo.age_range } }),
          ...(demo.gender && { gender: { type: demo.gender } }),
          negative: demo.negative || false,
          bidModifier: demo.bid_modifier
        }
      }
    }));

    await this.mutate(formattedId, operations);
  }

  async getLocationInsights(customerId: string, locationIds: string[]): Promise<any> {
    const query = `
      SELECT
        location_view.location_criterion_id,
        location_view.location_type,
        metrics.impressions,
        metrics.clicks
      FROM location_view
      WHERE location_view.location_criterion_id IN (${locationIds.join(',')})
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async setLocationBidAdjustments(customerId: string, adjustments: LocationBidAdjustment[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = adjustments.map(adj => ({
      campaignCriterionOperation: {
        update: {
          resourceName: `customers/${formattedId}/campaignCriteria/${adj.campaign_id}~${adj.location_id}`,
          bidModifier: adj.bid_modifier
        },
        updateMask: 'bid_modifier'
      }
    }));

    await this.mutate(formattedId, operations);
  }

  async manageLanguageTargets(customerId: string, campaignId: string, languageCodes: string[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = languageCodes.map(code => ({
      campaignCriterionOperation: {
        create: {
          campaign: `customers/${formattedId}/campaigns/${campaignId}`,
          language: {
            languageConstant: `languageConstants/${code}`
          }
        }
      }
    }));

    await this.mutate(formattedId, operations);
  }

  // ==================== PHASE 8: EXTENSIONS & RECOMMENDATIONS ====================

  async createSitelinkExtensions(customerId: string, sitelinks: SitelinkExtension[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = sitelinks.map(sitelink => ({
      extensionFeedItemOperation: {
        create: {
          sitelinkFeedItem: {
            linkText: sitelink.link_text,
            finalUrls: sitelink.final_urls,
            line1: sitelink.description1,
            line2: sitelink.description2
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.extensionFeedItemResult?.resourceName) || [];
  }

  async createCallExtensions(customerId: string, callExtensions: CallExtension[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = callExtensions.map(ext => ({
      extensionFeedItemOperation: {
        create: {
          callFeedItem: {
            phoneNumber: ext.phone_number,
            countryCode: ext.country_code,
            callConversionTrackingEnabled: ext.call_conversion_tracking_enabled
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.extensionFeedItemResult?.resourceName) || [];
  }

  async createCalloutExtensions(customerId: string, callouts: CalloutExtension[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = callouts.map(callout => ({
      extensionFeedItemOperation: {
        create: {
          calloutFeedItem: {
            calloutText: callout.callout_text
          }
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.extensionFeedItemResult?.resourceName) || [];
  }

  async getExtensionPerformance(customerId: string, extensionType?: string): Promise<any> {
    let whereClause = `WHERE segments.date DURING LAST_30_DAYS`;
    if (extensionType) {
      whereClause += ` AND extension_feed_item.extension_type = '${extensionType}'`;
    }

    const query = `
      SELECT
        extension_feed_item.id,
        extension_feed_item.extension_type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM extension_feed_item
      ${whereClause}
      ORDER BY metrics.impressions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async getRecommendations(customerId: string, types?: string[]): Promise<any> {
    let whereClause = '';
    if (types && types.length > 0) {
      whereClause = `WHERE recommendation.type IN ('${types.join("', '")}')`;
    }

    const query = `
      SELECT
        recommendation.resource_name,
        recommendation.type,
        recommendation.impact.base_metrics.impressions,
        recommendation.impact.potential_metrics.impressions,
        recommendation.campaign,
        recommendation.dismissed
      FROM recommendation
      ${whereClause}
      ORDER BY recommendation.impact.potential_metrics.impressions DESC
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async applyRecommendation(customerId: string, recommendationId: string): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/recommendations:apply`,
      {
        operations: [{
          resourceName: `customers/${formattedId}/recommendations/${recommendationId}`
        }]
      }
    );

    return response.data;
  }

  async dismissRecommendation(customerId: string, recommendationId: string): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/recommendations:dismiss`,
      {
        operations: [{
          resourceName: `customers/${formattedId}/recommendations/${recommendationId}`
        }]
      }
    );

    return response.data;
  }

  async getKeywordIdeas(customerId: string, keywordSeed: string[]): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const response = await this.axiosInstance.post(
      `/customers/${formattedId}/keywordPlanIdeas:generateKeywordIdeas`,
      {
        keywordPlanNetwork: 'GOOGLE_SEARCH',
        keywordSeed: {
          keywords: keywordSeed
        }
      }
    );

    return response.data;
  }

  // ==================== PHASE 9: ORGANIZATION & MANAGEMENT ====================

  async createLabels(customerId: string, labels: LabelData[]): Promise<string[]> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = labels.map(label => ({
      labelOperation: {
        create: {
          name: label.name,
          description: label.description,
          backgroundColor: label.background_color,
          status: label.status || 'ENABLED'
        }
      }
    }));

    const response = await this.mutate(formattedId, operations);
    return response.mutateOperationResponses?.map((r: any) => r.labelResult?.resourceName) || [];
  }

  async applyLabels(customerId: string, resourceType: string, resourceIds: string[], labelIds: string[]): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const operations = resourceIds.flatMap(resourceId =>
      labelIds.map(labelId => ({
        [`${resourceType}LabelOperation`]: {
          create: {
            [resourceType]: `customers/${formattedId}/${resourceType}s/${resourceId}`,
            label: `customers/${formattedId}/labels/${labelId}`
          }
        }
      }))
    );

    await this.mutate(formattedId, operations);
  }

  async getLabeledResources(customerId: string, labelId: string): Promise<any> {
    const query = `
      SELECT
        campaign_label.campaign,
        campaign_label.label
      FROM campaign_label
      WHERE campaign_label.label = 'customers/${customerId}/labels/${labelId}'
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async bulkEditOperations(customerId: string, operations: BulkOperation[]): Promise<any> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    const mutateOps = operations.flatMap(op => {
      const operationType = `${op.resource_type.toLowerCase()}Operation`;
      return op.operations.map(item => ({
        [operationType]: {
          [op.operation_type.toLowerCase()]: item.resource_data,
          ...(op.operation_type === 'UPDATE' && { updateMask: item.update_mask?.join(',') })
        }
      }));
    });

    return this.mutate(formattedId, mutateOps);
  }

  async getAccountHierarchy(customerId: string): Promise<any> {
    const query = `
      SELECT
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.currency_code,
        customer_client.time_zone
      FROM customer_client
    `;

    return this.executeGAQLQuery({ customerId, query, outputFormat: 'json' });
  }

  async manageLinkInvitations(customerId: string, targetCustomerId: string, action: 'LINK' | 'UNLINK'): Promise<void> {
    const formattedId = this.credentialManager.formatCustomerId(customerId).replace(/-/g, '');

    if (action === 'LINK') {
      const operations = [{
        customerManagerLinkOperation: {
          create: {
            clientCustomer: `customers/${targetCustomerId}`,
            status: 'PENDING'
          }
        }
      }];
      await this.mutate(formattedId, operations);
    } else {
      const operations = [{
        customerManagerLinkOperation: {
          remove: `customers/${formattedId}/customerManagerLinks/${targetCustomerId}~${formattedId}`
        }
      }];
      await this.mutate(formattedId, operations);
    }
  }

}