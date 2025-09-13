# Google Ads MCP Server 🚀

A comprehensive Google Ads API integration for AI assistants through the Model Context Protocol (MCP). This server enables Claude AI and other MCP-compatible clients to manage Google Ads campaigns, analyze performance, and execute GAQL queries with natural language commands.

[![npm version](https://badge.fury.io/js/%40hapotech%2Fgoogle-ads-mcp.svg)](https://www.npmjs.com/package/@hapotech/google-ads-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> **Perfect for Digital Marketing Agencies** - Manage multiple client accounts, automate campaign operations, and get instant insights through AI conversation.

## 🌟 Features

- **Complete Google Ads API Coverage**: 16 tools covering read and write operations
- **Multiple Authentication Methods**: OAuth 2.0 and Service Account authentication
- **MCP Compatible**: Works with Claude AI and any MCP-compatible client
- **TypeScript**: Full type safety and excellent developer experience
- **NPM Package**: Easy deployment with `npx` command
- **Comprehensive Error Handling**: Detailed error messages and validation

## 📦 Quick Start

### Installation

```bash
# Install globally (recommended for CLI usage)
npm install -g @hapotech/google-ads-mcp

# Or use with npx (no installation required)
npx @hapotech/google-ads-mcp
```

### Configuration for Claude Desktop

1. **Get your Claude Desktop config location**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the Google Ads MCP server**:

```json
{
  "mcpServers": {
    "google-ads": {
      "command": "npx",
      "args": ["@hapotech/google-ads-mcp"],
      "env": {
        "GOOGLE_ADS_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_ADS_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_ADS_REFRESH_TOKEN": "your-refresh-token",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "your-developer-token",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "123-456-7890"
      }
    }
  }
}
```

3. **Restart Claude Desktop** and start chatting with your Google Ads data!

### Configuration for Claude Code (VS Code Extension)

1. **Open VS Code** with the Claude Code extension installed
2. **Create/edit `.mcp.json`** in your project root:

```json
{
  "mcp": {
    "servers": {
      "google-ads": {
        "command": "npx",
        "args": ["@hapotech/google-ads-mcp"],
        "env": {
          "GOOGLE_ADS_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
          "GOOGLE_ADS_CLIENT_SECRET": "your-client-secret",
          "GOOGLE_ADS_REFRESH_TOKEN": "your-refresh-token",
          "GOOGLE_ADS_DEVELOPER_TOKEN": "your-developer-token",
          "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "123-456-7890"
        }
      }
    }
  }
}
```

3. **Reload the window** or restart Claude Code to load the MCP server

## 🔐 Authentication Setup

### Prerequisites

1. **Google Ads Account** with API access enabled
2. **Google Cloud Project** with Google Ads API enabled
3. **Developer Token** from Google Ads (can take 1-2 business days for approval)

### Step-by-Step Authentication Setup

#### Step 1: Get a Developer Token

1. **Sign in to Google Ads** at [ads.google.com](https://ads.google.com)
2. **Navigate to**: Tools & Settings → Setup → API Center
3. **Request Access** and wait for approval (1-2 business days)
4. **Copy your Developer Token** once approved

#### Step 2: Setup OAuth 2.0 Credentials

1. **Go to Google Cloud Console**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Ads API**:
   - Go to APIs & Services → Library
   - Search for "Google Ads API" and enable it

3. **Create OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Desktop Application"
   - Download the credentials JSON

4. **Generate Refresh Token**:

   **Option A: Use OAuth Playground**
   - Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
   - In settings, check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - Add scope: `https://www.googleapis.com/auth/adwords`
   - Follow the flow to get your refresh token

   **Option B: Use this helper script**:
   ```bash
   npx @hapotech/google-ads-mcp --generate-token
   # Follow the prompts to get your refresh token
   ```

#### Step 3: Configure Manager Account (For Agencies)

If you're managing multiple client accounts:

1. **Find your Manager Account ID**:
   - Sign in to Google Ads
   - Look for the 10-digit number at the top (format: XXX-XXX-XXXX)
   - This becomes your `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

2. **Link Client Accounts**:
   - In Google Ads, go to Tools & Settings → Account Management
   - Send invitations to client accounts
   - Once accepted, you can manage them through the API

### Environment Variables Summary

```bash
# Required for OAuth (Recommended Method)
GOOGLE_ADS_CLIENT_ID="123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz"
GOOGLE_ADS_REFRESH_TOKEN="1//04AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz"
GOOGLE_ADS_DEVELOPER_TOKEN="AbCdEfGhIjKlMnOpQrStUvWxYz"

# Optional: For manager accounts managing multiple clients
GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"

# Alternative: Service Account (Advanced)
GOOGLE_ADS_SERVICE_ACCOUNT_KEY_PATH="/path/to/service-account.json"
GOOGLE_ADS_DEVELOPER_TOKEN="AbCdEfGhIjKlMnOpQrStUvWxYz"
```

## 🛠️ Available Tools

### 📊 Read Operations (8 tools)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `list_accounts` | List accessible Google Ads accounts | Get all accounts you have access to |
| `get_campaigns` | Get campaigns for a customer | Retrieve campaign data with metrics |
| `get_campaign_performance` | Get campaign performance metrics | Analyze campaign performance over time |
| `get_ad_groups` | Get ad groups for campaigns | List ad groups with bidding info |
| `get_ads` | Get ads and creatives | View responsive search ads and copy |
| `get_keywords` | Get keywords and match types | See keyword performance and bids |
| `execute_gaql_query` | Run custom GAQL queries | Advanced queries with custom output |
| `get_image_assets` | Get image assets | View uploaded images and logos |

### ✏️ Write Operations (8 tools)

| Tool | Description | Safety Features |
|------|-------------|----------------|
| `create_campaign` | Create new campaign | ✅ Created in PAUSED state |
| `update_campaign_status` | Update campaign status | ⚠️ Can enable/pause/remove |
| `create_ad_group` | Create new ad group | ✅ Created in PAUSED state |
| `create_responsive_search_ad` | Create RSA ads | ✅ Created in PAUSED state |
| `add_keywords` | Add positive keywords | ✅ Validate before adding |
| `add_negative_keywords` | Add negative keywords | ✅ Prevent unwanted traffic |

## 💬 Example Conversations

### Get Campaign Overview
```
You: "Show me all campaigns for account 1234567890 with their performance metrics"

Claude: I'll get your campaigns and their performance data.
[Uses get_campaigns and get_campaign_performance tools]

Results:
• Campaign "Holiday Sale 2024": 15,432 impressions, 1,234 clicks (8.0% CTR)
• Campaign "Brand Awareness": 8,901 impressions, 456 clicks (5.1% CTR)
• Total spend: $2,847.32 this month
```

### Create New Campaign Safely
```
You: "Create a search campaign called 'New Product Launch' with $100 daily budget for account 1234567890"

Claude: I'll create a new search campaign for you. For safety, it will be created in PAUSED state.
[Uses create_campaign tool]

✅ Campaign created successfully!
• Name: "New Product Launch"
• Budget: $100/day
• Status: PAUSED (ready for you to review and enable)
• Campaign ID: 987654321
```

### Analyze Keyword Performance
```
You: "What are the top performing keywords for campaign 987654321?"

Claude: I'll analyze the keyword performance for that campaign.
[Uses execute_gaql_query tool with custom GAQL]

Top performing keywords:
1. "premium software solution" - 2,341 impressions, 187 clicks (8.0% CTR)
2. "best project management" - 1,876 impressions, 134 clicks (7.1% CTR)
3. "business automation tool" - 1,432 impressions, 89 clicks (6.2% CTR)
```

### Agency Multi-Account Management
```
You: "Show me a summary of all my client accounts' performance this month"

Claude: I'll get performance data across all your managed accounts.
[Uses list_accounts and get_campaign_performance for each]

Account Performance Summary:
📊 Client A (Account: 1111111111): $12,340 spent, 234 conversions
📊 Client B (Account: 2222222222): $8,750 spent, 156 conversions
📊 Client C (Account: 3333333333): $15,680 spent, 289 conversions
📈 Total: $36,770 spent, 679 conversions across all accounts
```

## 🔍 Advanced GAQL Queries

The server supports custom GAQL queries for advanced analysis:

### Campaign Performance Analysis
```sql
SELECT
  campaign.name,
  campaign.status,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.status = 'ENABLED'
ORDER BY metrics.cost_micros DESC
```

### Keyword Performance with Quality Score
```sql
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  ad_group_criterion.quality_info.quality_score,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'KEYWORD'
  AND segments.date DURING LAST_7_DAYS
  AND metrics.impressions > 100
ORDER BY metrics.ctr DESC
```

### Ad Performance Comparison
```sql
SELECT
  ad_group_ad.ad.responsive_search_ad.headlines,
  ad_group_ad.ad.responsive_search_ad.descriptions,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.conversions
FROM ad_group_ad
WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  AND segments.date DURING LAST_14_DAYS
  AND metrics.impressions > 1000
ORDER BY metrics.conversions DESC
```

## 🔍 GAQL (Google Ads Query Language)

The server includes built-in GAQL reference and examples:

```sql
-- Get campaign performance
SELECT
  campaign.name,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_30_DAYS

-- Get keyword performance
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  metrics.impressions,
  metrics.clicks
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'KEYWORD'
  AND segments.date DURING LAST_7_DAYS
```

## 🏗️ Architecture

```mermaid
graph TD
    A[Claude AI] --> B[MCP Protocol]
    B --> C[Google Ads MCP Server]
    C --> D[Authentication Manager]
    C --> E[Google Ads API Client]
    D --> F[OAuth 2.0]
    D --> G[Service Account]
    E --> H[Google Ads API v19]

    C --> I[16 Available Tools]
    I --> J[Read Operations]
    I --> K[Write Operations]

    J --> L[Campaigns, Ads, Keywords]
    K --> M[Create, Update, Manage]
```

## 🚀 Development

### Setup Development Environment

```bash
# Clone and setup
git clone https://github.com/anegash/google-ads-mcp-server.git
cd google-ads-mcp-server

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Development mode
npm run dev

# Build
npm run build

# Test
npm test
```

### Project Structure

```
src/
├── api/
│   └── client.ts          # Google Ads API client
├── auth/
│   └── credentials.ts     # Authentication management
├── server.ts              # MCP server implementation
├── types.ts               # TypeScript definitions
├── cli.ts                # Command-line interface
└── index.ts              # Package exports
```

## ⚙️ Configuration Options

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_ADS_CLIENT_ID` | OAuth client ID | Yes* | `123...apps.googleusercontent.com` |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret | Yes* | `GOCSPX-...` |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth refresh token | Yes* | `1//04...` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token | Yes | `abc123...` |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager account ID | No | `123-456-7890` |
| `GOOGLE_ADS_SERVICE_ACCOUNT_KEY_PATH` | Service account file | Yes** | `/path/to/key.json` |
| `GOOGLE_ADS_SERVICE_ACCOUNT_KEY` | Inline service account | Yes** | `{\"type\":\"service_account\"...}` |

*Required for OAuth authentication
**Required for Service Account authentication

### Command Line Options

```bash
npx @hapotech/google-ads-mcp --help

Options:
  -c, --config                    Path to config file
  --client-id                     Google Ads Client ID
  --client-secret                 Google Ads Client Secret
  --refresh-token                 Google Ads Refresh Token
  --developer-token               Google Ads Developer Token
  --login-customer-id             Google Ads Login Customer ID
  --service-account-key-path      Path to service account key file
  --use-keyword-sandbox           Use keyword planning sandbox
  --help                          Show help
```

## 🛡️ Security Features

- ✅ **No Hardcoded Credentials**: All credentials from environment/config
- ✅ **Safe Write Operations**: All created resources start in PAUSED state
- ✅ **Input Validation**: Comprehensive validation on all inputs
- ✅ **Error Boundaries**: Detailed error handling and reporting
- ✅ **Token Management**: Automatic OAuth token refresh
- ✅ **Path Protection**: Safe file path handling

## 📊 Monitoring & Debugging

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Enable debug output
export DEBUG=google-ads-mcp:*
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### Authentication Errors

**Problem**: `Error: Request failed with status code 401`
```
✅ Solutions:
• Verify your developer token is approved and active
• Check OAuth credentials (client ID, client secret, refresh token)
• Ensure the refresh token hasn't expired
• Verify Google Ads API is enabled in Google Cloud Console
```

**Problem**: `Error: Request failed with status code 403`
```
✅ Solutions:
• Check if you have access to the customer account
• Verify GOOGLE_ADS_LOGIN_CUSTOMER_ID is set for manager accounts
• Ensure your developer token has the necessary permissions
• Check if the account is properly linked in Google Ads
```

#### Manager Account Issues

**Problem**: "Cannot access managed account"
```
✅ Solutions:
• Set GOOGLE_ADS_LOGIN_CUSTOMER_ID to your manager account ID
• Verify the managed account is linked under your manager account
• Check account permissions in Google Ads → Account Management
• Ensure the managed account accepted your invitation
```

#### API Quota and Rate Limiting

**Problem**: `Error: Quota exceeded` or rate limiting
```
✅ Solutions:
• Google Ads API has daily and per-minute quotas
• Implement delays between requests
• Monitor usage in Google Cloud Console → APIs & Services → Quotas
• Contact Google support for quota increases if needed
```

#### Configuration Issues

**Problem**: "Google Ads MCP server not found" in Claude
```
✅ Solutions:
• Restart Claude Desktop after configuration changes
• Verify .mcp.json or claude_desktop_config.json syntax
• Check file permissions and paths
• Ensure npx can access @hapotech/google-ads-mcp
```

**Problem**: Environment variables not loading
```
✅ Solutions:
• Use absolute paths for service account keys
• Quote environment variables with special characters
• Restart the application after setting environment variables
• Check that variable names match exactly (case-sensitive)
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# For CLI usage
DEBUG=google-ads-mcp:* npx @hapotech/google-ads-mcp

# For environment
export DEBUG=google-ads-mcp:*
export LOG_LEVEL=debug
```

### Validation Commands

Test your configuration:

```bash
# Test authentication
npx @hapotech/google-ads-mcp --test-auth

# Validate configuration
npx @hapotech/google-ads-mcp --validate-config

# List available accounts (requires working auth)
npx @hapotech/google-ads-mcp --list-accounts
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Google Ads API Documentation](https://developers.google.com/google-ads/api)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude AI](https://claude.ai/)
- [GAQL Reference](https://developers.google.com/google-ads/api/docs/query/overview)

## 🆘 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/anegash/google-ads-mcp-server/issues)
- 📖 **Documentation**: [Full Documentation](https://github.com/anegash/google-ads-mcp-server)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/anegash/google-ads-mcp-server/discussions)

---

**Made with ❤️ by [Hapotech](https://hapotech.com)**

*Enable AI assistants to manage Google Ads campaigns with natural language commands!*