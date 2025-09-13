import { OAuth2Client } from 'google-auth-library';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleAdsConfig } from '../types';

export class CredentialManager {
  private config: GoogleAdsConfig;
  private oauth2Client?: OAuth2Client;
  private googleAuth?: GoogleAuth;

  constructor(config?: GoogleAdsConfig) {
    this.config = this.loadConfig(config);
  }

  private loadConfig(providedConfig?: GoogleAdsConfig): GoogleAdsConfig {
    const config: GoogleAdsConfig = {
      ...providedConfig,
    };


    // Debug: Check if Claude Code is passing environment variables
    console.error('Claude Code ENV check:', {
      hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      hasRefreshToken: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    // Load from environment variables
    config.clientId = config.clientId || process.env.GOOGLE_ADS_CLIENT_ID;
    config.clientSecret = config.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET;
    config.refreshToken = config.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;
    config.developerToken = config.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    config.loginCustomerId = config.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    config.useKeywordSandbox = config.useKeywordSandbox || process.env.GOOGLE_ADS_USE_KEYWORD_SANDBOX === 'true';

    // Try to load service account key
    if (process.env.GOOGLE_ADS_SERVICE_ACCOUNT_KEY_PATH) {
      config.serviceAccountKeyPath = process.env.GOOGLE_ADS_SERVICE_ACCOUNT_KEY_PATH;
    }

    if (process.env.GOOGLE_ADS_SERVICE_ACCOUNT_KEY) {
      try {
        config.serviceAccountKey = JSON.parse(process.env.GOOGLE_ADS_SERVICE_ACCOUNT_KEY);
      } catch (e) {
        console.error('Failed to parse service account key from environment');
      }
    }

    // Try to load from default file locations
    if (!config.clientId && !config.serviceAccountKey) {
      const defaultPaths = [
        path.join(process.cwd(), 'google-ads-config.json'),
        path.join(process.cwd(), '.google-ads', 'credentials.json'),
        path.join(process.env.HOME || '', '.google-ads', 'credentials.json'),
      ];

      for (const filepath of defaultPaths) {
        if (fs.existsSync(filepath)) {
          try {
            const fileContent = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            Object.assign(config, fileContent);
            break;
          } catch (e) {
            console.error(`Failed to load config from ${filepath}:`, e);
          }
        }
      }
    }

    return config;
  }

  public async getAccessToken(): Promise<string> {
    if (this.config.serviceAccountKey || this.config.serviceAccountKeyPath) {
      return this.getServiceAccountToken();
    } else if (this.config.refreshToken) {
      return this.getOAuthToken();
    } else {
      throw new Error('No valid authentication method configured');
    }
  }

  private async getOAuthToken(): Promise<string> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      throw new Error('OAuth credentials not properly configured');
    }

    if (!this.oauth2Client) {
      this.oauth2Client = new OAuth2Client(
        this.config.clientId,
        this.config.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      this.oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken,
      });
    }

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to obtain access token');
      }

      return credentials.access_token;
    } catch (error: any) {
      console.error('OAuth token refresh error:', {
        error: error.message,
        code: error.code,
        status: error.status,
      });
      throw new Error(`OAuth authentication failed: ${error.message}`);
    }
  }

  private async getServiceAccountToken(): Promise<string> {
    if (!this.googleAuth) {
      if (this.config.serviceAccountKeyPath) {
        this.googleAuth = new GoogleAuth({
          keyFilename: this.config.serviceAccountKeyPath,
          scopes: ['https://www.googleapis.com/auth/adwords'],
        });
      } else if (this.config.serviceAccountKey) {
        this.googleAuth = new GoogleAuth({
          credentials: this.config.serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/adwords'],
        });
      } else {
        throw new Error('Service account credentials not configured');
      }
    }

    const client = await this.googleAuth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error('Failed to obtain service account access token');
    }

    return tokenResponse.token;
  }

  public getDeveloperToken(): string {
    if (!this.config.developerToken) {
      throw new Error('Developer token not configured');
    }
    return this.config.developerToken;
  }

  public getLoginCustomerId(): string | undefined {
    return this.config.loginCustomerId;
  }

  public formatCustomerId(customerId: string): string {
    // Remove any non-digit characters
    const digits = customerId.replace(/\D/g, '');

    // Ensure it's 10 digits
    if (digits.length !== 10) {
      throw new Error(`Customer ID must be 10 digits. Got: ${digits.length} digits`);
    }

    // Format as XXX-XXX-XXXX
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}