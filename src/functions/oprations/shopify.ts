import {
  getLatestUpdatedAt,
  insertRecords,
  removeDuplicates
} from '@libs/bigquery'
import { sleep } from '@libs/sleep'
import * as Shopify from 'shopify-api-node'

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_SECRET_KEY
})

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
