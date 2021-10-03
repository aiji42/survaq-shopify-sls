import { createClient } from 'microcms-js-sdk'

export const cmsClient = createClient({
  serviceDomain: 'survaq-shopify',
  apiKey: process.env.MICROCMS_API_TOKEN ?? ''
})
