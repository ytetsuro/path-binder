import { describe, it, expect } from 'vitest'
import { valueCaster } from '../valueCaster'
import { asString } from '../asString'
import { asNumber } from '../asNumber'
import { asAny } from '../asAny'
import { arrayOf } from '../arrayOf'
import { parsePath } from '../../parser/parsePath'

describe('valueCaster', () => {
  it('casts value for path matching a CastFn', () => {
    const cast = valueCaster({ user: { id: asNumber() } })
    expect(cast(parsePath('user.id'), '42')).toStrictEqual(42)
  })

  it('casts string with asString', () => {
    const cast = valueCaster({ name: asString() })
    expect(cast(parsePath('name'), 123)).toStrictEqual('123')
  })

  it('casts value in nested schema', () => {
    const cast = valueCaster({
      user: { info: { type: asString() } },
    })
    expect(cast(parsePath('user.info.type'), 42)).toStrictEqual('42')
  })

  it('casts value with CastFn inside ArraySchema', () => {
    const cast = valueCaster({
      user: { tags: arrayOf(asNumber()) },
    })
    expect(cast(parsePath('user.tags[]'), '99')).toStrictEqual(99)
  })

  it('casts object property value inside ArraySchema', () => {
    const cast = valueCaster({
      user: { info: arrayOf({ type: asString() }) },
    })
    expect(cast(parsePath('user.info[].type'), 123)).toStrictEqual('123')
  })

  it('casts when AnySchema has property definitions', () => {
    const cast = valueCaster({
      user: asAny({ id: asNumber() }),
    })
    expect(cast(parsePath('user.id'), '5')).toStrictEqual(5)
  })

  it('returns value as-is for undefined paths in AnySchema', () => {
    const cast = valueCaster({
      user: asAny(),
    })
    expect(cast(parsePath('user.other'), 'hello')).toStrictEqual('hello')
  })

  it('casts $key segment value', () => {
    const cast = valueCaster({
      user: { id: asNumber() },
    })
    expect(cast(parsePath('user.$id'), '10')).toStrictEqual(10)
  })

  it('casts value with index access', () => {
    const cast = valueCaster({
      items: arrayOf(asString()),
    })
    expect(cast(parsePath('items[0]'), 42)).toStrictEqual('42')
  })

  it('returns value as-is when no CastFn is found', () => {
    const cast = valueCaster({ user: { name: asString() } })
    expect(cast(parsePath('user.age'), 25)).toStrictEqual(25)
  })
})
