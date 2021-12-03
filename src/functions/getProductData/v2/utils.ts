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
  texts: string[]
}

export const makeSchedule = (
  leadDays: number,
  cycle: Rule['cyclePurchase']['value'],
  customSchedules: Rule['customSchedules']
): Schedule => {
  const customSchedule = customSchedules.find(({ beginOn, endOn }) => {
    return dayjs(beginOn) <= dayjs() && dayjs() < dayjs(endOn).add(1, 'day')
  })
  if (customSchedule) {
    const [year, month, term] = customSchedule.deliverySchedule.split('-')
    return {
      year: Number(year),
      month: Number(month),
      term: term as Schedule['term'],
      text: `${year}年${Number(month)}月${
        term === 'early' ? '上旬' : term === 'middle' ? '中旬' : '下旬'
      }`,
      texts: createScheduleTextArray({
        year,
        month,
        term: term as Schedule['term']
      }),
      subText: `${Number(month)}/${
        term === 'early' ? '1' : term === 'middle' ? '11' : '21'
      }〜${Number(month)}/${
        term === 'early'
          ? '10'
          : term === 'middle'
          ? '20'
          : dayjs(new Date(Number(year), Number(month) - 1, 1)).daysInMonth()
      }`
    }
  }
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
      month,
      term,
      text: `${year}年${month}月${termText}`,
      texts: createScheduleTextArray({ year, month, term }),
      subText: `${month}/${beginDate}〜${month}/${endDate}`
    }
  }

  return {
    year,
    month,
    term: 'late',
    text: `${year}年${month}月下旬`,
    texts: createScheduleTextArray({ year, month }, 'month'),
    subText: `${month}/${21}〜${month}/${dayOfMonth}`
  }
}

const createScheduleTextArray = (
  {
    year,
    month,
    term = 'late'
  }: {
    year: string | number
    month: string | number
    term?: Schedule['term']
  },
  type: 'term' | 'month' = 'term',
  size = 4
): string[] => {
  const begin = dayjs(
    `${year}-${month}-${term === 'late' ? 28 : term === 'middle' ? 18 : 8}`
  )
  return Array.from({ length: size }).map((_, index) => {
    const date = begin.add(
      -1 * index * (type === 'term' ? 10 : 1),
      type === 'month' ? 'months' : 'days'
    )
    return `${date.year()}年${date.month() + 1}月${
      date.date() > 20 ? '下旬' : date.date() > 10 ? '中旬' : '上旬'
    }`
  })
}
