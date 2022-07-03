import { APIGatewayProxyHandler } from 'aws-lambda'
import { Product, Rule } from '@functions/getProductData/v2/product'
import { cmsClient } from '@libs/microCms'
import { makeSchedule, Schedule } from './utils'

const corsHeader = {
  'Access-Control-Allow-Origin': '*'
}

type NewRule = Rule & {
  schedule: Schedule
}

export const getProductDataForClient: APIGatewayProxyHandler = async (
  event
) => {
  const productId = event.pathParameters?.productId ?? ''
  try {
    const cmsReq = cmsClient.getListDetail<Product>({
      endpoint: 'products',
      contentId: productId
    })

    const cmsRes = await cmsReq

    const product: Product & { rule: NewRule } = {
      ...cmsRes,
      rule: {
        ...cmsRes.rule,
        schedule: makeSchedule(
          cmsRes.rule.leadDays,
          cmsRes.rule.cyclePurchase.value,
          cmsRes.rule.customSchedules
        )
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(product),
      headers: { ...corsHeader }
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: e instanceof Error ? e.message : 'unknown error'
      }),
      headers: { ...corsHeader }
    }
  }
}
