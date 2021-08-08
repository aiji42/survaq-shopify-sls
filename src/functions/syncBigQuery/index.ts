import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  SHOPIFY_SHOP_NAME: '${env:SHOPIFY_SHOP_NAME}',
  SHOPIFY_API_KEY: '${env:SHOPIFY_API_KEY}',
  SHOPIFY_API_SECRET_KEY: '${env:SHOPIFY_API_SECRET_KEY}',
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}'
}

export const syncProductsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.products`,
  events: [
    {
      schedule: {
        rate: '2 hours'
      }
    }
  ],
  environment: {
    ...environment
  }
}

export const syncVariantsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.variants`,
  events: [
    {
      schedule: {
        rate: '2 hours'
      }
    }
  ],
  environment: {
    ...environment
  }
}
