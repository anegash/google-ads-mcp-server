/**
 * Budget & Bidding Management Types
 */

export interface SharedBudgetData {
  name: string;
  amount_micros: number;
  delivery_method?: 'STANDARD' | 'ACCELERATED';
  explicitly_shared?: boolean;
  reference_count?: number;
  has_recommended_budget?: boolean;
  recommended_budget_amount_micros?: number;
  period?: 'DAILY' | 'CUSTOM_PERIOD';
  total_amount_micros?: number;
}

export interface BiddingStrategyData {
  name: string;
  type: 'TARGET_CPA' | 'TARGET_ROAS' | 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CONVERSION_VALUE' | 'TARGET_IMPRESSION_SHARE' | 'MANUAL_CPC' | 'MANUAL_CPM' | 'MAXIMIZE_CLICKS';
  status?: 'ENABLED' | 'REMOVED';
  target_cpa?: {
    target_cpa_micros?: number;
    cpc_bid_ceiling_micros?: number;
    cpc_bid_floor_micros?: number;
  };
  target_roas?: {
    target_roas?: number;
    cpc_bid_ceiling_micros?: number;
    cpc_bid_floor_micros?: number;
  };
  maximize_conversions?: {
    target_cpa_micros?: number;
  };
  maximize_conversion_value?: {
    target_roas?: number;
  };
  target_impression_share?: {
    location: 'ANYWHERE_ON_PAGE' | 'TOP_OF_PAGE' | 'ABSOLUTE_TOP_OF_PAGE';
    cpc_bid_ceiling_micros?: number;
    location_fraction_micros?: number;
  };
}

export interface BidAdjustmentData {
  resource_type: 'CAMPAIGN' | 'AD_GROUP';
  resource_id: string;
  device?: 'MOBILE' | 'DESKTOP' | 'TABLET';
  location?: string;
  schedule?: {
    day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
    start_hour: number;
    end_hour: number;
  };
  bid_modifier: number;
}

export interface BidSimulationData {
  resource_type: 'CAMPAIGN' | 'AD_GROUP' | 'AD_GROUP_CRITERION';
  resource_id: string;
  modification_method: 'UNIFORM' | 'DEFAULT' | 'SCALING';
  start_date: string;
  end_date: string;
  simulation_points: Array<{
    bid_modifier?: number;
    cpc_bid_micros?: number;
    target_cpa_micros?: number;
    target_roas?: number;
    clicks?: number;
    impressions?: number;
    cost_micros?: number;
    conversions?: number;
    conversion_value?: number;
  }>;
}