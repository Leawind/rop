/**
 * Quick Tutorial for rop - Runtime Operator Parsing
 *
 * This tutorial demonstrates the core concepts and basic usage of rop.
 *
 * `rop` is a TypeScript/JavaScript library for parsing and evaluating expressions
 * using tagged template literals. It supports operator overloading for custom
 * and built-in types, enabling custom behaviors for JS operators.
 *
 * @module
 */

import { assert, assertEquals, assertFalse } from '@std/assert'
import { o, Rop } from '../src/index.ts'

Deno.test('Quick Tutorial: Basic Usage', async (t) => {
  /**
   * Basic Usage
   *
   * The simplest way to use rop is with the default instance `Rop.INST`
   *
   * `o` is a quick alias for `Rop.INST.o`.
   */
  await t.step('Basic expression evaluation', () => {
    // Simple arithmetic
    assertEquals(o`2 + 3`, 5)
    assertEquals(o`15 / 3`, 5)

    // Operator precedence
    assertEquals(o`2 + 3 * 4`, 14) // 2 + (3 * 4)
    assertEquals(o`(2 + 3) * 4`, 20) // (2 + 3) * 4

    // Comparison operators
    assert(o`5 > 3`)
    assert(o`2 === 2`)
  })

  /**
   * Value Embedding
   *
   * You can embed values in your expressions using `${}`.
   */
  await t.step('Value embedding', () => {
    assertEquals(o`2 + ${3}`, 5)
    assertEquals(o`3 * 'ha'`, 'hahaha')
    assertEquals(o`${{ name: 'Steve' }}.name`, 'Steve')
  })

  /**
   * JS-like Property Access
   */
  await t.step('Property access', () => {
    const obj = { a: { b: { c: 123 } } }
    assertEquals(o`${obj}.a.b.c`, 123)
  })
})

/**
 * Bindings
 *
 * You can bind values to identifiers that can be used in expressions.
 * This is useful for working with variables in your expressions.
 *
 * Bindings are stored in the `Rop` instance. You can use the default instance `Rop.INST` or create your own instance to add bindings.
 */
Deno.test('Quick Tutorial: Bindings', async (t) => {
  await t.step('Bind value to identifier on a custom Rop instance', () => {
    // Create a new Rop instance
    const rop = new Rop()

    // Bind values
    rop.bind('a', 10).bind('b', 5)
    assertEquals(rop.o`a + b`, 15)

    // Bind multiple values at once
    rop.bind({ x: 20, y: 30 })
    assertEquals(rop.o`x * y`, 600)
  })

  await t.step('Bind value to identifier on the default Rop instance', () => {
    // Add bindings to the default instance
    Rop.INST.bind({ name: 'rop' })
    assertEquals(o`"Hello, " + name`, 'Hello, rop')
  })

  /**
   * The default instance `Rop.INST` provides some default bindings.
   *
   * Including:
   * - Some JS keywords like `true`, `false`, `null`, `undefined`, `NaN`, `Infinity`
   * - Some JS global objects like `Object`, `Math`, `Date`, `JSON`
   * - All methods in the `Math` object.
   */
  await t.step('Default bindings', () => {
    // Reset the default instance to ensure a clean state
    Rop.resetDefaultInstance()

    assert(o`true`)
    assertFalse(o`false`)
    assertEquals(o`null`, null)
    assertEquals(o`undefined`, undefined)
    assert(Number.isNaN(o`NaN`))
    assertEquals(o`Infinity`, Infinity)

    assertEquals(o`sin(PI / 2)`, 1)
  })

  /**
   * The default instance `Rop.INST` provides some built-in operator overloadings.
   */
  await t.step('Default Instance: operator overloading', () => {
    // Array concatenation with +
    assertEquals(o<number[]>`${[1, 2]} + ${[3, 4]}`, [1, 2, 3, 4])

    // String repetition with *
    assertEquals(o`'ha' * 3`, 'hahaha')

    // Set union with `+`
    Rop.INST.bind({
      a: new Set([1, 2, 3]),
      b: new Set([3, 4, 5]),
    })
    assertEquals(o<Set<number>>`a + b`, new Set([1, 2, 3, 4, 5]))
  })
})

/**
 * Operation Overloading
 *
 * You can define custom operator behavior for classes. Supported operations include:
 * - JS Unary/Binary operators:
 *
 * The information about operation overloading can be stored in:
 * - `Rop` instance
 * - Object prototype
 */
Deno.test('Quick Tutorial: Operation overloading', async (t) => {
  /**
   * Custom type operator overloading (on Class prototype)
   */
  await t.step('Add operation overloading on Class prototype', () => {
    class Vec2 {
      constructor(
        public x: number,
        public y: number,
      ) {}

      // This is stored in the Class prototype. So it's avaialble in all Rop instance.
      [Rop.op('+')](this: Vec2, other: Vec2) {
        return new Vec2(this.x + other.x, this.y + other.y)
      }

      [Rop.op('-')](this: Vec2, other: Vec2) {
        return new Vec2(this.x - other.x, this.y - other.y)
      }
    }

    const a = new Vec2(2, 3)
    const b = new Vec2(4, 5)

    assertEquals(o<Vec2>`${a} + ${b}`, new Vec2(6, 8))

    // Any Rop instance can use this operator overloading.
    assertEquals(new Rop().o<Vec2>`${a} - ${b}`, new Vec2(-2, -2))
  })

  /**
   * Add operation overloading for an existing Class.
   */
  await t.step('Add operation overloading on Rop instance', () => {
    // Create a new Rop instance
    const rop = new Rop().bind({ true: true, false: false })
    // Instance-level overloads always receive the overloaded value as `self`.
    rop.overloads(Boolean, {
      '+': (self: boolean, other: boolean) => self || other,
      '*': (self: boolean, other: boolean) => self && other,
      '^': (self: boolean, other: boolean) => self !== other,
    })
    assert(rop.o`true + false`)
    assertFalse(rop.o`true * false`)
    assert(rop.o`true ^ false`)
  })
})

/**
 * Array Slicing
 *
 * rop supports Python-style array slicing syntax.
 */
Deno.test('Python-style array slicing', () => {
  const rop = new Rop().overloadDefaults().bind({
    arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  })

  // Basic slicing [start:end]
  assertEquals(rop.o<number[]>`arr[2:5]`, [2, 3, 4])

  // Slicing with step [start:end:step]
  assertEquals(rop.o<number[]>`arr[1:8:2]`, [1, 3, 5, 7])

  // Negative indices
  assertEquals(rop.o<number[]>`arr[-3:-1]`, [7, 8])

  // Reverse with step
  assertEquals(rop.o<number[]>`arr[::-1]`, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0])

  // Omitting start or end
  assertEquals(rop.o<number[]>`arr[:3]`, [0, 1, 2])
  assertEquals(rop.o<number[]>`arr[7:]`, [7, 8, 9])
})

/**
 * Working with Functions
 *
 * You can call functions in expressions, including built-in functions
 * and custom functions.
 */
Deno.test('Function calls', () => {
  const rop = new Rop().bind({
    add: (a: number, b: number) => a + b,
    sum(...args: number[]) {
      return args.reduce((acc, cur) => acc + cur, 0)
    },
  })

  assertEquals(rop.o`add(5, 3)`, 8)
  assertEquals(rop.o`sum(1, 2, 3, add(4, 5))`, 15)
})
