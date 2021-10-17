import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}',
  MICROCMS_API_TOKEN: '${env:MICROCMS_API_TOKEN}'
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const getProductDataV2: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/v2/handler.getProductDataForClient`,
  events: [
    {
      http: {
        path: '/v2/products/{productId}',
        method: 'get',
        cors: true
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}
