import { APIGatewayProxyHandler } from 'aws-lambda'
import { client } from '@libs/bigquery'
import * as sql from 'sqlstring'
import * as dayjs from 'dayjs'
import * as timezone from 'dayjs/plugin/timezone'
import * as utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

type VariationRecord = {
  id: number
  variantId: number
  selectNo: number
  properties: string
  value: string
  label: string
}

const corsHeader = {
  'Access-Control-Allow-Origin': '*'
}

export const getVariations: APIGatewayProxyHandler = async (event) => {
  const product = event.pathParameters.productId
  try {
    const [data] = (await client.query({
      query: makeVariationsQuery(Number(product))
    })) as unknown as VariationRecord[][]
    const result = data.reduce((res, record) => {
      const { variantId } = record
      return {
        ...res,
        [variantId]: [...(res[variantId] ?? []), record]
      }
    }, {})
    return {
      statusCode: 200,
      body: JSON.stringify(result),
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

const makeVariationsQuery = (product: number) =>
  sql.format(
    `
SELECT id, variant_id as variantId, select_no as selectNo, properties, value, label
FROM shopify.variations
WHERE product_id = ?
LIMIT 1000
`,
    [product]
  )

export const getFundings: APIGatewayProxyHandler = async (event) => {
  const product = event.pathParameters.productId
  try {
    const [[data]] = await client.query({
      query: makeFundingsQuery(Number(product))
    })

    if (!data)
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not found' }),
        headers: { ...corsHeader }
      }

    const { close_on, ...rest } = data
    return {
      statusCode: 200,
      body: JSON.stringify({ ...rest, close_on: close_on?.value }),
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
  IFNULL(SUM(tmp.price), 0) + IFNULL(sum(f.total_price_sum), 0) AS price,
  IFNULL(SUM(tmp.supporters), 0) + IFNULL(sum(f.supporter_sum), 0) AS supporters,
  MIN(close_on) AS close_on,
  MIN(objective_price) AS objective_price
FROM (
    SELECT
      product_id,
      sum(original_total_price) AS price,
      count(distinct order_id) AS supporters
    FROM shopify.line_items li
    WHERE product_id = "gid://shopify/Product/?"
    GROUP BY product_id
) tmp
LEFT JOIN shopify.fundings f
  ON CONCAT('gid://shopify/Product/', f.product_id) = tmp.product_id
GROUP BY f.product_id
LIMIT 1
`,
    [product]
  )

type AdditionalPropertiesRecord = {
  id: number
  variantId: number
  properties: string
  value: string
}

export const getAdditionalProperties: APIGatewayProxyHandler = async (
  event
) => {
  const product = event.pathParameters.productId
  try {
    const [data] = (await client.query({
      query: makeAdditionalPropertiesQuery(Number(product))
    })) as unknown as AdditionalPropertiesRecord[][]
    const result = data.reduce((res, record) => {
      const { variantId } = record
      return {
        ...res,
        [variantId]: [...(res[variantId] ?? []), record]
      }
    }, {})
    return {
      statusCode: 200,
      body: JSON.stringify(result),
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

const makeAdditionalPropertiesQuery = (product: number) =>
  sql.format(
    `
SELECT id, variant_id as variantId, properties, value
FROM shopify.additional_properties
WHERE product_id = ?
LIMIT 1000
`,
    [product]
  )
