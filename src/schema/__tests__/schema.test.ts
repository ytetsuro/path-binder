import { describe, it, expect } from 'vitest'
import { defineSchema } from '../defineSchema'
import { asAny } from '../asAny'
import { arrayOf } from '../arrayOf'
import { asNumber } from '../asNumber'
import { asString } from '../asString'
import { SCHEMA_TYPE } from '../symbol'

describe('defineSchema', () => {
  it('returns SchemaObject as-is', () => {
    const schema = defineSchema({
      user: {
        id: asNumber(),
        name: asString(),
      },
    })
    expect(schema).toHaveProperty('user')
    expect(typeof (schema.user as Record<string, unknown>)['id']).toStrictEqual('function')
    expect(typeof (schema.user as Record<string, unknown>)['name']).toStrictEqual('function')
  })
})

describe('asAny', () => {
  it('returns AnySchema without properties', () => {
    const schema = asAny()
    expect(schema[SCHEMA_TYPE]).toStrictEqual('any')
    expect(schema.properties).toStrictEqual(undefined)
  })

  it('returns AnySchema with properties', () => {
    const props = { id: asNumber() }
    const schema = asAny(props)
    expect(schema[SCHEMA_TYPE]).toStrictEqual('any')
    expect(schema.properties).toStrictEqual(props)
  })
})

describe('arrayOf', () => {
  it('returns ArraySchema with CastFn as item', () => {
    const schema = arrayOf(asString())
    expect(schema[SCHEMA_TYPE]).toStrictEqual('array')
    expect(typeof schema.item).toStrictEqual('function')
  })

  it('returns ArraySchema with SchemaObject as item', () => {
    const schema = arrayOf({ name: asString() })
    expect(schema[SCHEMA_TYPE]).toStrictEqual('array')
    expect(typeof (schema.item as Record<string, unknown>)['name']).toStrictEqual('function')
  })

  it('returns ArraySchema with nested arrayOf as item', () => {
    const schema = arrayOf(arrayOf(asNumber()))
    expect(schema[SCHEMA_TYPE]).toStrictEqual('array')
    expect((schema.item as { [key: symbol]: string })[SCHEMA_TYPE]).toStrictEqual('array')
  })
})
