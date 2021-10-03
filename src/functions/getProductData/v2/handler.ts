import { APIGatewayProxyHandler } from 'aws-lambda'
import { Product, Rule } from '@functions/getProductData/v2/product'
import * as dayjs from 'dayjs'
import * as timezone from 'dayjs/plugin/timezone'
import * as utc from 'dayjs/plugin/utc'
import * as sql from 'sqlstring'
import { client as bigQueryClient } from '@libs/bigquery'
import { cmsClient } from '@libs/microCms'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

const corsHeader = {
  'Access-Control-Allow-Origin': '*'
}

type Schedule = {
  year: number
  month: number
  term: 'early' | 'middle' | 'late'
  text: string
  subText: string
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
      skus: cmsRes.skus.filter(({ active }) => active),
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
          cmsRes.rule.cyclePurchase.value
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

const makeSchedule = (
  leadDays: number,
  cycle: Rule['cyclePurchase']['value']
): Schedule => {
  const date = dayjs().tz().add(leadDays, 'day')
  const [year, month, day, dayOfMonth] = [
    date.year(),
    date.month() + 1,
    date.date(),
    date.daysInMonth()
  ]
  if (cycle === 'triple') {
    const [term, termText, beginDate, endDate]: [
      Schedule['term'],
      string,
      number,
      number
    ] =
      1 <= day && day <= 10
        ? ['early', '上旬', 1, 10]
        : 11 <= day && day <= 20
        ? ['middle', '中旬', 11, 20]
        : ['late', '下旬', 21, dayOfMonth]
    return {
      year,
      month,
      term,
      text: `${year}年${month}月${termText}`,
      subText: `${month}/${beginDate}〜${month}/${endDate}`
    }
  }

  return {
    year,
    month,
    term: 'late',
    text: `${year}年${month}月下旬`,
    subText: `${month}/${21}〜${month}/${dayOfMonth}`
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
