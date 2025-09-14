/**
 * Extensions & Recommendations Types
 */

export interface SitelinkExtension {
  link_text: string;
  final_urls: string[];
  final_mobile_urls?: string[];
  description1?: string;
  description2?: string;
  start_date?: string;
  end_date?: string;
}

export interface CallExtension {
  phone_number: string;
  country_code: string;
  call_conversion_action?: string;
  call_conversion_tracking_enabled?: boolean;
  call_conversion_reporting_state?: 'USE_ACCOUNT_LEVEL_CALL_CONVERSION_ACTION' | 'USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION' | 'DISABLED';
  start_date?: string;
  end_date?: string;
}

export interface CalloutExtension {
  callout_text: string;
  start_date?: string;
  end_date?: string;
}

export interface PromotionExtension {
  promotion_target: string;
  discount_modifier: 'UP_TO' | 'NONE';
  percent_off?: number;
  money_amount_off?: {
    amount_micros: number;
    currency_code: string;
  };
  promotion_code?: string;
  orders_over_amount?: {
    amount_micros: number;
    currency_code: string;
  };
  occasion?: 'NEW_YEARS' | 'VALENTINES_DAY' | 'EASTER' | 'MOTHERS_DAY' | 'FATHERS_DAY' | 'LABOR_DAY' | 'BACK_TO_SCHOOL' | 'HALLOWEEN' | 'BLACK_FRIDAY' | 'CYBER_MONDAY' | 'CHRISTMAS' | 'BOXING_DAY';
  start_date?: string;
  end_date?: string;
}

export interface PriceExtension {
  type: 'BRANDS' | 'EVENTS' | 'LOCATIONS' | 'NEIGHBORHOODS' | 'PRODUCT_CATEGORIES' | 'PRODUCT_TIERS' | 'SERVICES' | 'SERVICE_CATEGORIES' | 'SERVICE_TIERS';
  price_qualifier?: 'FROM' | 'UP_TO' | 'AVERAGE';
  price_offerings: Array<{
    header: string;
    description?: string;
    price: {
      amount_micros: number;
      currency_code: string;
    };
    unit?: 'PER_HOUR' | 'PER_DAY' | 'PER_WEEK' | 'PER_MONTH' | 'PER_YEAR' | 'PER_NIGHT';
    final_urls: string[];
    final_mobile_urls?: string[];
  }>;
}

export interface RecommendationData {
  resource_name: string;
  type: string;
  impact: {
    base_metrics?: {
      impressions?: number;
      clicks?: number;
      cost_micros?: number;
      conversions?: number;
      video_views?: number;
    };
    potential_metrics?: {
      impressions?: number;
      clicks?: number;
      cost_micros?: number;
      conversions?: number;
      video_views?: number;
    };
  };
  campaign?: string;
  ad_group?: string;
  dismissed?: boolean;
  campaign_budget_recommendation?: {
    current_budget_amount_micros?: number;
    recommended_budget_amount_micros?: number;
  };
  keyword_recommendation?: {
    keyword_text?: string;
    match_type?: string;
    cpc_bid_micros?: number;
  };
  text_ad_recommendation?: {
    headlines?: string[];
    descriptions?: string[];
  };
}

export interface KeywordIdeaData {
  text: string;
  avg_monthly_searches?: number;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH';
  competition_index?: number;
  low_top_of_page_bid_micros?: number;
  high_top_of_page_bid_micros?: number;
}