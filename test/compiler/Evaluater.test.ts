import { assert, assertFalse, assertStrictEquals } from '@std/assert'
import { $eval } from '../test-utils.test.ts'
import { Rop } from '../../src/Rop.ts'

Deno.test('Evaluater', async (t) => {
  await t.step('should evaluate constant values', () => {
    assertStrictEquals($eval`42`, 42)
    assertStrictEquals($eval`299792458n`, 299792458n)
    assertStrictEquals($eval`3.14`, 3.14)
    assertStrictEquals($eval`31415e-4`, 31415e-4)
    assertStrictEquals($eval`"hello"`, 'hello')
    assertStrictEquals($eval`'world'`, 'world')
  })

  await t.step('should evaluate embedded values', () => {
    assertStrictEquals($eval`'Hello, ' + ${'world'} + '!'`, 'Hello, world!')
    assertStrictEquals($eval`${Math}.sin(${Math}.PI / 2)`, 1)
  })

  await t.step('should evaluate unary operators', () => {
    assertFalse($eval`!true`)
    assert($eval`!false`)
    assertStrictEquals($eval`~-1`, 0)
    assertStrictEquals($eval`-5`, -5)
    assertStrictEquals($eval`+10`, 10)
  })

  await t.step('should evaluate binary operators', () => {
    assertStrictEquals($eval`1 + 2`, 3)
    assertStrictEquals($eval`5 - 3`, 2)
    assertStrictEquals($eval`4 * 3`, 12)
    assertStrictEquals($eval`10 / 2`, 5)
    assertStrictEquals($eval`10 % 3`, 1)
    assertStrictEquals($eval`2 ** 3`, 8)
    assert($eval`5 > 3`)
    assertFalse($eval`5 < 3`)
    assert($eval`5 >= 5`)
    assertFalse($eval`5 <= 3`)
    assert($eval`5 == 5`)
    assert($eval`5 != 3`)
    assert($eval`5 === 5`)
    assert($eval`5 !== 3`)
    assert($eval`true && true`)
    assertFalse($eval`true && false`)
    assert($eval`false || true`)
    assertFalse($eval`false || false`)
  })

  await t.step('should short-circuit logical operators', () => {
    let calls = 0
    const sideEffect = () => {
      calls++
      return true
    }

    assertFalse($eval`false && ${sideEffect}()`)
    assertStrictEquals(calls, 0)
    assert($eval`true || ${sideEffect}()`)
    assertStrictEquals(calls, 0)
    assert($eval`true && ${sideEffect}()`)
    assertStrictEquals(calls, 1)
  })

  await t.step('should evaluate operator precedence', () => {
    assertStrictEquals($eval`1 + 2 * 3`, 7)
    assertStrictEquals($eval`(1 + 2) * 3`, 9)
    // Right associative
    assertStrictEquals($eval`2 ** 3 ** 2`, 512)
    assertStrictEquals($eval`2 ** (3 ** 2)`, 512)
    assertStrictEquals($eval`(2 ** 3) ** 2`, 64)
  })

  await t.step('should evaluate function calls', () => {
    assertStrictEquals($eval`${() => 3}()`, 3)
    assertStrictEquals($eval`min(1, 2)`, 1)
    assertStrictEquals($eval`max(1, 2, 3)`, 3)
  })

  await t.step('should preserve the receiver of method calls', () => {
    const obj = {
      value: 42,
      getValue() {
        return this.value
      },
    }

    assertStrictEquals($eval`${obj}.getValue()`, 42)
    assertStrictEquals($eval`${obj}['getValue']()`, 42)
  })

  await t.step('should evaluate array indexing', () => {
    const arr = [10, 20, 30]

    assertStrictEquals($eval`${arr}[0]`, 10)
    assertStrictEquals($eval`${arr}[1]`, 20)
    assertStrictEquals($eval`${arr}[-1]`, 30)

    const obj = { key: 'value' }
    assertStrictEquals($eval`${obj}["key"]`, 'value')
  })

  await t.step('should evaluate object property access', () => {
    const obj = { key: 'value' }
    assertStrictEquals($eval`${obj}.key`, 'value')
  })
})

Deno.test('Evaluater: search for binary operator overload', async (t) => {
  await t.step('should find the overload', () => {
    const rop = new Rop()

    rop.overload(String, '*', (self: string, other: number) => self.repeat(other))
    rop.overload(String, 'r*', (self: string, other: number) => self.repeat(other))

    assertStrictEquals(rop.o<string>`'hey' * 3`, 'heyheyhey')
    assertStrictEquals(rop.o<string>`3 * 'hey'`, 'heyheyhey')
  })

  await t.step('should only use an explicit reverse overload for the right operand', () => {
    class Box {
      public constructor(public value: number) {}
    }
    const rop = new Rop()
    rop.overloads(Box, {
      '-': (self: Box, other: number) => self.value - other,
      'r-': (self: Box, other: number) => other - self.value,
    })

    assertStrictEquals(rop.o`${new Box(10)} - 3`, 7)
    assertStrictEquals(rop.o`20 - ${new Box(6)}`, 14)
  })
})
