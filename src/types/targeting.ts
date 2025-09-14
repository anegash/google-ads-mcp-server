/**
 * Geographic & Demographic Targeting Types
 */

export interface LocationTarget {
  location_id: string;
  location_type: 'COUNTRY' | 'REGION' | 'CITY' | 'POSTAL_CODE' | 'DMA_REGION' | 'AIRPORT' | 'UNIVERSITY';
  target_type?: 'PRESENCE' | 'SEARCH_INTEREST' | 'PRESENCE_OR_INTEREST';
  bid_modifier?: number;
  negative?: boolean;
}

export interface DemographicTarget {
  age_range?: 'AGE_RANGE_18_24' | 'AGE_RANGE_25_34' | 'AGE_RANGE_35_44' | 'AGE_RANGE_45_54' | 'AGE_RANGE_55_64' | 'AGE_RANGE_65_UP' | 'AGE_RANGE_UNDETERMINED';
  gender?: 'MALE' | 'FEMALE' | 'UNDETERMINED';
  parental_status?: 'PARENT' | 'NOT_A_PARENT' | 'UNDETERMINED';
  household_income?: 'INCOME_RANGE_0_50' | 'INCOME_RANGE_50_60' | 'INCOME_RANGE_60_70' | 'INCOME_RANGE_70_80' | 'INCOME_RANGE_80_90' | 'INCOME_RANGE_90_UP' | 'INCOME_RANGE_UNDETERMINED';
  bid_modifier?: number;
  negative?: boolean;
}

export interface LanguageTarget {
  language_constant: string; // e.g., 'languageConstants/1000' for English
  language_name?: string;
  language_code?: string; // e.g., 'en'
}

export interface LocationBidAdjustment {
  campaign_id?: string;
  ad_group_id?: string;
  location_id: string;
  bid_modifier: number;
}

export interface GeographicPerformanceData {
  location_type: string;
  location_id: string;
  location_name: string;
  country?: string;
  region?: string;
  city?: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  average_cpc: number;
}

export interface LocationInsightData {
  location_id: string;
  location_name: string;
  reach: number;
  suggested_bid_micros?: number;
  parent_locations?: string[];
  location_type: string;
}