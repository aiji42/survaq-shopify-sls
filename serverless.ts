import type { AWS } from '@serverless/typescript'

import {
  syncProductsTable,
  syncVariantsTable,
  syncOrdersAndLineItemsTable
} from '@functions/syncBigQuery'
import { getVariations, getFundings } from '@functions/getDataOnBigQuery'

const serverlessConfiguration: AWS = {
  service: 'survaq-shopify-sls',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    }
  },
  plugins: [
    'serverless-webpack',
    'serverless-dotenv-plugin',
    'serverless-offline'
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
    },
    lambdaHashingVersion: '20201221',
    httpApi: { cors: true }
  },
  functions: {
    syncProductsTable,
    syncVariantsTable,
    syncOrdersAndLineItemsTable,
    getVariations,
    getFundings
  }
}

module.exports = serverlessConfiguration
