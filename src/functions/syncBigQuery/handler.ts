import * as Shopify from 'shopify-api-node'
import { sleep } from '@libs/sleep'
import {
  getLatestUpdatedAt,
  insertRecords,
  removeDuplicates
} from '@libs/bigquery'
import fetch from 'node-fetch'
import * as dayjs from 'dayjs'

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
          variant_id: item.variant.id,
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

type Paging = {
  cursors: {
    before: string
    after: string
  }
  next?: string
  previous?: string
}

type AdSetInsights = {
  data: {
    impressions: string
    spend: string
    reach: string
    clicks: string
    actions?: { action_type: string; value: string }[]
    action_values?: { action_type: string; value: string }[]
    date_start: string
    date_stop: string
  }[]
  paging: Paging
}

type AdSet = {
  data: { name: string; id: string; insights?: AdSetInsights }[]
  paging: Paging
}

type AdAccount = {
  data: { name: string; id: string; adsets: AdSet }[]
  paging: Paging
}

type Res = {
  owned_ad_accounts: AdAccount
}

export const syncFacebookAdReports = async (): Promise<void> => {
  const res = await Promise.all(
    range(0, 13)
      .map((d) => dayjs().subtract(d, 'day').format('YYYY-MM-DD'))
      .map((inspectDate) => {
        return new Promise((resolve) => {
          getAdReportRecords(inspectDate).then((records) => resolve(records))
        })
      })
  )

  console.log(res.flat())
}

type AdReportRecord = {
  id: string
  account_id: string
  account_name: string
  set_id: string
  set_name: string
  impressions: number
  spend: number
  reach: number
  clicks: number
  conversions: number
  return: number
  date: string
  datetime: string
}

const getAdReportRecords = async (
  inspectDate: string
): Promise<AdReportRecord[]> => {
  const records: AdReportRecord[] = []
  let next = `https://graph.facebook.com/v11.0/${process.env.FACEBOOK_BUSINESS_ACCOUNT_ID}?fields=owned_ad_accounts.limit(5){name,adsets.limit(20){name,insights.time_range({since:'${inspectDate}',until:'${inspectDate}'}){impressions,spend,reach,clicks,action_values,actions}}}&access_token=${process.env.FACEBOOK_GRAPH_API_TOKEN}`
  while (next) {
    const res = await fetch(next).then(
      (res) => res.json() as Promise<Res | AdAccount>
    )
    next =
      'owned_ad_accounts' in res
        ? res.owned_ad_accounts.paging.next
        : res.paging.next
    const adAccount =
      'owned_ad_accounts' in res ? res.owned_ad_accounts.data : res.data

    adAccount.forEach(({ id: accountId, name: accountName, adsets }) => {
      adsets.data.forEach(({ id: setId, name: setName, insights }) => {
        insights?.data.forEach(
          ({
            impressions,
            spend,
            reach,
            clicks,
            actions,
            action_values,
            date_start: date
          }) => {
            records.push({
              id: `${setId}_${date}`,
              account_id: accountId,
              account_name: accountName,
              set_id: setId,
              set_name: setName,
              impressions: Number(impressions),
              spend: Number(spend),
              reach: Number(reach),
              clicks: Number(clicks),
              conversions: Number(
                actions?.find(
                  ({ action_type }) => action_type === 'omni_purchase'
                )?.value || 0
              ),
              return: Number(
                action_values?.find(
                  ({ action_type }) => action_type === 'omni_purchase'
                )?.value || 0
              ),
              date,
              datetime: `${date}T00:00:00`
            })
          }
        )
      })
    })
  }
  return records
}

const range = (start, end) => [...Array(end + 1).keys()].slice(start)
