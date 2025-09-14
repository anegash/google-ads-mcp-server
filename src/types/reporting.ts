/**
 * Enhanced Reporting & Analytics Types
 */

export interface ReportOptions {
  dateRange?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';
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

export interface AuctionInsightData {
  display_name: string;
  domain: string;
  impression_share: number;
  overlap_rate: number;
  position_above_rate: number;
  top_of_page_rate: number;
  absolute_top_of_page_rate: number;
  outranking_share: number;
}

export interface ChangeHistoryData {
  change_date_time: string;
  resource_type: string;
  resource_id: string;
  campaign?: string;
  ad_group?: string;
  resource_status: string;
  field_changes: Array<{
    field_name: string;
    old_value: string;
    new_value: string;
  }>;
}