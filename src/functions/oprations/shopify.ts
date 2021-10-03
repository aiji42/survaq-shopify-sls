import * as dayjs from 'dayjs'
import * as sql from 'sqlstring'
import { client as bigQueryClient, insertRecords } from '@libs/bigquery'
import { cmsClient } from '@libs/microCms'
import { Product } from '@functions/getProductData/v2/product'
import { createIssue } from '@libs/jira'

type Dayjs = dayjs.Dayjs

export const ordersAndLineItems = async (): Promise<void> => {
  const [bqRes]: [NotOperatedLineItemQueryRecord[], unknown] =
    await bigQueryClient.query({
      query: makeNotOperatedLineItemQuery()
    })
  const productIds = [...new Set(bqRes.map(({ product_id }) => product_id))]
  const cmsRes = await Promise.all(
    productIds.map((id) => {
      return cmsClient.get<Product>({
        endpoint: 'products',
        contentId: productIdStripPrefix(id)
      })
    })
  )
  const products = cmsRes.reduce<Record<string, Product>>(
    (res, product) => ({
      ...res,
      [product.id]: product
    }),
    {}
  )

  const operatedLineItems = bqRes
    .map((lineItem) => {
      const product = products[productIdStripPrefix(lineItem.product_id)]
      if (!product)
        throw new Error(
          `Not exist or not fetchable product data: ${lineItem.product_id}`
        )
      // TODO: product and ordered_at -> calc schedule
      const scheduleData = lineItem.delivery_schedule
        ? parseSchedule(lineItem.delivery_schedule)
        : dayjs()
      if (scheduleData > dayjs().add(product.rule.leadDays, 'day')) return null

      const skus: { sku: string; quantity: number }[] = JSON.parse(
        lineItem.sku_quantity ?? '[]'
      ) // TODO: variant -> calc sku
      const variant = product.variants.find(
        ({ variantId }) =>
          variantId === variantIdStripPrefix(lineItem.variant_id ?? '')
      )
      if (!variant)
        throw new Error(
          `Not exist or not fetchable variant data: ${lineItem.variant_id} (product: ${product.id})`
        )
      return skus.map<OperatedLineItemRecord>(({ sku, quantity }) => ({
        ...lineItem,
        id: lineItem.line_item_id,
        sku,
        quantity: quantity * lineItem.quantity,
        operated_at: dayjs().toISOString(),
        delivery_date: scheduleData.format('YYYY-MM-DD')
      }))
    })
    .flat()
    .filter((i): i is OperatedLineItemRecord => Boolean(i))

  await Promise.all(
    Object.values(products).map((product) => {
      const skuOrders = operatedLineItems
        .filter(
          ({ product_id }) => productIdStripPrefix(product_id) === product.id
        )
        .reduce<Record<string, { quantity: number; orders: string[] }>>(
          (res, lineItem) => {
            return {
              ...res,
              [lineItem.sku]: {
                quantity:
                  lineItem.quantity + (res[lineItem.sku]?.quantity ?? 0),
                orders: [
                  ...(res[lineItem.sku]?.orders ?? []),
                  lineItem.order_id
                ]
              }
            }
          },
          {}
        )

      const description = Object.entries(skuOrders)
        .map(
          ([sku, { quantity, orders }]) =>
            `* ${sku} x ${quantity}\n${orders.map(
              (order) =>
                `** https://survaq.myshopify.com/admin/orders/${orderIdStripPrefix(
                  order
                )}\n`
            )}`
        )
        .join('')

      return createIssue({
        fields: {
          project: {
            key: 'STORE'
          },
          issuetype: {
            id: '10001'
          },
          summary: `[発注]${product.productName}`,
          description
        }
      })
    })
  )

  console.log(`operated_line_item records: ${operatedLineItems.length}`)
  await insertRecords(
    'operated_line_items',
    'shopify',
    [
      'id',
      'operated_at',
      'delivery_date',
      'sku',
      'quantity',
      'order_id',
      'product_id',
      'variant_id'
    ],
    operatedLineItems
  )
}

// gid://shopify/Product/12341234 => 12341234
const productIdStripPrefix = (id: string): string => id.slice(22)

// gid://shopify/ProductVariant/12341234 => 12341234
const variantIdStripPrefix = (id: string): string => id.slice(29)

// gid://shopify/Order/12341234 => 12341234
const orderIdStripPrefix = (id: string): string => id.slice(20)

const parseSchedule = (value: string): Dayjs => {
  const [year, month, term] = value.split('-')
  const date = term === 'late' ? 28 : term === 'middle' ? 18 : 8
  return dayjs(`${year}-${month}-${date}`)
}

const makeNotOperatedLineItemQuery = (): string => {
  return sql.format(`
SELECT
  li.order_id,
  li.id AS line_item_id,
  li.delivery_schedule,
  li.sku_quantity,
  li.variant_id,
  li.product_id,
  li.quantity,
  o.created_at AS ordered_at
FROM shopify.line_items li
LEFT JOIN shopify.operated_line_items oli
  ON oli.id = li.id
LEFT JOIN shopify.orders o
  ON li.order_id = o.id
WHERE oli.id IS NULL
  AND o.cancelled_at IS NULL
`)
}

type NotOperatedLineItemQueryRecord = {
  order_id: string
  line_item_id: string
  delivery_schedule: string | null
  sku_quantity: string | null
  variant_id: string | null
  product_id: string
  ordered_at: { value: string }
  quantity: number
}

type OperatedLineItemRecord = {
  id: string
  operated_at: string
  delivery_date: string
  sku: string
  quantity: number
  order_id: string
  product_id: string
  variant_id: string | null
}
