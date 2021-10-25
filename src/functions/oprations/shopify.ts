import sql from 'sqlstring'
import { client as bigQueryClient, insertRecords } from '@libs/bigquery'
import { cmsClient } from '@libs/microCms'
import { Product } from '@functions/getProductData/v2/product'
import { createIssue } from '@libs/jira'
import { productIdStripPrefix } from '@libs/shopify'
import {
  makeJiraIssue,
  NotOperatedLineItemQueryRecord,
  operatedLineItemsByBulkPurchase,
  operatedLineItemsBySchedule
} from '@functions/oprations/utils'
import { MicroCMSDate } from 'microcms-js-sdk'

export const ordersAndLineItems = async (): Promise<void> => {
  const [bqRes]: [NotOperatedLineItemQueryRecord[], unknown] =
    await bigQueryClient.query({
      query: makeNotOperatedLineItemQuery()
    })
  const productIds = [...new Set(bqRes.map(({ product_id }) => product_id))]
  const cmsRes = await Promise.all(
    productIds.map((id) =>
      cmsClient
        .getListDetail<Product>({
          endpoint: 'products',
          contentId: productIdStripPrefix(id)
        })
        .catch((e) => {
          console.log('productId: ', productIdStripPrefix(id))
          console.log(e)
        })
    )
  )
  const { contents: cmsSKUs } = await cmsClient.getList<
    Product['variants'][number]['skus'][number]
  >({
    endpoint: 'skus',
    queries: { limit: 100 }
  })
  const products = cmsRes
    .filter((r): r is Product & MicroCMSDate => Boolean(r))
    .reduce<Record<string, Product>>(
      (res, product) => ({
        ...res,
        [product.id]: product
      }),
      {}
    )

  const operatedLineItems = operatedLineItemsBySchedule(bqRes, products)
  const operatedProductIds = operatedLineItems.map(
    ({ product_id }) => product_id
  )
  const bulkOperatedLineItems = operatedLineItemsByBulkPurchase(
    bqRes.filter(({ product_id }) => !operatedProductIds.includes(product_id)),
    products
  )

  await Promise.all(
    Object.values(products).map((product) => {
      const filteredOperatedLineItems = operatedLineItems.filter(
        ({ product_id }) => productIdStripPrefix(product_id) === product.id
      )
      if (filteredOperatedLineItems.length < 1) return

      const issue = makeJiraIssue(filteredOperatedLineItems, product, cmsSKUs)

      return createIssue(issue)
    })
  )

  await Promise.all(
    Object.values(products).map((product) => {
      const filteredOperatedLineItems = bulkOperatedLineItems.filter(
        ({ product_id }) => productIdStripPrefix(product_id) === product.id
      )
      if (filteredOperatedLineItems.length < 1) return

      const issue = makeJiraIssue(
        filteredOperatedLineItems,
        product,
        cmsSKUs,
        true
      )

      return createIssue(issue)
    })
  )

  console.log(
    `operated_line_item by schedule records: ${operatedLineItems.length}`
  )
  console.log(
    `operated_line_item by bulk records: ${bulkOperatedLineItems.length}`
  )

  if (operatedLineItems.length > 0) {
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
  if (bulkOperatedLineItems.length > 0) {
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
      bulkOperatedLineItems
    )
  }
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
