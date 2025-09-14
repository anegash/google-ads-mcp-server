/**
 * Advanced Campaign Types
 */

export interface PerformanceMaxCampaignData {
  name: string;
  budget_amount_micros: number;
  bidding_strategy_type?: 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CONVERSION_VALUE' | 'TARGET_CPA' | 'TARGET_ROAS';
  target_cpa_micros?: number;
  target_roas?: number;
  status?: 'ENABLED' | 'PAUSED';
  campaign_goal?: 'SALES' | 'LEAD_GENERATION' | 'WEBSITE_TRAFFIC' | 'LOCAL_STORE_VISITS_AND_PROMOTIONS';
  final_url_suffix?: string;
  tracking_url_template?: string;
}

export interface DemandGenCampaignData {
  name: string;
  budget_amount_micros: number;
  bidding_strategy_type?: 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CLICKS' | 'TARGET_CPA';
  target_cpa_micros?: number;
  status?: 'ENABLED' | 'PAUSED';
  target_audience?: 'DISCOVERY' | 'YOUTUBE_IN_FEED' | 'GMAIL';
}

export interface AppCampaignData {
  name: string;
  app_id: string;
  app_store: 'GOOGLE_APP_STORE' | 'APPLE_APP_STORE';
  budget_amount_micros: number;
  bidding_strategy_type?: 'TARGET_CPA' | 'TARGET_CPA_INSTALL' | 'MAXIMIZE_CONVERSIONS';
  target_cpa_micros?: number;
  status?: 'ENABLED' | 'PAUSED';
  start_date?: string;
  end_date?: string;
}

export interface SmartCampaignData {
  name: string;
  budget_amount_micros: number;
  business_name: string;
  business_location_id?: string;
  phone_number?: string;
  final_url?: string;
  advertising_locale?: string;
  keyword_themes?: Array<{
    keyword_theme_constant?: string;
    free_form_keyword_theme?: string;
  }>;
  geo_targets?: string[];
  status?: 'ENABLED' | 'PAUSED';
}

export interface CampaignExperimentData {
  name: string;
  base_campaign_id: string;
  traffic_split_percent: number;
  start_date: string;
  end_date?: string;
  experiment_type?: 'SEARCH_CUSTOM' | 'DISPLAY_CUSTOM' | 'VIDEO_CUSTOM';
  status?: 'ENABLED' | 'REMOVED';
  goals?: Array<{
    metric: 'CLICKS' | 'IMPRESSIONS' | 'COST' | 'CONVERSIONS' | 'CONVERSION_VALUE';
    direction: 'INCREASE' | 'DECREASE' | 'NO_CHANGE';
  }>;
}