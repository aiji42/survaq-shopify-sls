import { makeSchedule } from './utils'
import MockDate from 'mockdate'

describe('makeSchedule', () => {
  beforeEach(() => {
    MockDate.reset()
  })
  describe('monthly cycle', () => {
    test('leadDays + today < 28', () => {
      MockDate.set(new Date(2021, 9, 17))
      const schedule = makeSchedule(10, 'monthly')
      expect(schedule).toEqual({
        year: 2021,
        month: 10,
        text: `2021年10月下旬`,
        subText: `10/21〜10/31`,
        term: 'late'
      })
    })
    test('leadDays + today = 28', () => {
      MockDate.set(new Date(2021, 9, 18))
      const schedule = makeSchedule(10, 'monthly')
      expect(schedule).toEqual({
        year: 2021,
        month: 11,
        text: `2021年11月下旬`,
        subText: `11/21〜11/30`,
        term: 'late'
      })
    })
    test('leadDays + today > 28', () => {
      MockDate.set(new Date(2021, 9, 19))
      const schedule = makeSchedule(10, 'monthly')
      expect(schedule).toEqual({
        year: 2021,
        month: 11,
        text: `2021年11月下旬`,
        subText: `11/21〜11/30`,
        term: 'late'
      })
    })
    test('end of year', () => {
      MockDate.set(new Date(2021, 11, 19))
      const schedule = makeSchedule(10, 'monthly')
      expect(schedule).toEqual({
        year: 2022,
        month: 1,
        text: `2022年1月下旬`,
        subText: `1/21〜1/31`,
        term: 'late'
      })
    })
  })
  describe('triple cycle', () => {
    describe('middle in month', () => {
      test('leadDays + today = 8', () => {
        MockDate.set(new Date(2021, 9, 5))
        const schedule = makeSchedule(3, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月中旬`,
          subText: `10/11〜10/20`,
          term: 'middle'
        })
      })
      test('leadDays + today = 17', () => {
        MockDate.set(new Date(2021, 9, 5))
        const schedule = makeSchedule(12, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月中旬`,
          subText: `10/11〜10/20`,
          term: 'middle'
        })
      })
    })
    describe('late in month', () => {
      test('leadDays + today = 18', () => {
        MockDate.set(new Date(2021, 9, 15))
        const schedule = makeSchedule(3, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月下旬`,
          subText: `10/21〜10/31`,
          term: 'late'
        })
      })
      test('leadDays + today = 27', () => {
        MockDate.set(new Date(2021, 9, 15))
        const schedule = makeSchedule(12, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月下旬`,
          subText: `10/21〜10/31`,
          term: 'late'
        })
      })
    })
    describe('early in month', () => {
      test('leadDays + today = 28', () => {
        MockDate.set(new Date(2021, 9, 15))
        const schedule = makeSchedule(13, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 11,
          text: `2021年11月上旬`,
          subText: `11/1〜11/10`,
          term: 'early'
        })
      })
      test('leadDays + today = 7', () => {
        MockDate.set(new Date(2021, 8, 27))
        const schedule = makeSchedule(10, 'triple')
        expect(schedule).toEqual({
          year: 2021,
          month: 10,
          text: `2021年10月上旬`,
          subText: `10/1〜10/10`,
          term: 'early'
        })
      })
      test('end of year', () => {
        MockDate.set(new Date(2021, 11, 15))
        const schedule = makeSchedule(13, 'triple')
        expect(schedule).toEqual({
          year: 2022,
          month: 1,
          text: `2022年1月上旬`,
          subText: `1/1〜1/10`,
          term: 'early'
        })
      })
    })
  })
})
