/**
 * Organization & Management Tools Types
 */

export interface LabelData {
  name: string;
  description?: string;
  background_color?: string; // Hex color code
  text_color?: string; // Hex color code
  status?: 'ENABLED' | 'REMOVED';
}

export interface LabelAssignment {
  label_id: string;
  resource_type: 'CAMPAIGN' | 'AD_GROUP' | 'AD_GROUP_AD' | 'AD_GROUP_CRITERION' | 'CUSTOMER';
  resource_ids: string[];
}

export interface BulkOperation {
  operation_type: 'CREATE' | 'UPDATE' | 'REMOVE';
  resource_type: 'CAMPAIGN' | 'AD_GROUP' | 'AD' | 'KEYWORD' | 'NEGATIVE_KEYWORD' | 'BUDGET' | 'BID';
  operations: Array<{
    resource_id?: string;
    resource_data: any;
    update_mask?: string[];
  }>;
}

export interface AccountHierarchyNode {
  customer_id: string;
  customer_name: string;
  manager?: boolean;
  can_manage_clients?: boolean;
  currency_code?: string;
  time_zone?: string;
  test_account?: boolean;
  children?: AccountHierarchyNode[];
}

export interface LinkInvitation {
  customer_id: string;
  invitation_type: 'LINK_INVITATION' | 'UNLINK_INVITATION';
  invitation_status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  creation_date_time?: string;
}

export interface ChangeEventData {
  change_date_time: string;
  user_email: string;
  change_resource_type: string;
  change_resource_id: string;
  change_operation: 'CREATE' | 'UPDATE' | 'REMOVE';
  changed_fields: Array<{
    field_name: string;
    old_value?: string;
    new_value?: string;
  }>;
  campaign?: string;
  ad_group?: string;
}

export interface UserAccessData {
  user_email: string;
  access_role: 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY';
  access_creation_date_time?: string;
  inviter_user_email?: string;
}