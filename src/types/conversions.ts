/**
 * Conversion Tracking & Attribution Types
 */

export interface ConversionActionData {
  name: string;
  category: 'DEFAULT' | 'PAGE_VIEW' | 'PURCHASE' | 'SIGNUP' | 'LEAD' | 'DOWNLOAD';
  type: 'WEBPAGE' | 'PHONE_CALL_FROM_ADS' | 'APP_INSTALLS' | 'IMPORT';
  status?: 'ENABLED' | 'REMOVED' | 'HIDDEN';
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