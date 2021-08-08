import * as Shopify from 'shopify-api-node'
import { BigQuery } from '@google-cloud/bigquery'
import sql from 'sqlstring'

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
