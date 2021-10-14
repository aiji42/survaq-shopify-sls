import {
  NotOperatedLineItemQueryRecord,
  operatedLineItemsBySchedule,
  operatedLineItemsByBulkPurchase,
  makeJiraIssue
} from '@functions/oprations/utils'
import { Product, Variant } from '@functions/getProductData/v2/product'
import MockDate from 'mockdate'

const cmsProducts: Record<string, Product> = {
  '1': {
    id: '1',
    productName: 'ProductName1',
    rule: {
      leadDays: 10,
      bulkPurchase: 3
    } as Product['rule']
  } as Product,
  '2': {
    id: '2',
    productName: 'ProductName2',
    rule: {
      leadDays: 10,
      bulkPurchase: 3
    } as Product['rule']
  } as Product
}

const SKUs: Variant['skus'] = [
  { code: 'some_sku_1', name: 'SKUName1', subName: 'SKUSubName2' },
  { code: 'some_sku_2', name: 'SKUName1', subName: 'SKUSubName2' },
  { code: 'some_sku_3', name: 'SKUName1', subName: 'SKUSubName2' }
]

describe('utils', () => {
  beforeEach(() => {
    MockDate.reset()
  })
  describe('operatedLineItemsBySchedule', () => {
    test('skus is blank and on schedule', () => {
      MockDate.set(new Date(2021, 9, 18))
      expect(
        operatedLineItemsBySchedule(
          [
            {
              product_id: 'gid://shopify/Product/1',
              skus: '[]',
              line_item_id: '1',
              delivery_schedule: '2021-10-late'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([
        {
          delivery_date: '2021-10-28',
          delivery_schedule: '2021-10-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'unknown',
          skus: '[]'
        }
      ])
    })
    test('delivery_schedule is set "unknown"', () => {
      MockDate.set(new Date(2021, 9, 18))
      expect(
        operatedLineItemsBySchedule(
          [
            {
              product_id: 'gid://shopify/Product/1',
              skus: '[]',
              line_item_id: '1',
              delivery_schedule: 'unknown'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([
        {
          delivery_date: '1999-12-31',
          delivery_schedule: 'unknown',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'unknown',
          skus: '[]'
        }
      ])
    })
    test('skus is set and on schedule', () => {
      MockDate.set(new Date(2021, 9, 18))
      expect(
        operatedLineItemsBySchedule(
          [
            {
              product_id: 'gid://shopify/Product/1',
              skus: '["some_sku_1", "some_sku_2"]',
              line_item_id: '1',
              delivery_schedule: '2021-10-late'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([
        {
          delivery_date: '2021-10-28',
          delivery_schedule: '2021-10-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_1',
          skus: '["some_sku_1", "some_sku_2"]'
        },
        {
          delivery_date: '2021-10-28',
          delivery_schedule: '2021-10-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_2',
          skus: '["some_sku_1", "some_sku_2"]'
        }
      ])
    })
    test('before schedule', () => {
      MockDate.set(new Date(2021, 9, 17))
      expect(
        operatedLineItemsBySchedule(
          [
            {
              product_id: 'gid://shopify/Product/1',
              skus: '["some_sku_1", "some_sku_2"]',
              line_item_id: '1',
              delivery_schedule: '2021-10-late'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([])
    })
    test('not exist project on CMS data', () => {
      MockDate.set(new Date(2021, 9, 18))
      expect(
        operatedLineItemsBySchedule(
          [
            {
              product_id: 'gid://shopify/Product/3',
              skus: '["some_sku_1", "some_sku_2"]',
              line_item_id: '1',
              delivery_schedule: '2021-10-late'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([])
    })
  })

  describe('operatedLineItemsByBulkPurchase', () => {
    test('If the total number of SKUs exceeds the threshold, the records will be returned.', () => {
      MockDate.set(new Date(2021, 9, 18))
      expect(
        operatedLineItemsByBulkPurchase(
          [
            {
              product_id: 'gid://shopify/Product/1',
              skus: '["some_sku_1", "some_sku_2"]',
              line_item_id: '1',
              delivery_schedule: '2021-11-late'
            } as NotOperatedLineItemQueryRecord,
            {
              product_id: 'gid://shopify/Product/1',
              skus: '["some_sku_1"]',
              line_item_id: '2',
              delivery_schedule: '2021-11-late'
            } as NotOperatedLineItemQueryRecord,
            {
              product_id: 'gid://shopify/Product/2',
              skus: '["some_sku_1", "some_sku_2"]',
              line_item_id: '3',
              delivery_schedule: '2021-11-late'
            } as NotOperatedLineItemQueryRecord,
            {
              product_id: 'gid://shopify/Product/3',
              skus: '["some_sku_1", "some_sku_2", "some_sku_3"]',
              line_item_id: '3',
              delivery_schedule: '2021-11-late'
            } as NotOperatedLineItemQueryRecord
          ],
          cmsProducts
        )
      ).toEqual([
        {
          delivery_date: '2021-11-28',
          delivery_schedule: '2021-11-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_1',
          skus: '["some_sku_1", "some_sku_2"]'
        },
        {
          delivery_date: '2021-11-28',
          delivery_schedule: '2021-11-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_2',
          skus: '["some_sku_1", "some_sku_2"]'
        },
        {
          delivery_date: '2021-11-28',
          delivery_schedule: '2021-11-late',
          id: '2',
          line_item_id: '2',
          operated_at: '2021-10-18T00:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_1',
          skus: '["some_sku_1"]'
        }
      ])
    })
  })

  describe('makeJiraIssue', () => {
    MockDate.set(new Date(2021, 9, 14))
    test('scheduled purchase mode', () => {
      expect(
        makeJiraIssue(
          [
            {
              delivery_date: '2021-11-28',
              id: '1',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_1',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/1',
              quantity: 1,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '2021-11-28',
              id: '2',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_1',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/2',
              quantity: 2,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '2021-11-28',
              id: '2',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_2',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/2',
              quantity: 2,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '1999-12-31',
              id: '3',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'unknown',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/3',
              quantity: 1,
              variant_id: 'gid://shopify/Variant/1'
            }
          ],
          cmsProducts['1'],
          SKUs
        )
      ).toEqual({
        fields: {
          assignee: { id: '61599038c7bea400691bd755' },
          issuetype: { id: '10001' },
          project: { key: 'STORE' },
          summary: '[発注][2021-10-14]ProductName1',
          description: `h3. サマリ
*商品*: ProductName1
*合計発注数*: 6
リード日数: 10日
一括発注数: 3
* SKU: - - (unknown) 1個
* SKU: SKUSubName2 SKUName1 (some_sku_2) 2個
* SKU: SKUSubName2 SKUName1 (some_sku_1) 3個

---

h3. 詳細
* SKU: - - (unknown) 1個
** order_name https://survaq.myshopify.com/admin/orders/3 1個 配送:unknown
* SKU: SKUSubName2 SKUName1 (some_sku_2) 2個
** order_name https://survaq.myshopify.com/admin/orders/2 2個 配送:2021-11-28
* SKU: SKUSubName2 SKUName1 (some_sku_1) 3個
** order_name https://survaq.myshopify.com/admin/orders/1 1個 配送:2021-11-28
** order_name https://survaq.myshopify.com/admin/orders/2 2個 配送:2021-11-28
`
        }
      })
    })

    test('bulk purchase mode', () => {
      MockDate.set(new Date(2021, 9, 14))
      expect(
        makeJiraIssue(
          [
            {
              delivery_date: '2021-11-28',
              id: '1',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_1',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/1',
              quantity: 1,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '2021-11-28',
              id: '2',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_1',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/2',
              quantity: 2,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '2021-11-28',
              id: '2',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'some_sku_2',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/2',
              quantity: 2,
              variant_id: 'gid://shopify/Variant/1'
            },
            {
              delivery_date: '1999-12-31',
              id: '3',
              operated_at: '2021-10-18T00:00:00.000Z',
              product_id: 'gid://shopify/Product/1',
              sku: 'unknown',
              order_name: 'order_name',
              order_id: 'gid://shopify/Order/3',
              quantity: 1,
              variant_id: 'gid://shopify/Variant/1'
            }
          ],
          cmsProducts['1'],
          SKUs,
          true
        )
      ).toEqual({
        fields: {
          assignee: { id: '61599038c7bea400691bd755' },
          issuetype: { id: '10001' },
          project: { key: 'STORE' },
          summary: '[発注][2021-10-14][一括発注数超]ProductName1',
          description: `h3. サマリ
*こちらは一括発注数を超えたために発生したタスクです。*
*商品*: ProductName1
*合計発注数*: 6
リード日数: 10日
一括発注数: 3
* SKU: - - (unknown) 1個
* SKU: SKUSubName2 SKUName1 (some_sku_2) 2個
* SKU: SKUSubName2 SKUName1 (some_sku_1) 3個

---

h3. 詳細
* SKU: - - (unknown) 1個
** order_name https://survaq.myshopify.com/admin/orders/3 1個 配送:unknown
* SKU: SKUSubName2 SKUName1 (some_sku_2) 2個
** order_name https://survaq.myshopify.com/admin/orders/2 2個 配送:2021-11-28
* SKU: SKUSubName2 SKUName1 (some_sku_1) 3個
** order_name https://survaq.myshopify.com/admin/orders/1 1個 配送:2021-11-28
** order_name https://survaq.myshopify.com/admin/orders/2 2個 配送:2021-11-28
`
        }
      })
    })
  })
})
