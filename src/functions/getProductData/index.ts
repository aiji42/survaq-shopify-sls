import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}',
  MICROCMS_API_TOKEN: '${env:MICROCMS_API_TOKEN}'
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const getVariations: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getVariations`,
  events: [
    {
      http: {
        path: '/products/{productId}/variations',
        method: 'get',
        cors: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        caching: {
          enabled: true,
          cacheKeyParameters: [
            {
              name: 'request.path.productId'
            }
          ],
          ttlInSeconds: 3600
        }
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const getFundings: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getFundings`,
  events: [
    {
      http: {
        path: '/products/{productId}/fundings',
        method: 'get',
        cors: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        caching: {
          enabled: true,
          cacheKeyParameters: [
            {
              name: 'request.path.productId'
            }
          ],
          ttlInSeconds: 3600
        }
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const getAdditionalProperties: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getAdditionalProperties`,
  events: [
    {
      http: {
        path: '/products/{productId}/additional-properties',
        method: 'get',
        cors: true,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        caching: {
          enabled: true,
          cacheKeyParameters: [
            {
              name: 'request.path.productId'
            }
          ],
          ttlInSeconds: 3600
        }
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
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
