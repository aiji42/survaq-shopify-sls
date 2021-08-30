import * as Shopify from 'shopify-api-node'
import { sleep } from '@libs/sleep'
import {
  getLatestUpdatedAt,
  insertRecords,
  removeDuplicates
} from '@libs/bigquery'

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_SECRET_KEY
})

const productListQuery = (query: string, cursor: null | string) => `{
  products(first: 50, query: "${query}" after: ${
  cursor ? `"${cursor}"` : 'null'
}) {
    edges {
      node {
        id
        title
        status
        created_at: createdAt
        updated_at: updatedAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`

export const products = async (): Promise<void> => {
  const query = `updated_at:>'${await getLatestUpdatedAt('products')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let products = []
  while (hasNext) {
    const data = await shopify.graphql(productListQuery(query, cursor))
    hasNext = data.products.pageInfo.hasNextPage

    products = data.products.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      return [...res, node]
    }, products)
    if (hasNext) await sleep(1000)
  }

  console.log('products records:', products.length)
  if (products.length > 0)
    await insertRecords(
      'products',
      'shopify',
      ['id', 'title', 'status', 'created_at', 'updated_at'],
      products
    )
  await removeDuplicates('products')
}

const variantListQuery = (query: string, cursor: null | string) => `{
  productVariants(first: 50, query: "${query}", after: ${
  cursor ? `"${cursor}"` : 'null'
}) {
    edges {
      node {
        id
        title
        display_name: displayName
        price
        compareAtPrice
        taxable
        available_for_sale: availableForSale
        product {
          id
        }
        created_at: createdAt
        updated_at: updatedAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
    }
  }
}`

export const variants = async (): Promise<void> => {
  const query = `updated_at:>'${await getLatestUpdatedAt('variants')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let variants = []
  while (hasNext) {
    const data = await shopify.graphql(variantListQuery(query, cursor))
    hasNext = data.productVariants.pageInfo.hasNextPage

    variants = data.productVariants.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      return [
        ...res,
        {
          ...node,
          product_id: node.product.id,
          price: Number(node.price),
          compare_at_price: node.compareAtPrice
            ? Number(node.compareAtPrice)
            : null
        }
      ]
    }, variants)
    if (hasNext) await sleep(1000)
  }

  console.log('variants records:', variants.length)
  if (variants.length > 0)
    await insertRecords(
      'variants',
      'shopify',
      [
        'id',
        'product_id',
        'title',
        'display_name',
        'price',
        'compare_at_price',
        'taxable',
        'available_for_sale',
        'created_at',
        'updated_at'
      ],
      variants
    )
  await removeDuplicates('variants')
}

const orderListQuery = (query: string, cursor: null | string) => `{
  orders(first: 10, query: "${query}" after: ${
  cursor ? `"${cursor}"` : 'null'
}) {
    edges {
      node {
        id
        name
        display_financial_status: displayFinancialStatus
        display_fulfillment_status: displayFulfillmentStatus
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
        taxes_included: taxesIncluded
        subtotal_line_item_quantity: subtotalLineItemsQuantity
        closed_at: closedAt
        cancelled_at: cancelledAt
        created_at: createdAt
        updated_at: updatedAt
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
  const query = `updated_at:>'${await getLatestUpdatedAt('orders')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let orders = []
  let lineItems = []

  const insert = () => {
    console.log(
      'orders records:',
      orders.length,
      'line_items records:',
      lineItems.length
    )
    return Promise.all([
      insertRecords(
        'orders',
        'shopify',
        [
          'id',
          'name',
          'display_financial_status',
          'display_fulfillment_status',
          'closed',
          'total_price',
          'subtotal_price',
          'total_tax',
          'taxes_included',
          'subtotal_line_item_quantity',
          'closed_at',
          'cancelled_at',
          'created_at',
          'updated_at'
        ],
        orders
      ),
      insertRecords(
        'line_items',
        'shopify',
        [
          'id',
          'name',
          'order_id',
          'variant_id',
          'product_id',
          'quantity',
          'original_total_price'
        ],
        lineItems
      )
    ])
  }

  while (hasNext) {
    const data = await shopify.graphql(orderListQuery(query, cursor))
    hasNext = data.orders.pageInfo.hasNextPage

    orders = data.orders.edges.reduce((res, { node, cursor: c }) => {
      cursor = c
      lineItems = [
        ...lineItems,
        ...node.lineItems.edges.map(({ node: item }) => ({
          ...item,
          order_id: node.id,
          product_id: item.product.id,
          variant_id: item.variant?.id ?? null,
          original_total_price: Number(item.originalTotalSet.shopMoney.amount)
        }))
      ]
      return [
        ...res,
        {
          ...node,
          total_price: Number(node.totalPriceSet.shopMoney.amount),
          subtotal_price: Number(node.subtotalPriceSet.shopMoney.amount),
          total_tax: Number(node.totalTaxSet.shopMoney.amount)
        }
      ]
    }, orders)
    if (hasNext) await sleep(1000)
    if (orders.length > 99) {
      await insert()
      orders = []
      lineItems = []
    }
  }

  console.log(
    'orders records:',
    orders.length,
    'line_items records:',
    lineItems.length
  )
  if (orders.length > 0) await insert()
  await Promise.all([
    removeDuplicates('orders'),
    removeDuplicates('line_items')
  ])
}
