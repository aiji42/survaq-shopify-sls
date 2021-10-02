import { sleep } from '@libs/sleep'
import * as Shopify from 'shopify-api-node'
import * as dayjs from 'dayjs'

type Dayjs = dayjs.Dayjs

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME ?? '',
  apiKey: process.env.SHOPIFY_API_KEY ?? '',
  password: process.env.SHOPIFY_API_SECRET_KEY ?? ''
})

type CustomAttributes = {
  key: string
  value: string
}[]

type LineItem = {
  id: string
  quantity: number
  variant: { id: string }
  product: { id: string }
  customAttributes: CustomAttributes
}

const lineItemsQuery = (query: string, cursor: null | string) => `{
  orders(first: 10, query: "${query}" after: ${
  cursor ? `"${cursor}"` : 'null'
}) {
    edges {
      node {
        id
        cancelled_at: cancelledAt
        lineItems(first: 10) {
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

type LineItemGraphqlResponse = {
  orders: {
    edges: {
      node: {
        id: string
        cancelled_at: string | null
        lineItems: {
          edges: {
            node: LineItem
          }[]
        }
      }
      cursor: string
    }[]
    pageInfo: {
      hasNextPage: boolean
    }
  }
}

export const ordersAndLineItems = async (): Promise<void> => {
  const query = `updated_at:>'2021-07-01' -tag:発注済`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let operations: OperationRecord[] = []

  const insert = () => {
    console.log('operations records:', operations.length)
    console.log(operations)
    return Promise.all([
      // TODO insert record
      // TODO update shopify order tag
      // TODO create jira story
    ])
  }

  while (hasNext) {
    const data: LineItemGraphqlResponse = await shopify.graphql(
      lineItemsQuery(query, cursor)
    )
    hasNext = data.orders.pageInfo.hasNextPage

    const ops = data.orders.edges.reduce<OperationRecord[]>(
      (res, { node, cursor: c }) => {
        cursor = c
        if (node.cancelled_at) return res
        const records = node.lineItems.edges
          .map(
            ({ node: lineItem }) => makeOperations(lineItem, node.id, dayjs()) // TODO: dayjs() => referenceDate
          )
          .filter((record): record is OperationRecord[] => Boolean(record))
        return [...res, ...records.flat()]
      },
      []
    )
    operations = [...operations, ...ops]
    if (hasNext) await sleep(1000)
    if (operations.length > 20) {
      // FIXME: 99
      await insert()
      operations = []
    }
  }

  console.log('operations records:', operations.length)
  console.log(operations)
  if (operations.length > 0) await insert()
}

type OperationRecord = {
  order_id: string
  product_id: string
  valiant_id: string
  line_item_id: string
  sku: string
  quantity: number
  operated_at: string
  delivery_schedule_date: string
}

const makeOperations = (
  lineItem: LineItem,
  orderId: string,
  referenceDate: Dayjs
): OperationRecord[] | null => {
  console.log(lineItem)
  const keyValues = lineItem.customAttributes.reduce<Record<string, string>>(
    (res, { key, value }) => ({ ...res, [key]: value }),
    {}
  )
  if (!keyValues['delivery-schedule'] || !keyValues['sku-quantity']) return null
  if (parseSchedule(keyValues['delivery-schedule']) > referenceDate) return null
  const skuQuantities: { sku: string; quantity: number }[] = JSON.parse(
    keyValues['sku-quantity']
  )
  return skuQuantities.map(({ sku, quantity }) => ({
    order_id: orderId,
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
