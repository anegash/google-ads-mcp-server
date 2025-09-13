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
  OutputFormat
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
}