import { describe, it, expect } from 'vitest'
import { isArraySchema, isAnySchema, isCastFn, isSchemaObject } from '../guard'
import { asString } from '../asString'
import { asNumber } from '../asNumber'
import { asAny } from '../asAny'
import { arrayOf } from '../arrayOf'
import type { SchemaNode } from '../types'

describe('isArraySchema', () => {
  it('returns true for ArraySchema', () => {
    expect(isArraySchema(arrayOf(asString()))).toStrictEqual(true)
  })

  it('returns false for AnySchema', () => {
    expect(isArraySchema(asAny())).toStrictEqual(false)
  })

  it('returns false for CastFn', () => {
    expect(isArraySchema(asString())).toStrictEqual(false)
  })

  it('returns false for SchemaObject', () => {
    const obj: SchemaNode = { name: asString() }
    expect(isArraySchema(obj)).toStrictEqual(false)
  })
})

describe('isAnySchema', () => {
  it('returns true for AnySchema', () => {
    expect(isAnySchema(asAny())).toStrictEqual(true)
  })

  it('returns true for AnySchema with properties', () => {
    expect(isAnySchema(asAny({ id: asNumber() }))).toStrictEqual(true)
  })

  it('returns false for ArraySchema', () => {
    expect(isAnySchema(arrayOf(asString()))).toStrictEqual(false)
  })

  it('returns false for CastFn', () => {
    expect(isAnySchema(asString())).toStrictEqual(false)
  })
})

describe('isCastFn', () => {
  it('returns true for CastFn', () => {
    expect(isCastFn(asString())).toStrictEqual(true)
  })

  it('returns true for asNumber', () => {
    expect(isCastFn(asNumber())).toStrictEqual(true)
  })

  it('returns false for SchemaObject', () => {
    const obj: SchemaNode = { name: asString() }
    expect(isCastFn(obj)).toStrictEqual(false)
  })

  it('returns false for ArraySchema', () => {
    expect(isCastFn(arrayOf(asString()))).toStrictEqual(false)
  })

  it('returns false for AnySchema', () => {
    expect(isCastFn(asAny())).toStrictEqual(false)
  })
})

describe('isSchemaObject', () => {
  it('returns true for SchemaObject', () => {
    const obj: SchemaNode = { name: asString() }
    expect(isSchemaObject(obj)).toStrictEqual(true)
  })

  it('returns true for nested SchemaObject', () => {
    const obj: SchemaNode = { user: { id: asNumber(), name: asString() } }
    expect(isSchemaObject(obj)).toStrictEqual(true)
  })

  it('returns false for CastFn', () => {
    expect(isSchemaObject(asString())).toStrictEqual(false)
  })

  it('returns false for ArraySchema', () => {
    expect(isSchemaObject(arrayOf(asString()))).toStrictEqual(false)
  })

  it('returns false for AnySchema', () => {
    expect(isSchemaObject(asAny())).toStrictEqual(false)
  })
})
