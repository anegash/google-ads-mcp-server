# Implementation Phase Templates

This document provides step-by-step templates for implementing each phase of the Google Ads MCP enhancement plan.

---

## Phase Implementation Template

### General Structure for Each Phase

```
1. Create Type Definitions
2. Create API Client Methods
3. Add MCP Tool Definitions
4. Add Tool Handler Cases
5. Update Exports
6. Add Tests
7. Update Documentation
```

---

## Phase 1 Implementation Template: Conversion Tracking

### Step 1: Create Type Definitions

**File: `src/types/conversions.ts`**

```typescript
// Copy the ConversionActionData, OfflineConversionData interfaces from API_ENHANCEMENT_SPECS.md
export interface ConversionActionData {
  // ... (see API_ENHANCEMENT_SPECS.md for full definition)
}

export interface OfflineConversionData {
  // ... (see API_ENHANCEMENT_SPECS.md for full definition)
}

// Re-export in src/types/index.ts
export * from './conversions';
```

### Step 2: Extend API Client

**File: `src/api/client.ts` - Add these methods to the existing GoogleAdsApiClient class:**

```typescript
// Add to existing GoogleAdsApiClient class
import { ConversionActionData, OfflineConversionData } from '../types/conversions';

export class GoogleAdsApiClient {
  // ... existing methods ...

  /**
   * Get conversion actions and their metrics
   */
  async getConversions(customerId: string, dateRange: string = 'LAST_30_DAYS'): Promise<any> {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.cost_per_conversion,
        metrics.value_per_conversion
      FROM conversion_action
      WHERE segments.date DURING ${dateRange}
        AND conversion_action.status != 'REMOVED'
      ORDER BY metrics.conversions DESC
    `;

    return this.executeGAQLQuery({
      customerId,
      query,
      outputFormat: 'json'
    });
  }

  /**
   * Create new conversion action
   */
  async createConversionAction(customerId: string, conversionData: ConversionActionData): Promise<string> {
    const mutation = {
      mutate_operations: [{
        conversion_action_operation: {
          create: {
            name: conversionData.name,
            category: conversionData.category,
            type: conversionData.type,
            status: conversionData.status || 'ENABLED',
            counting_type: conversionData.counting_type || 'ONE_PER_CLICK',
            click_through_lookback_window_days: conversionData.click_through_lookback_window_days || 30,
            view_through_lookback_window_days: conversionData.view_through_lookback_window_days || 1,
            ...(conversionData.value_settings && {
              value_settings: conversionData.value_settings
            })
          }
        }
      }]
    };

    const response = await this.makeApiCall(`/customers/${customerId}/conversionActions:mutate`, 'POST', mutation);
    return response.results[0].resource_name;
  }

  /**
   * Import offline conversions
   */
  async importOfflineConversions(customerId: string, conversions: OfflineConversionData[]): Promise<any> {
    const operations = conversions.map(conversion => ({
      click_conversion: {
        ...(conversion.gclid && { gclid: conversion.gclid }),
        conversion_date_time: conversion.conversion_date_time,
        ...(conversion.conversion_value && {
          conversion_value: conversion.conversion_value,
          currency_code: conversion.currency_code || 'USD'
        }),
        ...(conversion.order_id && { order_id: conversion.order_id })
      }
    }));

    return this.makeApiCall(
      `/customers/${customerId}/conversionUploads:uploadClickConversions`,
      'POST',
      { conversions: operations }
    );
  }

  // Add other conversion methods here...
}
```

### Step 3: Add MCP Tool Definitions

**File: `src/server.ts` - Add to the tools array in setupHandlers():**

```typescript
// Add these tools to the existing tools array around line 366

{
  name: 'get_conversions',
  description: 'Get conversion actions and their performance metrics',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      dateRange: {
        type: 'string',
        description: 'Date range for metrics',
        enum: ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'THIS_MONTH', 'LAST_MONTH'],
        default: 'LAST_30_DAYS'
      },
    },
    required: ['customerId'],
  },
},
{
  name: 'create_conversion_action',
  description: 'Create a new conversion action for tracking',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      name: {
        type: 'string',
        description: 'Name of the conversion action',
      },
      category: {
        type: 'string',
        enum: ['DEFAULT', 'PAGE_VIEW', 'PURCHASE', 'SIGNUP', 'LEAD', 'DOWNLOAD'],
        description: 'Conversion category',
      },
      type: {
        type: 'string',
        enum: ['WEBPAGE', 'PHONE_CALL_FROM_ADS', 'APP_INSTALLS', 'IMPORT'],
        description: 'Conversion type',
      },
      defaultValue: {
        type: 'number',
        description: 'Default conversion value',
      },
      countingType: {
        type: 'string',
        enum: ['ONE_PER_CLICK', 'MANY_PER_CLICK'],
        description: 'How to count conversions',
      },
    },
    required: ['customerId', 'name', 'category', 'type'],
  },
},
{
  name: 'import_offline_conversions',
  description: 'Upload offline conversion data',
  inputSchema: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Google Ads customer ID',
      },
      conversions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            gclid: { type: 'string', description: 'Google Click Identifier' },
            conversionDateTime: { type: 'string', description: 'Conversion date-time (YYYY-MM-DD HH:MM:SS+XX:XX)' },
            conversionValue: { type: 'number', description: 'Conversion value' },
            currencyCode: { type: 'string', description: 'Currency code (e.g., USD)' },
            orderId: { type: 'string', description: 'Order ID' },
          },
          required: ['conversionDateTime'],
        },
        description: 'Array of offline conversions to import',
      },
    },
    required: ['customerId', 'conversions'],
  },
},
// Add other conversion tools here...
```

### Step 4: Add Tool Handler Cases

**File: `src/server.ts` - Add to the switch statement in CallToolRequestSchema handler around line 750:**

```typescript
// Add these cases to the existing switch statement

case 'get_conversions':
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          await this.apiClient.getConversions(
            this.getArg(args, 'customerId'),
            this.getArg(args, 'dateRange') || 'LAST_30_DAYS'
          ),
          null,
          2
        ),
      },
    ],
  };

case 'create_conversion_action':
  const conversionId = await this.apiClient.createConversionAction(
    this.getArg(args, 'customerId'),
    {
      name: this.getArg(args, 'name'),
      category: this.getArg(args, 'category'),
      type: this.getArg(args, 'type'),
      counting_type: this.getArg(args, 'countingType') || 'ONE_PER_CLICK',
      value_settings: this.getArg(args, 'defaultValue') ? {
        default_value: this.getArg(args, 'defaultValue'),
        always_use_default_value: true
      } : undefined
    }
  );

  return {
    content: [
      {
        type: 'text',
        text: `Conversion action created successfully. Resource name: ${conversionId}`,
      },
    ],
  };

case 'import_offline_conversions':
  const conversions = this.getArg(args, 'conversions').map((conv: any) => ({
    gclid: conv.gclid,
    conversion_date_time: conv.conversionDateTime,
    conversion_value: conv.conversionValue,
    currency_code: conv.currencyCode || 'USD',
    order_id: conv.orderId
  }));

  const importResult = await this.apiClient.importOfflineConversions(
    this.getArg(args, 'customerId'),
    conversions
  );

  return {
    content: [
      {
        type: 'text',
        text: `Imported ${conversions.length} offline conversions. Partial failures: ${importResult.partial_failure_error || 'none'}`,
      },
    ],
  };

// Add other conversion tool cases here...
```

### Step 5: Add Tests (Optional but Recommended)

**File: `src/__tests__/conversions.test.ts`**

```typescript
import { GoogleAdsApiClient } from '../api/client';
import { ConversionActionData } from '../types/conversions';

describe('Conversions API', () => {
  let client: GoogleAdsApiClient;

  beforeEach(() => {
    // Mock setup
    client = new GoogleAdsApiClient({} as any);
  });

  it('should get conversions', async () => {
    // Test implementation
  });

  it('should create conversion action', async () => {
    // Test implementation
  });
});
```

---

## Quick Implementation Checklist for Each Phase

### Phase 1: Conversions ✅
- [ ] Create `src/types/conversions.ts`
- [ ] Add conversion methods to `src/api/client.ts`
- [ ] Add 6 tools to `src/server.ts` tools array
- [ ] Add 6 case handlers to switch statement
- [ ] Update `src/types/index.ts` exports
- [ ] Test with sample customer account
- [ ] Update documentation

### Phase 2: Audiences
- [ ] Create `src/types/audiences.ts`
- [ ] Add audience methods to `src/api/client.ts`
- [ ] Add 8 tools to `src/server.ts` tools array
- [ ] Add 8 case handlers to switch statement
- [ ] Update exports
- [ ] Test audience creation and targeting
- [ ] Update documentation

### Phase 3: Enhanced Reporting
- [ ] Create `src/types/reporting.ts`
- [ ] Add reporting methods to `src/api/client.ts`
- [ ] Add 8 tools to `src/server.ts` tools array
- [ ] Add 8 case handlers to switch statement
- [ ] Update exports
- [ ] Test complex GAQL queries
- [ ] Update documentation

### Phase 4: Budget & Bidding
- [ ] Create `src/types/budgets.ts`
- [ ] Add budget/bidding methods to `src/api/client.ts`
- [ ] Add 7 tools to `src/server.ts` tools array
- [ ] Add 7 case handlers to switch statement
- [ ] Update exports
- [ ] Test shared budget creation
- [ ] Update documentation

### Phase 5: Asset Management
- [ ] Create `src/types/assets.ts`
- [ ] Add asset methods to `src/api/client.ts`
- [ ] Add 7 tools to `src/server.ts` tools array
- [ ] Add 7 case handlers to switch statement
- [ ] Add image upload handling
- [ ] Update exports
- [ ] Test asset uploads
- [ ] Update documentation

---

## Implementation Best Practices

### 1. Error Handling Pattern
```typescript
try {
  // API call
  const result = await this.apiClient.someMethod(customerId, data);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
} catch (error: any) {
  console.error('Tool Error:', error.message);
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${error.message}`,
      },
    ],
    isError: true,
  };
}
```

### 2. Input Validation Pattern
```typescript
private validateRequiredArgs(args: any, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (!args || args[field] === undefined || args[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}
```

### 3. GAQL Query Building Pattern
```typescript
private buildGAQLQuery(
  selectFields: string[],
  fromResource: string,
  whereConditions: string[] = [],
  orderBy?: string,
  limit?: number
): string {
  let query = `SELECT\n  ${selectFields.join(',\n  ')}\nFROM ${fromResource}`;

  if (whereConditions.length > 0) {
    query += `\nWHERE ${whereConditions.join('\n  AND ')}`;
  }

  if (orderBy) {
    query += `\nORDER BY ${orderBy}`;
  }

  if (limit) {
    query += `\nLIMIT ${limit}`;
  }

  return query;
}
```

### 4. Response Formatting Pattern
```typescript
private formatToolResponse(data: any, successMessage?: string): any {
  return {
    content: [
      {
        type: 'text',
        text: successMessage || JSON.stringify(data, null, 2),
      },
    ],
  };
}
```

---

## Testing Strategy for Each Phase

### 1. Unit Tests
- Test each API method independently
- Mock Google Ads API responses
- Validate input/output transformations

### 2. Integration Tests
- Test full MCP tool workflows
- Use Google Ads sandbox accounts
- Verify GAQL query correctness

### 3. Manual Testing
- Test each tool through Claude interface
- Verify error handling
- Test edge cases and validation

---

## Deployment Strategy

### 1. Feature Flags
```typescript
// Add feature flags for new tools
const FEATURE_FLAGS = {
  CONVERSIONS_ENABLED: process.env.ENABLE_CONVERSIONS === 'true',
  AUDIENCES_ENABLED: process.env.ENABLE_AUDIENCES === 'true',
  // ... other flags
};

// In tool registration
if (FEATURE_FLAGS.CONVERSIONS_ENABLED) {
  tools.push(conversionTools);
}
```

### 2. Gradual Rollout
- Phase 1: Enable for test accounts only
- Phase 2: Enable for beta users
- Phase 3: Full production rollout

### 3. Monitoring
- Add logging for new tool usage
- Monitor API quota usage
- Track error rates per tool

This template structure should be followed for each implementation phase to ensure consistency and maintainability.