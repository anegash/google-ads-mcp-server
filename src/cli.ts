#!/usr/bin/env node

import * as dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { GoogleAdsMCPServer } from './server';
import { GoogleAdsConfig } from './types';

// Load environment variables
dotenv.config();

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to config file',
    })
    .option('client-id', {
      type: 'string',
      description: 'Google Ads Client ID',
    })
    .option('client-secret', {
      type: 'string',
      description: 'Google Ads Client Secret',
    })
    .option('refresh-token', {
      type: 'string',
      description: 'Google Ads Refresh Token',
    })
    .option('developer-token', {
      type: 'string',
      description: 'Google Ads Developer Token',
    })
    .option('login-customer-id', {
      type: 'string',
      description: 'Google Ads Login Customer ID',
    })
    .option('service-account-key-path', {
      type: 'string',
      description: 'Path to service account key file',
    })
    .option('use-keyword-sandbox', {
      type: 'boolean',
      description: 'Use keyword planning sandbox',
      default: false,
    })
    .help()
    .argv;

  // Build configuration
  const config: GoogleAdsConfig = {
    clientId: argv['client-id'],
    clientSecret: argv['client-secret'],
    refreshToken: argv['refresh-token'],
    developerToken: argv['developer-token'],
    loginCustomerId: argv['login-customer-id'],
    serviceAccountKeyPath: argv['service-account-key-path'],
    useKeywordSandbox: argv['use-keyword-sandbox'],
  };

  // Remove undefined values
  Object.keys(config).forEach(key => {
    if ((config as any)[key] === undefined) {
      delete (config as any)[key];
    }
  });

  try {
    // Create and start the MCP server
    const server = new GoogleAdsMCPServer(config);
    await server.start();

    // Keep the process running
    process.on('SIGINT', () => {
      console.error('Shutting down Google Ads MCP server...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('Shutting down Google Ads MCP server...');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('Failed to start Google Ads MCP server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };