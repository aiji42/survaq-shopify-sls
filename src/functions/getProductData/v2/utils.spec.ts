import { makeSchedule } from './utils'
import MockDate from 'mockdate'

describe('makeSchedule', () => {
  beforeEach(() => {
    MockDate.reset()
  })
  describe('monthly cycle', () => {
    test('leadDays + today < 28', () => {
      MockDate.set(new Date('2021-10-16T15:00:00.000Z'))
      const schedule = makeSchedule(10, 'monthly', [])
      expect(schedule).toEqual({
        year: 2021,
        month: 10,
        text: `2021年10月下旬`,
        texts: [
          '2021年10月下旬',
          '2021年10月中旬',
          '2021年10月上旬',
          '2021年9月下旬'
        ],
        subText: `10/21〜10/31`,
        term: 'late'
      })
    })
    test('leadDays + today = 28', () => {
      MockDate.set(new Date('2021-10-17T15:00:00.000Z'))
      const schedule = makeSchedule(10, 'monthly', [])
      expect(schedule).toEqual({
        year: 2021,
        month: 11,
        text: `2021年11月下旬`,
        texts: [
          '2021年11月下旬',
          '2021年11月中旬',
          '2021年11月上旬',
          '2021年10月下旬'
        ],
        subText: `11/21〜11/30`,
        term: 'late'
      })
    })
    test('leadDays + today > 28', () => {
      MockDate.set(new Date('2021-10-18T15:00:00.000Z'))
      const schedule = makeSchedule(10, 'monthly', [])
      expect(schedule).toEqual({
        year: 2021,
        month: 11,
        text: `2021年11月下旬`,
        texts: [
          '2021年11月下旬',
          '2021年11月中旬',
          '2021年11月上旬',
          '2021年10月下旬'
        ],
        subText: `11/21〜11/30`,
        term: 'late'
      })
    })
    test('end of year', () => {
      MockDate.set(new Date('2021-12-18T15:00:00.000Z'))
      const schedule = makeSchedule(10, 'monthly', [])
      expect(schedule).toEqual({
        year: 2022,
        month: 1,
        text: `2022年1月下旬`,
        texts: [
          '2022年1月下旬',
          '2022年1月中旬',
          '2022年1月上旬',
          '2021年12月下旬'
        ],
        subText: `1/21〜1/31`,
        term: 'late'
      })
    })
  })
  describe('triple cycle', () => {
    describe('middle in month', () => {
      test('leadDays + today = 8', () => {
        MockDate.set(new Date('2021-10-04T15:00:00.000Z'))
        const schedule = makeSchedule(3, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月中旬`,
          texts: [
            '2021年10月中旬',
            '2021年10月上旬',
            '2021年9月下旬',
            '2021年9月中旬'
          ],
          subText: `10/11〜10/20`,
          term: 'middle'
        })
      })
      test('leadDays + today = 17', () => {
        MockDate.set(new Date('2021-10-04T15:00:00.000Z'))
        const schedule = makeSchedule(12, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月中旬`,
          texts: [
            '2021年10月中旬',
            '2021年10月上旬',
            '2021年9月下旬',
            '2021年9月中旬'
          ],
          subText: `10/11〜10/20`,
          term: 'middle'
        })
      })
    })
    describe('late in month', () => {
      test('leadDays + today = 18', () => {
        MockDate.set(new Date('2021-10-14T15:00:00.000Z'))
        const schedule = makeSchedule(3, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月下旬`,
          texts: [
            '2021年10月下旬',
            '2021年10月中旬',
            '2021年10月上旬',
            '2021年9月下旬'
          ],
          subText: `10/21〜10/31`,
          term: 'late'
        })
      })
      test('leadDays + today = 27', () => {
        MockDate.set(new Date('2021-10-14T15:00:00.000Z'))
        const schedule = makeSchedule(12, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月下旬`,
          texts: [
            '2021年10月下旬',
            '2021年10月中旬',
            '2021年10月上旬',
            '2021年9月下旬'
          ],
          subText: `10/21〜10/31`,
          term: 'late'
        })
      })
    })
    describe('early in month', () => {
      test('leadDays + today = 28', () => {
        MockDate.set(new Date('2021-10-14T15:00:00.000Z'))
        const schedule = makeSchedule(13, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 11,
          text: `2021年11月上旬`,
          texts: [
            '2021年11月上旬',
            '2021年10月下旬',
            '2021年10月中旬',
            '2021年10月上旬'
          ],
          subText: `11/1〜11/10`,
          term: 'early'
        })
      })
      test('leadDays + today = 7', () => {
        MockDate.set(new Date('2021-09-26T15:00:00.000Z'))
        const schedule = makeSchedule(10, 'triple', [])
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月上旬`,
          texts: [
            '2021年10月上旬',
            '2021年9月下旬',
            '2021年9月中旬',
            '2021年9月上旬'
          ],
          subText: `10/1〜10/10`,
          term: 'early'
        })
      })
      test('end of year', () => {
        MockDate.set(new Date('2021-12-14T15:00:00.000Z'))
        const schedule = makeSchedule(13, 'triple', [])
        expect(schedule).toEqual({
          year: 2022,
          month: 1,
          text: `2022年1月上旬`,
          texts: [
            '2022年1月上旬',
            '2021年12月下旬',
            '2021年12月中旬',
            '2021年12月上旬'
          ],
          subText: `1/1〜1/10`,
          term: 'early'
        })
      })
    })
  })

  describe('has custom schedules', () => {
    test('within the term (begin)', () => {
      MockDate.set(new Date('2021-11-14T15:00:00.000Z'))
      const schedule = makeSchedule(13, 'triple', [
        {
          beginOn: '2021-11-14T15:00:00.000Z',
          endOn: '2021-11-19T15:00:00.000Z',
          deliverySchedule: '2022-01-late',
          purchaseSchedule: '2021-12-31T15:00:00.000Z'
        }
      ])
      expect(schedule).toEqual({
        year: 2022,
        month: 1,
        text: `2022年1月下旬`,
        texts: [
          '2022年1月下旬',
          '2022年1月中旬',
          '2022年1月上旬',
          '2021年12月下旬'
        ],
        subText: `1/21〜1/31`,
        term: 'late'
      })
    })

    test('within the term (end)', () => {
      MockDate.set(new Date('2021-11-20T14:59:59.000Z'))
      const schedule = makeSchedule(13, 'triple', [
        {
          beginOn: '2021-11-14T15:00:00.000Z',
          endOn: '2021-11-19T15:00:00.000Z',
          deliverySchedule: '2022-01-late',
          purchaseSchedule: '2021-12-31T15:00:00.000Z'
        }
      ])
      expect(schedule).toEqual({
        year: 2022,
        month: 1,
        text: `2022年1月下旬`,
        texts: [
          '2022年1月下旬',
          '2022年1月中旬',
          '2022年1月上旬',
          '2021年12月下旬'
        ],
        subText: `1/21〜1/31`,
        term: 'late'
      })
    })

    test('out of the term', () => {
      MockDate.set(new Date('2021-11-20T15:00:00.000Z'))
      const schedule = makeSchedule(13, 'triple', [
        {
          beginOn: '2021-11-14T15:00:00.000Z',
          endOn: '2021-11-19T15:00:00.000Z',
          deliverySchedule: '2022-01-late',
          purchaseSchedule: '2021-12-31T15:00:00.000Z'
        }
      ])
      expect(schedule).toEqual({
        year: 2021,
        month: 12,
        text: `2021年12月上旬`,
        texts: [
          '2021年12月上旬',
          '2021年11月下旬',
          '2021年11月中旬',
          '2021年11月上旬'
        ],
        subText: `12/1〜12/10`,
        term: 'early'
      })
    })
  })
})
