export type SKU = {
  fieldId: string
  skuCode: string
  skuName: string
  active: boolean
}

export type Foundation = {
  fieldId: string
  objectivePrice: number
  closeOn: string
}

export type Rule = {
  fieldId: string
  leadDays: number
}

export type Variant = {
  fieldId: string
  variantId: string
  variantName: string
  itemCount: number
}

export type Product = {
  id: string
  productCode: string
  productName: string
  variants: Array<Variant>
  skus: Array<SKU>
  foundation: Foundation
  rule: Rule
}
