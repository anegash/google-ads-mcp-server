# Google Ads MCP Troubleshooting Guide 🔧

Complete troubleshooting guide for digital marketing agencies and developers using the Google Ads MCP server.

## 🚀 Quick Setup Verification

### For Claude Desktop

**Config Location**:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Working Configuration**:
```json
{
  "mcpServers": {
    "google-ads": {
      "command": "npx",
      "args": ["@hapotech/google-ads-mcp"],
      "env": {
        "GOOGLE_ADS_CLIENT_ID": "123456789012-abcdef.apps.googleusercontent.com",
        "GOOGLE_ADS_CLIENT_SECRET": "GOCSPX-AbCdEfGhIjKlMn",
        "GOOGLE_ADS_REFRESH_TOKEN": "1//04AbCdEf...",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "AbCdEfGhIjKl...",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "123-456-7890"
      }
    }
  }
}
```

### For Claude Code (VS Code)

**Create `.mcp.json` in your project root**:
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

### Alternative: Global Installation
```bash
npm install -g @hapotech/google-ads-mcp
```

Then use in config:
```json
{
  "command": "google-ads-mcp",
  "args": []
}
```

## 🚨 Common Issues & Solutions

### Issue 1: "Command not found: google-ads-mcp"
**Solution**: Use direct path or reinstall globally
```bash
npm uninstall -g @hapotech/google-ads-mcp
npm install -g ./hapotech-google-ads-mcp-1.0.0.tgz
```

### Issue 2: "Authentication failed"
**Causes**:
- Invalid credentials
- Expired refresh token
- Wrong developer token
- Missing API access

**Solutions**:
1. Verify credentials in Google Cloud Console
2. Regenerate refresh token
3. Check Google Ads API access

### Issue 3: "Server failed to start"
**Debug steps**:
```bash
# Test manually
GOOGLE_ADS_CLIENT_ID=test google-ads-mcp --help

# Check with minimal config
echo '{}' | GOOGLE_ADS_CLIENT_ID=test GOOGLE_ADS_CLIENT_SECRET=test GOOGLE_ADS_REFRESH_TOKEN=test GOOGLE_ADS_DEVELOPER_TOKEN=test google-ads-mcp
```

### Issue 4: Punycode deprecation warning
This is a harmless warning from dependencies. To suppress:
```bash
NODE_OPTIONS="--no-warnings" google-ads-mcp
```

## 🧪 Manual Testing

### Test 1: Check Installation
```bash
which google-ads-mcp
google-ads-mcp --version
```

### Test 2: Test MCP Protocol
```bash
export GOOGLE_ADS_CLIENT_ID=test
export GOOGLE_ADS_CLIENT_SECRET=test
export GOOGLE_ADS_REFRESH_TOKEN=test
export GOOGLE_ADS_DEVELOPER_TOKEN=test

echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | google-ads-mcp
```

### Test 3: Test with Real Credentials
```bash
export GOOGLE_ADS_CLIENT_ID="your-real-client-id"
export GOOGLE_ADS_CLIENT_SECRET="your-real-client-secret"
export GOOGLE_ADS_REFRESH_TOKEN="your-real-refresh-token"
export GOOGLE_ADS_DEVELOPER_TOKEN="your-real-developer-token"

echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_accounts", "arguments": {}}}' | google-ads-mcp
```

## 🔍 Debug Mode

Enable debug logging:
```json
{
  "mcpServers": {
    "google-ads": {
      "command": "google-ads-mcp",
      "args": [],
      "env": {
        "GOOGLE_ADS_CLIENT_ID": "...",
        "GOOGLE_ADS_CLIENT_SECRET": "...",
        "GOOGLE_ADS_REFRESH_TOKEN": "...",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "...",
        "LOG_LEVEL": "debug",
        "DEBUG": "google-ads-mcp:*"
      }
    }
  }
}
```

## 📝 Credentials Setup Guide

### Getting OAuth Credentials

1. **Google Cloud Console**:
   - Create project
   - Enable Google Ads API
   - Create OAuth 2.0 credentials

2. **Generate Refresh Token**:
   - Use OAuth Playground or programmatic flow
   - Scopes: `https://www.googleapis.com/auth/adwords`

3. **Developer Token**:
   - Apply for Google Ads API access
   - Get developer token from Google Ads account

### Environment Variable Format
```bash
# OAuth method
export GOOGLE_ADS_CLIENT_ID="123456789.apps.googleusercontent.com"
export GOOGLE_ADS_CLIENT_SECRET="GOCSPX-abcdef..."
export GOOGLE_ADS_REFRESH_TOKEN="1//04abcd..."
export GOOGLE_ADS_DEVELOPER_TOKEN="AbCdEf123..."

# Optional for manager accounts
export GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"
```

## ❓ Still Having Issues?

1. Check Claude Code logs for specific error messages
2. Test the MCP server manually using the commands above
3. Verify all credentials are correct and have proper permissions
4. Try the direct path configuration instead of global command
5. Create an issue with the exact error message