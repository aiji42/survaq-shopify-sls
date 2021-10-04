import type { AWS } from '@serverless/typescript'

import {
  syncProductsTable,
  syncVariantsTable,
  syncOrdersAndLineItemsTable,
  syncFacebookAdReports
} from '@functions/syncBigQuery'
import {
  getVariations,
  getFundings,
  getAdditionalProperties,
  getProductDataV2
} from '@functions/getProductData'

import { operationOrdersAndLineItems } from '@functions/oprations'

const serverlessConfiguration: AWS = {
  service: 'survaq-shopify-sls',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
    apiGatewayCaching: {
      enabled: true
    }
  },
  plugins: [
    'serverless-webpack',
    'serverless-dotenv-plugin',
    'serverless-api-gateway-caching',
    'serverless-offline'
  ],
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
    syncOrdersAndLineItemsTable,
    syncFacebookAdReports,
    getVariations,
    getFundings,
    getAdditionalProperties,
    getProductDataV2,
    operationOrdersAndLineItems
  }
}

module.exports = serverlessConfiguration
