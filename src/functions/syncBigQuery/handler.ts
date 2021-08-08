import * as Shopify from 'shopify-api-node'
import { BigQuery } from '@google-cloud/bigquery'
import * as sql from 'sqlstring'

const credentials = JSON.parse(
  process.env.BIGQUERY_CREDENTIALS ??
    '{"client_email":"","private_key":"","project_id":""}'
) as { client_email: string; private_key: string; project_id: '' }

const client = new BigQuery({ credentials, projectId: credentials.project_id })

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_SECRET_KEY
})

const productListQuery = (cursor: null | string) => `{
  products(first: 50, after: ${cursor ? `"${cursor}"` : 'null'}) {
    edges {
      node {
        id
        title
        status
        createdAt
        updatedAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`

export const products = async (): Promise<void> => {
  let hasNext = true
  let cursor: null | string = null
  let products = []
  while (hasNext) {
    const data = await shopify.graphql(productListQuery(cursor))
    hasNext = data.products.pageInfo.hasNextPage

    products = data.products.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      return [...res, node]
    }, products)
  }

  await client.query({ query: makeProductsQuery(products) })
  await client.query({ query: makeRemoveDuplicateRecordQuery('products') })
}

const makeProductsQuery = (data) => {
  return sql.format(
    `
    INSERT INTO shopify.products (
      id,
      title,
      status,
      created_at,
      updated_at
    )
    VALUES ?
    `,
    [
      data.map((record) => [
        record.id,
        record.title,
        record.status,
        record.createdAt,
        record.updatedAt
      ])
    ]
  )
}

const variantListQuery = (cursor: null | string) => `{
  productVariants(first: 50, after: ${cursor ? `"${cursor}"` : 'null'}) {
    edges {
      node {
        id
        title
        displayName
        price
        compareAtPrice
        taxable
        availableForSale
        product {
          id
        }
        createdAt
        updatedAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`

export const variants = async (): Promise<void> => {
  let hasNext = true
  let cursor: null | string = null
  let variants = []
  while (hasNext) {
    const data = await shopify.graphql(variantListQuery(cursor))
    hasNext = data.productVariants.pageInfo.hasNextPage

    variants = data.productVariants.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      return [...res, node]
    }, variants)
  }

  await client.query({
    query: makeVariantsQuery(variants)
  })
  await client.query({
    query: makeRemoveDuplicateRecordQuery('shopify.variants')
  })
}

const makeVariantsQuery = (data) => {
  return sql.format(
    `
    INSERT INTO shopify.variants (
      id,
      product_id,
      title,
      display_name,
      price,
      compare_at_price,
      taxable,
      available_for_sale,
      created_at,
      updated_at
    )
    VALUES ?
    `,
    [
      data.map((record) => [
        record.id,
        record.product.id,
        record.title,
        record.displayName,
        Number(record.price),
        record.compareAtPrice ? Number(record.compareAtPrice) : null,
        record.taxable,
        record.availableForSale,
        record.createdAt,
        record.updatedAt
      ])
    ]
  )
}

const makeRemoveDuplicateRecordQuery = (table) => {
  return sql.format(
    `
    CREATE TEMPORARY TABLE ${table}_tmp AS
    SELECT * FROM(
      SELECT *, COUNT(id)over (PARTITION BY id ORDER BY id ROWS 3 PRECEDING) as count FROM  \`shopify.${table}\`
    ) where count = 1;
    DELETE FROM \`shopify.${table}\` where true;
    INSERT INTO \`shopify.${table}\` select * EXCEPT(count) FROM ${table}_tmp;
    DROP TABLE ${table}_tmp;
    `
  )
}

const orderListQuery = (cursor: null | string) => `{
  orders(first: 10, query: "updated_at:>2021-08-08T00:00:00" after: ${
    cursor ? `"${cursor}"` : 'null'
  }) {
    edges {
      node {
        id
        name
        displayFinancialStatus
        displayFulfillmentStatus
        closed
        totalPriceSet {
          shopMoney {
            amount
          }
        }
        subtotalPriceSet {
          shopMoney {
            amount
          }
        }
        totalTaxSet {
          shopMoney {
            amount
          }
        }
        taxesIncluded
        subtotalLineItemsQuantity
        closedAt
        cancelledAt
        createdAt
        updatedAt
        lineItems(first: 10) {
          edges {
            node {
              id
              name
              quantity
              originalTotalSet {
                shopMoney {
                  amount
                }
              }
              variant {
                id
              }
              product {
                id
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
  let hasNext = true
  let cursor: null | string = null
  let orders = []
  let lineItems = []
  while (hasNext) {
    const data = await shopify.graphql(orderListQuery(cursor))
    hasNext = data.orders.pageInfo.hasNextPage

    orders = data.orders.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      lineItems = [
        ...lineItems,
        ...node.lineItems.edges.map(({ node: item }) => ({
          ...item,
          orderId: node.id
        }))
      ]
      return [...res, node]
    }, orders)
  }

  await client.query({ query: makeOrdersQuery(orders) })
  await client.query({ query: makeLineItemsQuery(lineItems) })
}

const makeOrdersQuery = (data) => {
  return sql.format(
    `
    INSERT INTO shopify.orders (
      id,
      name,
      display_financial_status,
      display_fulfillment_status,
      closed,
      total_price,
      subtotal_price,
      total_tax,
      taxes_included,
      subtotal_line_item_quantity,
      closed_at,
      cancelled_at,
      created_at,
      updated_at
    )
    VALUES ?
    `,
    [
      data.map((record) => [
        record.id,
        record.name,
        record.displayFinancialStatus,
        record.displayFulfillmentStatus,
        record.closed,
        Number(record.totalPriceSet.shopMoney.amount),
        Number(record.subtotalPriceSet.shopMoney.amount),
        Number(record.totalTaxSet.shopMoney.amount),
        record.taxesIncluded,
        record.subtotalLineItemsQuantity,
        record.closedAt,
        record.cancelledAt,
        record.createdAt,
        record.updatedAt
      ])
    ]
  )
}

const makeLineItemsQuery = (data) => {
  return sql.format(
    `
    INSERT INTO shopify.line_items (
      id,
      name,
      order_id,
      variant_id,
      product_id,
      quantity,
      original_total_price
    )
    VALUES ?
    `,
    [
      data.map((record) => [
        record.id,
        record.name,
        record.orderId,
        record.variant.id,
        record.product.id,
        record.quantity,
        Number(record.originalTotalSet.shopMoney.amount)
      ])
    ]
  )
}
