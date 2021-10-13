import { Product, Variant } from '@functions/getProductData/v2/product'
import { orderIdStripPrefix, productIdStripPrefix } from '@libs/shopify'
import dayjs from 'dayjs'
import { Issue } from '@libs/jira'

type Dayjs = dayjs.Dayjs

export type NotOperatedLineItemQueryRecord = {
  order_id: string
  line_item_id: string
  delivery_schedule: string
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

const parseSchedule = (value: string): Dayjs => {
  const [year, month, term] = value.split('-')
  const date = term === 'late' ? 28 : term === 'middle' ? 18 : 8
  return dayjs(`${year}-${month}-${date}`)
}

export const operatedLineItemsBySchedule = (
  records: NotOperatedLineItemQueryRecord[],
  products: Record<string, Product>
): OperatedLineItemRecord[] =>
  records
    .map((lineItem) => {
      const product = products[productIdStripPrefix(lineItem.product_id)]
      if (!product) return null

      const scheduleData = parseSchedule(lineItem.delivery_schedule)
      if (scheduleData > dayjs().add(product.rule.leadDays, 'day')) return null

      const skus: string[] = JSON.parse(
        (lineItem.skus === '[]' ? '["unknown"]' : lineItem.skus) ??
          '["unknown"]'
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

export const operatedLineItemsByBulkPurchase = (
  records: NotOperatedLineItemQueryRecord[],
  products: Record<string, Product>
): OperatedLineItemRecord[] => {
  const groupByProduct = records.reduce<
    Record<string, NotOperatedLineItemQueryRecord[]>
  >((res, lineItem) => {
    return {
      ...res,
      [lineItem.product_id]: [...(res[lineItem.product_id] ?? []), lineItem]
    }
  }, {})

  return Object.entries(groupByProduct)
    .filter(([productId, lineItems]) => {
      const product = products[productIdStripPrefix(productId)]
      if (!product) return false

      // return lineItems.length > product.rule.bulkPurchase
      return lineItems.length > 5
    })
    .map(([, lineItems]) => lineItems)
    .flat()
    .map((lineItem) => {
      const skus: string[] = JSON.parse(
        (lineItem.skus === '[]' ? '["unknown"]' : lineItem.skus) ??
          '["unknown"]'
      )
      const scheduleData = parseSchedule(lineItem.delivery_schedule)
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
}

export const makeJiraIssue = (
  records: OperatedLineItemRecord[],
  product: Product,
  SKUs: Variant['skus'],
  bulk = false
): Issue => {
  const skuOrders = records.reduce<
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
              (res[lineItem.sku]?.orders[lineItem.order_id]?.totalQuantity ??
                0) + lineItem.quantity
          }
        }
      }
    }
  }, {})

  const total = records.reduce((res, { quantity }) => quantity + res, 0)
  let description = 'h3. サマリ\n'
  description += `*こちらは一括発注数を超えたために発生したタスクです。*\n`
  description += `*商品*: ${product.productName}\n`
  description += `*合計発注数*: ${total}\n`
  description += `リード日数: ${product.rule.leadDays}日\n`
  description += `一括発注数: ${product.rule.bulkPurchase}\n`

  const sortedSkuOrders = Object.entries(skuOrders).sort(([a], [b]) =>
    a.toLowerCase() > b.toLowerCase() ? -1 : 1
  )

  description += sortedSkuOrders
    .map(([skuCode, { quantity }]) => {
      const sku = SKUs.find(({ code }) => code === skuCode)

      return `* SKU: ${sku?.subName ?? '-'} ${
        sku?.name ?? '-'
      } (${skuCode}) ${quantity}個\n`
    })
    .join('')

  description += '\n---\n\n'
  description += 'h3. 詳細\n'
  description += sortedSkuOrders
    .map(([skuCode, { quantity, orders }]) => {
      const sku = SKUs.find(({ code }) => code === skuCode)

      return `* SKU: ${sku?.subName ?? '-'} ${
        sku?.name ?? '-'
      } (${skuCode}) ${quantity}個\n${Object.values(orders)
        .sort(({ order_name: a }, { order_name: b }) =>
          a.toLowerCase() < b.toLowerCase() ? -1 : 1
        )
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

  return {
    fields: {
      project: {
        key: 'STORE'
      },
      issuetype: {
        id: '10001'
      },
      summary: `[発注][${dayjs().format('YYYY-MM-DD')}]${
        bulk ? '[一括発注数超]' : ''
      }${product.productName}`,
      description,
      assignee: {
        id: '61599038c7bea400691bd755'
      }
    }
  }
}
