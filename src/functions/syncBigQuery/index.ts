import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  SHOPIFY_SHOP_NAME: '${env:SHOPIFY_SHOP_NAME}',
  SHOPIFY_API_KEY: '${env:SHOPIFY_API_KEY}',
  SHOPIFY_API_SECRET_KEY: '${env:SHOPIFY_API_SECRET_KEY}',
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}',
  FACEBOOK_GRAPH_API_TOKEN: '${env:FACEBOOK_GRAPH_API_TOKEN}',
  FACEBOOK_BUSINESS_ACCOUNT_ID: '${env:FACEBOOK_BUSINESS_ACCOUNT_ID}',
  MICROCMS_API_TOKEN: '${env:MICROCMS_API_TOKEN}'
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const syncProductsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/shopify.products`,
  events: [
    {
      schedule: 'cron(58 * * * ? *)'
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const syncVariantsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/shopify.variants`,
  events: [
    {
      schedule: 'cron(58 * * * ? *)'
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const syncOrdersAndLineItemsTable: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/shopify.ordersAndLineItems`,
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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const syncFacebookAdReports: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/facebook.adReports`,
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
