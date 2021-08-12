import { handlerPath } from '@libs/handlerResolver'
import { AWS } from '@serverless/typescript'

const environment = {
  BIGQUERY_CREDENTIALS: '${env:BIGQUERY_CREDENTIALS}'
}

export const getVariations: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getVariations`,
  events: [
    {
      httpApi: {
        path: '/products/{productId}/variations',
        method: 'get',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        caching: {
          enabled: true,
          cacheKeyParameters: { name: 'request.path.productId' },
          ttlInSeconds: 15
        }
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}

export const getFundings: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.getFundings`,
  events: [
    {
      httpApi: {
        path: '/products/{productId}/fundings',
        method: 'get'
      }
    }
  ],
  timeout: 60,
  environment: {
    ...environment
  }
}
