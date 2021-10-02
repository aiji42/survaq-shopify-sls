import * as Shopify from 'shopify-api-node'
import { sleep } from '@libs/sleep'
import {
  getLatestUpdatedAt,
  insertRecords,
  removeDuplicates
} from '@libs/bigquery'

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME ?? '',
  apiKey: process.env.SHOPIFY_API_KEY ?? '',
  password: process.env.SHOPIFY_API_SECRET_KEY ?? ''
})

type RecordType = Record<string, string | number | boolean | null>

type EdgesNode<T> = {
  edges: {
    node: T
    cursor: string
  }[]
}

type WithPageInfo<T> = T & {
  pageInfo: {
    hasNextPage: boolean
  }
}

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

type ProductNode = {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

export const products = async (): Promise<void> => {
  const query = `updated_at:>'${await getLatestUpdatedAt('products')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let products: RecordType[] = []
  while (hasNext) {
    const data: { products: WithPageInfo<EdgesNode<ProductNode>> } =
      await shopify.graphql(productListQuery(query, cursor))
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

type VariantListNode = {
  id: string
  title: string
  display_name: string
  price: string
  compareAtPrice: string
  taxable: boolean
  available_for_sale: boolean
  product: {
    id: string
  }
  created_at: string
  updated_at: string
}

type VariantRecord = {
  id: string
  title: string
  display_name: string
  price: number
  compare_at_price: number | null
  taxable: boolean
  available_for_sale: boolean
  product_id: string
  created_at: string
  updated_at: string
}

export const variants = async (): Promise<void> => {
  const query = `updated_at:>'${await getLatestUpdatedAt('variants')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let variants: VariantRecord[] = []
  while (hasNext) {
    const data: { productVariants: WithPageInfo<EdgesNode<VariantListNode>> } =
      await shopify.graphql(variantListQuery(query, cursor))
    hasNext = data.productVariants.pageInfo.hasNextPage

    variants = data.productVariants.edges.reduce<VariantRecord[]>(
      (res, { node, cursor: c }) => {
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
      },
      variants
    )
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
        customerJourneySummary {
          firstVisit {
            landingPage
            referrerUrl
            source
            sourceType
            utmParameters {
              source
              medium
              campaign
              content
              term
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

type ShopMoney = {
  shopMoney: {
    amount: number
  }
}

type LineItemNode = {
  id: string
  name: string
  quantity: number
  originalTotalSet: ShopMoney
  variant: {
    id: string
  }
  product: {
    id: string
  }
}

type LineItemRecord = Omit<
  LineItemNode,
  'originalTotalSet' | 'variant' | 'product'
> & {
  order_id: string
  product_id: string
  variant_id: string | null
  original_total_price: number
}

type OrderNode = {
  id: string
  lineItems: EdgesNode<LineItemNode>
  customerJourneySummary?: {
    firstVisit?: {
      landingPage?: string
      referrerUrl?: string
      source?: string
      sourceType?: string
      utmParameters?: {
        source?: string
        medium?: string
        campaign?: string
        content?: string
        term?: string
      }
    }
  }
  totalPriceSet: ShopMoney
  subtotalPriceSet: ShopMoney
  totalTaxSet: ShopMoney
}

type OrderRecord = Omit<
  OrderNode,
  | 'lineItems'
  | 'customerJourneySummary'
  | 'totalPriceSet'
  | 'subtotalPriceSet'
  | 'totalTaxSet'
> & {
  total_price: number
  subtotal_price: number
  total_tax: number
  landing_page: string | null
  referrer_url: string | null
  source: string | null
  source_type: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

export const ordersAndLineItems = async (): Promise<void> => {
  const query = `updated_at:>'${await getLatestUpdatedAt('orders')}'`
  console.log('Graphql query: ', query)
  let hasNext = true
  let cursor: null | string = null
  let orders: OrderRecord[] = []
  let lineItems: LineItemRecord[] = []

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
          'updated_at',
          'landing_page',
          'referrer_url',
          'source',
          'source_type',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_content',
          'utm_term'
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
    const data: { orders: WithPageInfo<EdgesNode<OrderNode>> } =
      await shopify.graphql(orderListQuery(query, cursor))
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
      const visit = node.customerJourneySummary?.firstVisit
      const utmSource = decode(visit?.utmParameters?.source)
      return [
        ...res,
        {
          ...node,
          total_price: Number(node.totalPriceSet.shopMoney.amount),
          subtotal_price: Number(node.subtotalPriceSet.shopMoney.amount),
          total_tax: Number(node.totalTaxSet.shopMoney.amount),
          landing_page: visit?.landingPage ?? null,
          referrer_url: visit?.referrerUrl ?? null,
          source:
            (visit?.source === 'an unknown source'
              ? utmSource
              : visit?.source) ?? null,
          source_type: visit?.sourceType ?? null,
          utm_source: utmSource ?? null,
          utm_medium: decode(visit?.utmParameters?.medium) ?? null,
          utm_campaign: decode(visit?.utmParameters?.campaign) ?? null,
          utm_content: decode(visit?.utmParameters?.content) ?? null,
          utm_term: decode(visit?.utmParameters?.term) ?? null
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

const decode = (src: string | null | undefined): string | null | undefined => {
  if (typeof src !== 'string') return src
  try {
    return decodeURI(src)
  } catch (_) {
    return src
  }
}
