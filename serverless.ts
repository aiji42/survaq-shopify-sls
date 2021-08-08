import type { AWS } from '@serverless/typescript'

import {
  syncProductsTable,
  syncVariantsTable,
  syncOrdersAndLineItemsTable
} from '@functions/syncBigQuery'

const serverlessConfiguration: AWS = {
  service: 'survaq-shopify-sls',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    }
  },
  plugins: ['serverless-webpack', 'serverless-dotenv-plugin'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
    },
    lambdaHashingVersion: '20201221'
  },
  functions: {
    syncProductsTable,
    syncVariantsTable,
    syncOrdersAndLineItemsTable
  }
}

module.exports = serverlessConfiguration
