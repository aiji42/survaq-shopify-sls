import {handlerPath} from "@libs/handlerResolver";
import { AWS } from '@serverless/typescript';

const func: AWS['functions'][string] = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [{
    schedule: {
      rate: '2 hours'
    }
  }]
}

export default func