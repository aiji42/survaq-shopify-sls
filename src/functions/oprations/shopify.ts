import {
  getLatestUpdatedAt,
  insertRecords,
  removeDuplicates
} from '@libs/bigquery'
import { sleep } from '@libs/sleep'
import * as Shopify from 'shopify-api-node'
import * as dayjs from 'dayjs'

type Dayjs = dayjs.Dayjs

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_SECRET_KEY
})

type CustomAttributes = {
  key: string
  value: string
}[]

type LineItem = {
  id: string
  quantity
  variant: { id: string }
  product: { id: string }
  customAttributes: CustomAttributes
}

const lineItemsQuery = (query: string, cursor: null | string) => `{
  orders(first: 20, query: "${query}" after: ${
  cursor ? `"${cursor}"` : 'null'
}) {
    edges {
      node {
        id
        cancelled_at: cancelledAt
        created_at: createdAt
        lineItems(first: 20) {
          edges {
            node {
              id
              quantity
              variant {
                id
              }
              product {
                id
              }
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`

export const ordersAndLineItems = async (): Promise<void> => {
  const query = `updated_at:>'2021-07-01' -tag:発注済`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let operations = []

  const insert = () => {
    console.log('operations records:', operations.length)
    return Promise.all([
      // TODO insert record
      // TODO update shopify order tag
      // TODO create jira story
    ])
  }

  while (hasNext) {
    const data = await shopify.graphql(lineItemsQuery(query, cursor))
    hasNext = data.orders.pageInfo.hasNextPage

    operations = data.orders.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      return [
        ...res,
        ...node.lineItems.edges.map(({ node: item }) => {
          return {
            ...item,
            line_item_id: item.id,
            order_id: node.id,
            product_id: item.product.id,
            variant_id: item.variant?.id ?? null,
            quantity: item.quantity,
            sku: '', // TODO
            operated_at: '' // TODO NOW
          }
        })
      ]
    }, [])
    if (hasNext) await sleep(1000)
    if (operations.length > 99) {
      await insert()
      operations = []
    }
  }

  console.log('operations records:', operations.length)
  console.log(operations)
  if (operations.length > 0) await insert()
}

const makeOperations = (lineItem: LineItem, referenceDate: Dayjs) => {
  const keyValues = lineItem.customAttributes.reduce(
    (res, { key, value }) => ({ ...res, [key]: value }),
    {}
  )
  if (!keyValues['delivery-schedule'] || !keyValues['sku-quantity']) return null
  if (parseSchedule(keyValues['delivery-schedule']) > referenceDate) return null
  const skuQuantities: { sku: string; quantity: number }[] = JSON.parse(
    keyValues['sku-quantity']
  )
  skuQuantities.map(({ sku, quantity }) => ({
    product_id: lineItem.product.id,
    valiant_id: lineItem.variant.id,
    line_item_id: lineItem.id,
    sku,
    quantity: quantity * lineItem.quantity,
    operated_at: dayjs().toISOString(),
    delivery_schedule_date: parseSchedule(keyValues['delivery-schedule'])
      .toISOString()
      .slice(0, 10)
  }))
}

const parseSchedule = (value: string): Dayjs => {
  const [year, month, term] = value.split('-')
  const date = term === 'late' ? 28 : term === 'middle' ? 18 : 8
  return dayjs(`${year}-${month}-${date}`)
}
