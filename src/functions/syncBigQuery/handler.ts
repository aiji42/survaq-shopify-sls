import {middyfy} from "@libs/lambda";

const orders = async () => {
  console.log('test')
}

export const main = middyfy(orders)