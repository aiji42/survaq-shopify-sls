import fetch from 'node-fetch'
import * as dayjs from 'dayjs'

type Paging = {
  cursors: {
    before: string
    after: string
  }
  next?: string
  previous?: string
}

type AdSetInsights = {
  data: {
    impressions: string
    spend: string
    reach: string
    clicks: string
    actions?: { action_type: string; value: string }[]
    action_values?: { action_type: string; value: string }[]
    date_start: string
    date_stop: string
  }[]
  paging: Paging
}

type AdSet = {
  data: { name: string; id: string; insights?: AdSetInsights }[]
  paging: Paging
}

type AdAccount = {
  data: { name: string; id: string; adsets: AdSet }[]
  paging: Paging
}

type Res = {
  owned_ad_accounts: AdAccount
}

export const syncAdReports = async (): Promise<void> => {
  const res = await Promise.all(
    range(0, 13)
      .map((d) => dayjs().subtract(d, 'day').format('YYYY-MM-DD'))
      .map((inspectDate) => {
        return new Promise((resolve) => {
          getAdReportRecords(inspectDate).then((records) => resolve(records))
        })
      })
  )

  console.log(res.flat())
}

type AdReportRecord = {
  id: string
  account_id: string
  account_name: string
  set_id: string
  set_name: string
  impressions: number
  spend: number
  reach: number
  clicks: number
  conversions: number
  return: number
  date: string
  datetime: string
}

const getAdReportRecords = async (
  inspectDate: string
): Promise<AdReportRecord[]> => {
  const records: AdReportRecord[] = []
  let next = `https://graph.facebook.com/v11.0/${process.env.FACEBOOK_BUSINESS_ACCOUNT_ID}?fields=owned_ad_accounts.limit(5){name,adsets.limit(20){name,insights.time_range({since:'${inspectDate}',until:'${inspectDate}'}){impressions,spend,reach,clicks,action_values,actions}}}&access_token=${process.env.FACEBOOK_GRAPH_API_TOKEN}`
  while (next) {
    const res = await fetch(next).then(
      (res) => res.json() as Promise<Res | AdAccount>
    )
    next =
      'owned_ad_accounts' in res
        ? res.owned_ad_accounts.paging.next
        : res.paging.next
    const adAccount =
      'owned_ad_accounts' in res ? res.owned_ad_accounts.data : res.data

    adAccount.forEach(({ id: accountId, name: accountName, adsets }) => {
      adsets.data.forEach(({ id: setId, name: setName, insights }) => {
        insights?.data.forEach(
          ({
            impressions,
            spend,
            reach,
            clicks,
            actions,
            action_values,
            date_start: date
          }) => {
            records.push({
              id: `${setId}_${date}`,
              account_id: accountId,
              account_name: accountName,
              set_id: setId,
              set_name: setName,
              impressions: Number(impressions),
              spend: Number(spend),
              reach: Number(reach),
              clicks: Number(clicks),
              conversions: Number(
                actions?.find(
                  ({ action_type }) => action_type === 'omni_purchase'
                )?.value || 0
              ),
              return: Number(
                action_values?.find(
                  ({ action_type }) => action_type === 'omni_purchase'
                )?.value || 0
              ),
              date,
              datetime: `${date}T00:00:00`
            })
          }
        )
      })
    })
  }
  return records
}

const range = (start, end) => [...Array(end + 1).keys()].slice(start)
