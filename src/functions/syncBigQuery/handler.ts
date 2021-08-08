import * as Shopify from 'shopify-api-node'

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

  console.log(products)
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

  console.log(variants)
}
