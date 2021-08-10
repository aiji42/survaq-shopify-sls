import { APIGatewayProxyHandler } from 'aws-lambda'
import { client } from '@libs/bigquery'
import * as sql from 'sqlstring'

type VariationRecord = {
  id: number
  variantId: number
  selectNo: number
  properties: string
  value: string
  label: string
}

export const getVariations: APIGatewayProxyHandler = async (event) => {
  const product = event.queryStringParameters?.product
  if (!product)
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Please request with ?product=xxxxx'
      })
    }
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
    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: JSON.stringify({ message: e.message }) }
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
