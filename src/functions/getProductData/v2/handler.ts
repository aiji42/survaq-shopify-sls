import { APIGatewayProxyHandler } from 'aws-lambda'
import { Product, Rule } from '@functions/getProductData/v2/product'
import sql from 'sqlstring'
import { client as bigQueryClient } from '@libs/bigquery'
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
  const productId = event.pathParameters?.productId
  try {
    const cmsReq = cmsClient.get<Product>({
      endpoint: 'products',
      contentId: productId
    })
    const bqReq = bigQueryClient.query({
      query: makeFundingsQuery(Number(productId))
    })

    const cmsRes = await cmsReq
    const [[bqRes]] = await bqReq

    const product: Product & { rule: NewRule } = {
      ...cmsRes,
      foundation: {
        ...cmsRes.foundation,
        supporter: (cmsRes.foundation.supporter ?? 0) + (bqRes.supporters ?? 0),
        objectivePrice: cmsRes.foundation.objectivePrice ?? 0,
        totalPrice: (cmsRes.foundation.totalPrice ?? 0) + (bqRes.price ?? 0)
      },
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
      body: JSON.stringify({ message: e.message }),
      headers: { ...corsHeader }
    }
  }
}

const makeFundingsQuery = (product: number) =>
  sql.format(
    `
SELECT
  sum(original_total_price) AS price,
  count(distinct order_id) AS supporters
FROM shopify.line_items li
WHERE product_id = "gid://shopify/Product/?"
GROUP BY product_id
`,
    [product]
  )
