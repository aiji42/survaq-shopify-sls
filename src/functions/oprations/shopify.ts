import * as dayjs from 'dayjs'
import * as sql from 'sqlstring'
import { client as bigQueryClient, insertRecords } from '@libs/bigquery'
import { cmsClient } from '@libs/microCms'
import { Product } from '@functions/getProductData/v2/product'
import { createIssue } from '@libs/jira'
import {
  orderIdStripPrefix,
  productIdStripPrefix,
  variantIdStripPrefix
} from '@libs/shopify'

type Dayjs = dayjs.Dayjs

export const ordersAndLineItems = async (): Promise<void> => {
  const [bqRes]: [NotOperatedLineItemQueryRecord[], unknown] =
    await bigQueryClient.query({
      query: makeNotOperatedLineItemQuery()
    })
  const productIds = [...new Set(bqRes.map(({ product_id }) => product_id))]
  const cmsRes = await Promise.all(
    productIds.map((id) =>
      cmsClient
        .get<Product>({
          endpoint: 'products',
          contentId: productIdStripPrefix(id)
        })
        .catch(console.log)
    )
  )
  const { contents: cmsSKUs } = await cmsClient.get<{
    contents: Product['variants'][number]['skus']
  }>({
    endpoint: 'skus',
    queries: { limit: 100 }
  })
  const products = cmsRes
    .filter((r): r is Product => Boolean(r))
    .reduce<Record<string, Product>>(
      (res, product) => ({
        ...res,
        [product.id]: product
      }),
      {}
    )

  const operatedLineItems = bqRes
    .map((lineItem) => {
      const product = products[productIdStripPrefix(lineItem.product_id)]
      if (!product) return null

      const scheduleData = lineItem.delivery_schedule
        ? parseSchedule(lineItem.delivery_schedule)
        : dayjs()
      if (scheduleData > dayjs().add(product.rule.leadDays, 'day')) return null

      const skus: string[] = JSON.parse(
        (lineItem.skus === '[]' ? '["unknown"]' : lineItem.skus) ??
          '["unknown"]'
      )
      const variant = product.variants.find(
        ({ variantId }) =>
          variantId === variantIdStripPrefix(lineItem.variant_id ?? '')
      )
      if (!variant)
        throw new Error(
          `Not exist or not fetchable variant data: ${lineItem.variant_id} (product: ${product.id})`
        )
      return skus.map<OperatedLineItemRecord>((sku) => ({
        ...lineItem,
        id: lineItem.line_item_id,
        sku,
        operated_at: dayjs().toISOString(),
        delivery_date:
          lineItem.delivery_schedule === 'unknown'
            ? '1999-12-31'
            : scheduleData.format('YYYY-MM-DD')
      }))
    })
    .flat()
    .filter((i): i is OperatedLineItemRecord => Boolean(i))

  await Promise.all(
    Object.values(products).map((product) => {
      const filteredOperatedLineItems = operatedLineItems.filter(
        ({ product_id }) => productIdStripPrefix(product_id) === product.id
      )
      if (filteredOperatedLineItems.length < 1) return

      const skuOrders = filteredOperatedLineItems.reduce<
        Record<
          string,
          {
            quantity: number
            orders: Record<
              OperatedLineItemRecord['order_id'],
              OperatedLineItemRecord & { totalQuantity: number }
            >
          }
        >
      >((res, lineItem) => {
        return {
          ...res,
          [lineItem.sku]: {
            quantity: lineItem.quantity + (res[lineItem.sku]?.quantity ?? 0),
            orders: {
              ...res[lineItem.sku]?.orders,
              [lineItem.order_id]: {
                ...lineItem,
                totalQuantity:
                  (res[lineItem.sku]?.orders[lineItem.order_id]
                    ?.totalQuantity ?? 0) + lineItem.quantity
              }
            }
          }
        }
      }, {})

      const total = filteredOperatedLineItems.reduce(
        (res, { quantity }) => quantity + res,
        0
      )
      let description = 'h3. サマリ\n'
      description += `*商品*: ${product.productName}\n`
      description += `*合計発注数*: ${total}\n`
      description += `リード日数: ${product.rule.leadDays}日\n`
      description += `一括発注数: ${product.rule.bulkPurchase}\n`

      const sortedSkuOrders = Object.entries(skuOrders).sort(([a], [b]) =>
        a.toLowerCase() > b.toLowerCase() ? -1 : 1
      )

      description += sortedSkuOrders
        .map(([skuCode, { quantity }]) => {
          const sku = cmsSKUs.find(({ code }) => code === skuCode)

          return `* SKU: ${sku?.subName ?? '-'} ${
            sku?.name ?? '-'
          } (${skuCode}) ${quantity}個\n`
        })
        .join('')

      description += '\n---\n\n'
      description += 'h3. 詳細\n'
      description += sortedSkuOrders
        .map(([skuCode, { quantity, orders }]) => {
          const sku = cmsSKUs.find(({ code }) => code === skuCode)

          return `* SKU: ${sku?.subName ?? '-'} ${
            sku?.name ?? '-'
          } (${skuCode}) ${quantity}個\n${Object.values(orders)
            .map(
              (order) =>
                `** ${
                  order.order_name
                } https://survaq.myshopify.com/admin/orders/${orderIdStripPrefix(
                  order.order_id
                )} ${order.totalQuantity}個 配送:${
                  order.delivery_date === '1999-12-31'
                    ? 'unknown'
                    : order.delivery_date
                }\n`
            )
            .join('')}`
        })
        .join('')

      return createIssue({
        fields: {
          project: {
            key: 'STORE'
          },
          issuetype: {
            id: '10001'
          },
          summary: `[発注][${dayjs().format('YYYY-MM-DD')}]${
            product.productName
          }`,
          description,
          assignee: {
            id: '61599038c7bea400691bd755'
          }
        }
      })
    })
  )

  console.log(`operated_line_item records: ${operatedLineItems.length}`)
  if (operatedLineItems.length < 1) return
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
  li.skus,
  li.variant_id,
  li.product_id,
  li.quantity,
  o.created_at AS ordered_at,
  o.name AS order_name
FROM shopify.line_items li
LEFT JOIN shopify.operated_line_items oli
  ON oli.id = li.id
LEFT JOIN shopify.orders o
  ON li.order_id = o.id
WHERE oli.id IS NULL
  AND o.cancelled_at IS NULL
  AND o.display_fulfillment_status = 'UNFULFILLED'
  AND o.closed_at IS NULL
  AND o.cancelled_at IS NULL
  AND o.created_at >= '2021-09-21 00:00:00'
  AND li.delivery_schedule IS NOT NULL
`)
}

type NotOperatedLineItemQueryRecord = {
  order_id: string
  line_item_id: string
  delivery_schedule: string | null
  skus: string | null
  variant_id: string | null
  product_id: string
  quantity: number
  ordered_at: { value: string }
  order_name: string
}

type OperatedLineItemRecord = {
  id: string
  operated_at: string
  order_name: string
  delivery_date: string
  sku: string
  quantity: number
  order_id: string
  product_id: string
  variant_id: string | null
}
