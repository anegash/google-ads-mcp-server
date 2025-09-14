/**
 * Audience Management & Targeting Types
 */

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

export interface LookalikeAudienceData {
  seed_audience_id: string;
  name: string;
  description?: string;
  country_codes?: string[];
  similarity_level?: 'HIGH' | 'MEDIUM' | 'LOW';
}