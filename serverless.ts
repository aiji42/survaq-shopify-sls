import type { AWS } from '@serverless/typescript'

import { syncOrdersAndLineItemsTable } from '@functions/syncBigQuery'
import { getProductDataV2 } from '@functions/getProductData'

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
    syncOrdersAndLineItemsTable,
    getProductDataV2
  }
}

module.exports = serverlessConfiguration
