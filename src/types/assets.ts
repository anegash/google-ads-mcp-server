/**
 * Asset Management Types
 */

export interface ImageAssetData {
  name: string;
  type: 'IMAGE' | 'MEDIA_BUNDLE' | 'YOUTUBE_VIDEO';
  image_data?: Buffer | string; // Base64 encoded image
  url?: string;
  mime_type?: 'IMAGE_JPEG' | 'IMAGE_GIF' | 'IMAGE_PNG';
  full_size_bytes?: number;
  display_name?: string;
}

export interface VideoAssetData {
  name: string;
  youtube_video_id?: string;
  video_url?: string;
  display_name?: string;
}

export interface AssetGroupData {
  campaign_id: string;
  name: string;
  final_urls: string[];
  final_mobile_urls?: string[];
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  path1?: string;
  path2?: string;
  headline_assets: Array<{
    text: string;
    pinned_field?: 'HEADLINE_1' | 'HEADLINE_2' | 'HEADLINE_3';
  }>;
  description_assets: Array<{
    text: string;
    pinned_field?: 'DESCRIPTION_1' | 'DESCRIPTION_2';
  }>;
  image_assets?: string[]; // Asset resource names
  logo_assets?: string[]; // Asset resource names
  video_assets?: string[]; // Asset resource names
}

export interface SitelinkAssetData {
  link_text: string;
  final_urls: string[];
  final_mobile_urls?: string[];
  description1?: string;
  description2?: string;
  start_date?: string;
  end_date?: string;
}

export interface CalloutAssetData {
  callout_text: string;
  start_date?: string;
  end_date?: string;
}

export interface StructuredSnippetAssetData {
  header: 'BRANDS' | 'COURSES' | 'DEGREE_PROGRAMS' | 'DESTINATIONS' | 'FEATURED_HOTELS' | 'INSURANCE_COVERAGE' | 'MODELS' | 'NEIGHBORHOODS' | 'SERVICE_CATALOG' | 'SHOWS' | 'STYLES' | 'TYPES';
  values: string[];
}

export interface AssetPerformanceData {
  asset_id: string;
  asset_type: string;
  performance_label: 'PENDING' | 'LEARNING' | 'LOW' | 'GOOD' | 'BEST';
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversion_value: number;
}