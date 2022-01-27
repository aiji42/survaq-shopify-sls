import type { AWS } from '@serverless/typescript'

import {
  syncProductsTable,
  syncVariantsTable,
  syncOrdersAndLineItemsTable,
  syncFacebookAdReports
} from '@functions/syncBigQuery'
import { getProductDataV2 } from '@functions/getProductData'

import { operationOrdersAndLineItems } from '@functions/oprations'

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
    region: 'ap-northeast-1',
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
    },
    lambdaHashingVersion: '20201221'
  },
  functions: {
    syncProductsTable,
    syncVariantsTable,
    syncOrdersAndLineItemsTable,
    syncFacebookAdReports,
    getProductDataV2,
    operationOrdersAndLineItems
  }
}

module.exports = serverlessConfiguration
