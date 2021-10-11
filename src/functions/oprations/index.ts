import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  SHOPIFY_SHOP_NAME: '${env:SHOPIFY_SHOP_NAME}',
  SHOPIFY_API_KEY: '${env:SHOPIFY_API_KEY}',
  SHOPIFY_API_SECRET_KEY: '${env:SHOPIFY_API_SECRET_KEY}',
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}',
  FACEBOOK_GRAPH_API_TOKEN: '${env:FACEBOOK_GRAPH_API_TOKEN}',
  FACEBOOK_BUSINESS_ACCOUNT_ID: '${env:FACEBOOK_BUSINESS_ACCOUNT_ID}',
  JIRA_API_TOKEN: '${env:JIRA_API_TOKEN}',
  JIRA_API_USER: '${env:JIRA_API_USER}'
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const operationOrdersAndLineItems: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/shopify.ordersAndLineItems`,
  events: [
    {
      schedule: 'cron(5 0 * * ? *)' // JST AM 9:05
    }
  ],
  timeout: 600,
  environment: {
    ...environment
  }
}
