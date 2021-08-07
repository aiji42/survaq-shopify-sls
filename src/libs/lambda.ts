import middy from '@middy/core'
import middyJsonBodyParser from '@middy/http-json-body-parser'

export const middyfy = (
  handler: Parameters<typeof middy>[0]
): middy.Middy<unknown, unknown> => {
  return middy(handler).use(middyJsonBodyParser())
}
