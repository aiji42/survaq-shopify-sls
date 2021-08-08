import type { AWS } from '@serverless/typescript'

import hello from '@functions/hello'
import { syncProductsTable, syncVariantsTable, syncOrdersAndLineItemsTable } from '@functions/syncBigQuery'

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
    // apiGateway: {
    //   minimumCompressionSize: 1024,
    //   shouldStartNameWithService: true,
    // },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
    },
    lambdaHashingVersion: '20201221'
  },
  // import the function via paths
  functions: { hello, syncProductsTable, syncVariantsTable, syncOrdersAndLineItemsTable }
}

module.exports = serverlessConfiguration
