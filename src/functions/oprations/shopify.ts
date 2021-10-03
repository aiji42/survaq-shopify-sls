import * as dayjs from 'dayjs'
import * as sql from 'sqlstring'
import { client as bigQueryClient, insertRecords } from '@libs/bigquery'
import { cmsClient } from '@libs/microCms'
import { Product } from '@functions/getProductData/v2/product'

type Dayjs = dayjs.Dayjs

export const ordersAndLineItems = async (): Promise<void> => {
  const [bqRes]: [NotOperatedLineItemQueryRecord[], unknown] =
    await bigQueryClient.query({
      query: makeNotOperatedLineItemQuery()
    })
  const productIds = [...new Set(bqRes.map(({ product_id }) => product_id))]
  const cmsRes = await Promise.all(
    productIds.map((id) =>
      cmsClient.get<Product>({
        endpoint: 'products',
        contentId: id
      })
    )
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
      const product = products[lineItem.product_id]
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
        ({ variantId }) => variantId === lineItem.variant_id
      )
      if (!variant)
        throw new Error(
          `Not exist or not fetchable variant data: ${lineItem.variant_id} (product: ${product.id})`
        )
      return skus.map<OperatedLineItemRecord>(({ sku, quantity }) => ({
        ...lineItem,
        id: lineItem.line_item_id,
        sku,
        quantity: quantity * variant.itemCount,
        operated_at: dayjs().toISOString(),
        delivery_date: scheduleData.format('YYYY-MM-DD')
      }))
    })
    .flat()
    .filter((i): i is OperatedLineItemRecord => Boolean(i))

  // TODO create jira story
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

const parseSchedule = (value: string): Dayjs => {
  const [year, month, term] = value.split('-')
  const date = term === 'late' ? 28 : term === 'middle' ? 18 : 8
  return dayjs(`${year}-${month}-${date}`)
}

const makeNotOperatedLineItemQuery = (): string => {
  return sql.format(`
SELECT
  li.order_id
  li.id AS line_item_id
  li.delivery_schedule,
  li.sku_quantity,
  li.variant_id,
  li.product_id,
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
