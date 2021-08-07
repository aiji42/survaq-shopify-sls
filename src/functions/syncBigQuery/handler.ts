import { middyfy } from '@libs/lambda'
import * as Shopify from 'shopify-api-node'

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP_NAME,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_API_SECRET_KEY
})

const query = `{
  customers(first: 5) {
    edges {
      node {
        displayName
        totalSpent
      }
    }
  }
}`

const orders = async () => {
  const c = await shopify.graphql(query)
  console.log(c)
}

export const main = middyfy(orders)
