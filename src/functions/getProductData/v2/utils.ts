import { Rule } from '@functions/getProductData/v2/product'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

export type Schedule = {
  year: number
  month: number
  term: 'early' | 'middle' | 'late'
  text: string
  subText: string
}

export const makeSchedule = (
  leadDays: number,
  cycle: Rule['cyclePurchase']['value']
): Schedule => {
  const date = dayjs().tz().add(leadDays, 'day')
  let year = date.year()
  const day = date.date()
  let month = date.month() + 1 + (28 <= day ? 1 : 0)
  if (month > 12) {
    month = 1
    year = year + 1
  }
  const dayOfMonth = dayjs(new Date(year, month - 1, day)).daysInMonth()

  if (cycle === 'triple') {
    const [term, termText, beginDate, endDate]: [
      Schedule['term'],
      string,
      number,
      number
    ] =
      28 <= day || day <= 7
        ? ['early', '上旬', 1, 10]
        : 8 <= day && day <= 17
        ? ['middle', '中旬', 11, 20]
        : ['late', '下旬', 21, dayOfMonth]
    return {
      year,
      month: month,
      term,
      text: `${year}年${month}月${termText}`,
      subText: `${month}/${beginDate}〜${month}/${endDate}`
    }
  }

  return {
    year,
    month,
    term: 'late',
    text: `${year}年${month}月下旬`,
    subText: `${month}/${21}〜${month}/${dayOfMonth}`
  }
}
