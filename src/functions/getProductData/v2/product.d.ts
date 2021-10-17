export type Foundation = {
  fieldId: string
  objectivePrice: number
  totalPrice: number
  closeOn: string
  supporter?: number
}

export type Rule = {
  fieldId: string
  leadDays: number
  bulkPurchase: number
  cyclePurchase: {
    value: 'monthly' | 'triple'
    label: string
  }
  customSchedules: Array<{
    beginOn: string
    endOn: string
    deliverySchedule: string
    purchaseSchedule: string
  }>
}

export type Variant = {
  fieldId: string
  variantId: string
  variantName: string
  skus: { code: string; name: string; subName: string }[]
  skuSelectable: number
}

export type Product = {
  id: string
  productCode: string
  productName: string
  variants: Array<Variant>
  skuLabel?: string
  foundation: Foundation
  rule: Rule
}
