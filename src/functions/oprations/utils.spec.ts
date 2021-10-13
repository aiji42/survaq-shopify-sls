import {
  NotOperatedLineItemQueryRecord,
  operatedLineItemsBySchedule
} from '@functions/oprations/utils'
import { Product } from '@functions/getProductData/v2/product'
import MockDate from 'mockdate'

const cmsProducts: Record<string, Product> = {
  '1': {
    id: '1',
    rule: {
      leadDays: 10
    } as Product['rule']
  } as Product
}

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
          operated_at: '2021-10-17T15:00:00.000Z',
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
          operated_at: '2021-10-17T15:00:00.000Z',
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
          operated_at: '2021-10-17T15:00:00.000Z',
          product_id: 'gid://shopify/Product/1',
          sku: 'some_sku_1',
          skus: '["some_sku_1", "some_sku_2"]'
        },
        {
          delivery_date: '2021-10-28',
          delivery_schedule: '2021-10-late',
          id: '1',
          line_item_id: '1',
          operated_at: '2021-10-17T15:00:00.000Z',
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
              product_id: 'gid://shopify/Product/2',
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
})
