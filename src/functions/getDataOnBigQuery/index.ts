import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  SHOPIFY_SHOP_NAME: '${env:SHOPIFY_SHOP_NAME}',
  SHOPIFY_API_KEY: '${env:SHOPIFY_API_KEY}',
  SHOPIFY_API_SECRET_KEY: '${env:SHOPIFY_API_SECRET_KEY}',
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}'
}

export const getVariations: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getVariations`,
  events: [
    {
      httpApi: {
        path: '/variations',
        method: 'get'
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}
