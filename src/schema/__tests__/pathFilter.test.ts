import { describe, it, expect } from 'vitest'
import { pathFilter } from '../pathFilter'
import { asString } from '../asString'
import { asNumber } from '../asNumber'
import { asAny } from '../asAny'
import { arrayOf } from '../arrayOf'
import { parsePath } from '../../parser/parsePath'

describe('pathFilter', () => {
  it('allows paths defined in the schema', () => {
    const isAllowed = pathFilter({ user: { name: asString() } })
    expect(isAllowed(parsePath('user.name'))).toStrictEqual(true)
  })

  it('rejects paths not defined in the schema', () => {
    const isAllowed = pathFilter({ user: { name: asString() } })
    expect(isAllowed(parsePath('user.age'))).toStrictEqual(false)
  })

  it('allows nested schema paths', () => {
    const isAllowed = pathFilter({
      user: { info: { type: asString() } },
    })
    expect(isAllowed(parsePath('user.info.type'))).toStrictEqual(true)
  })

  it('rejects partial paths (intermediate nodes)', () => {
    const isAllowed = pathFilter({ user: { name: asString() } })
    expect(isAllowed(parsePath('user'))).toStrictEqual(false)
  })

  it('allows array paths for ArraySchema', () => {
    const isAllowed = pathFilter({
      user: { tags: arrayOf(asString()) },
    })
    expect(isAllowed(parsePath('user.tags[]'))).toStrictEqual(true)
  })

  it('allows object properties inside ArraySchema', () => {
    const isAllowed = pathFilter({
      user: { info: arrayOf({ type: asString() }) },
    })
    expect(isAllowed(parsePath('user.info[].type'))).toStrictEqual(true)
  })

  it('allows all paths under AnySchema', () => {
    const isAllowed = pathFilter({
      user: asAny(),
    })
    expect(isAllowed(parsePath('user.anything.nested.deep'))).toStrictEqual(true)
  })

  it('allows paths with AnySchema property definitions', () => {
    const isAllowed = pathFilter({
      user: asAny({ id: asNumber() }),
    })
    expect(isAllowed(parsePath('user.id'))).toStrictEqual(true)
    expect(isAllowed(parsePath('user.other'))).toStrictEqual(true)
  })

  it('allows $key segments as paths', () => {
    const isAllowed = pathFilter({
      user: { id: asNumber() },
    })
    expect(isAllowed(parsePath('user.$id'))).toStrictEqual(true)
  })

  it('allows index access paths', () => {
    const isAllowed = pathFilter({
      user: { tags: arrayOf(asString()) },
    })
    expect(isAllowed(parsePath('user.tags[0]'))).toStrictEqual(true)
  })

  it('rejects completely undefined top-level paths', () => {
    const isAllowed = pathFilter({ user: { name: asString() } })
    expect(isAllowed(parsePath('unknown'))).toStrictEqual(false)
  })
})
