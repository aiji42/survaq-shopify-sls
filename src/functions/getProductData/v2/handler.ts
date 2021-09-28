import { APIGatewayProxyHandler } from 'aws-lambda'
import { createClient } from 'microcms-js-sdk'
import { Product, Rule } from '@functions/getProductData/v2/product'
import * as dayjs from 'dayjs'
import * as timezone from 'dayjs/plugin/timezone'
import * as utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

const client = createClient({
  serviceDomain: 'survaq-shopify',
  apiKey: process.env.MICROCMS_API_TOKEN
})

const corsHeader = {
  'Access-Control-Allow-Origin': '*'
}

type Schedule = {
  year: number
  month: number
  term: 'early' | 'middle' | 'late'
  fulltext: string
}

type NewRule = Rule & {
  schedule: Schedule
}

export const getProductDataForClient: APIGatewayProxyHandler = async (
  event
) => {
  const productId = event.pathParameters.productId
  try {
    const res = await client.get<Product>({
      endpoint: 'products',
      contentId: productId
    })

    const product: Product & { rule: NewRule } = {
      ...res,
      skus: res.skus.filter(({ active }) => active),
      rule: {
        ...res.rule,
        schedule: makeSchedule(res.rule.leadDays)
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

const makeSchedule = (leadDays: number): Schedule => {
  const date = dayjs().add(leadDays, 'day')
  const [year, month, day] = [
    date.tz().year(),
    date.tz().month() + 1,
    date.tz().date()
  ]
  const [term, termText]: [Schedule['term'], string] =
    1 <= day && day <= 10
      ? ['early', '上旬']
      : 11 <= day && day <= 20
      ? ['middle', '中旬']
      : ['late', '下旬']
  return {
    year,
    month,
    term,
    // FIXME
    fulltext: `${year}年${month}月${termText}(${month}/xx〜${month}/yy)`
  }
}
