import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  SHOPIFY_SHOP_NAME: '${env:SHOPIFY_SHOP_NAME}',
  SHOPIFY_API_KEY: '${env:SHOPIFY_API_KEY}',
  SHOPIFY_API_SECRET_KEY: '${env:SHOPIFY_API_SECRET_KEY}',
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}',
  FACEBOOK_GRAPH_API_TOKEN: '${env:FACEBOOK_GRAPH_API_TOKEN}',
  FACEBOOK_BUSINESS_ACCOUNT_ID: '${env:FACEBOOK_BUSINESS_ACCOUNT_ID}'
}

export const syncProductsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.products`,
  events: [
    {
      schedule: 'cron(0 * * * ? *)'
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

export const syncVariantsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.variants`,
  events: [
    {
      schedule: 'cron(0 * * * ? *)'
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

export const syncOrdersAndLineItemsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.ordersAndLineItems`,
  events: [
    {
      schedule: 'cron(0 * * * ? *)'
    }
  ],
  timeout: 180,
  environment: {
    ...environment
  }
}

export const syncFacebookAdReports: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.syncFacebookAdReports`,
  events: [
    {
      schedule: 'cron(0 * * * ? *)'
    }
  ],
  timeout: 180,
  environment: {
    ...environment
  }
}
