import { describe, it, expect } from 'vitest'
import { asString } from '../asString'
import { asNumber } from '../asNumber'
import { asBoolean } from '../asBoolean'
import { asDate } from '../asDate'
import { asCustom } from '../asCustom'

describe('asString', () => {
  it('returns CastFn<string>', () => {
    const cast = asString()
    expect(cast(123)).toStrictEqual('123')
  })

  it('converts null to string', () => {
    const cast = asString()
    expect(cast(null)).toStrictEqual('null')
  })

  it('converts undefined to string', () => {
    const cast = asString()
    expect(cast(undefined)).toStrictEqual('undefined')
  })

  it('returns string as-is', () => {
    const cast = asString()
    expect(cast('hello')).toStrictEqual('hello')
  })
})

describe('asNumber', () => {
  it('returns CastFn<number>', () => {
    const cast = asNumber()
    expect(cast('42')).toStrictEqual(42)
  })

  it('returns number as-is', () => {
    const cast = asNumber()
    expect(cast(3.14)).toStrictEqual(3.14)
  })

  it('returns NaN for non-convertible string', () => {
    const cast = asNumber()
    expect(cast('abc')).toStrictEqual(NaN)
  })
})

describe('asBoolean', () => {
  it('converts truthy value to true', () => {
    const cast = asBoolean()
    expect(cast(1)).toStrictEqual(true)
  })

  it('converts falsy value to false', () => {
    const cast = asBoolean()
    expect(cast(0)).toStrictEqual(false)
  })

  it('converts string "true" to true', () => {
    const cast = asBoolean()
    expect(cast('true')).toStrictEqual(true)
  })

  it('converts empty string to false', () => {
    const cast = asBoolean()
    expect(cast('')).toStrictEqual(false)
  })

  it('returns true for string "false" since it is truthy', () => {
    // Boolean() follows JavaScript's standard conversion.
    // Use asCustom if you need "false" → false
    const cast = asBoolean()
    expect(cast('false')).toStrictEqual(true)
  })
})

describe('asDate', () => {
  it('creates Date from string', () => {
    const cast = asDate()
    const result = cast('2024-01-15')
    expect(result).toBeInstanceOf(Date)
    expect((result as Date).toISOString().startsWith('2024-01-15')).toStrictEqual(true)
  })

  it('creates Date from number (timestamp)', () => {
    const cast = asDate()
    const result = cast(0)
    expect(result).toBeInstanceOf(Date)
    expect((result as Date).getTime()).toStrictEqual(0)
  })
})

describe('asCustom', () => {
  it('uses user-specified conversion function', () => {
    const cast = asCustom((v) => JSON.parse(v as string))
    expect(cast('{"a":1}')).toStrictEqual({ a: 1 })
  })

  it('correctly infers type parameter', () => {
    const cast = asCustom<number>((v) => Number(v) * 2)
    expect(cast('5')).toStrictEqual(10)
  })
})
