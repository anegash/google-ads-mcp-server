export interface GoogleAdsConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  developerToken?: string;
  loginCustomerId?: string;
  serviceAccountKeyPath?: string;
  serviceAccountKey?: any;
  oauthTokenPath?: string;
  useKeywordSandbox?: boolean;
}

export interface CustomerInfo {
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
  budget: number;
  targetCpa?: number;
  startDate?: string;
  endDate?: string;
}

export interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  cpcBidMicros?: number;
}

export interface Ad {
  id: string;
  adGroupId: string;
  type: string;
  finalUrls: string[];
  headlines?: string[];
  descriptions?: string[];
  status: string;
}

export interface Keyword {
  id: string;
  adGroupId: string;
  text: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  cpcBidMicros?: number;
  status: string;
}

export interface PerformanceMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  averageCpc: number;
  costMicros: number;
  conversions: number;
  conversionRate: number;
  conversionValue: number;
}

export interface AssetInfo {
  id: string;
  name: string;
  type: string;
  url?: string;
  text?: string;
  performanceLabel?: string;
}

export type OutputFormat = 'table' | 'json' | 'csv';

export interface GAQLQuery {
  query: string;
  customerId: string;
  outputFormat?: OutputFormat;
}

// Re-export all new types
export * from './types/conversions';
export * from './types/audiences';
export * from './types/reporting';
export * from './types/budgets';
export * from './types/assets';
export * from './types/campaigns';
export * from './types/targeting';
export * from './types/extensions';
export * from './types/management';