import { assert, assertEquals, assertStrictEquals, assertThrows } from '@std/assert'
import { Rop, RopTypeError } from '../src/index.ts'

Deno.test('Rop Test', async (t) => {
  await t.step('basic', () => {
    const rop = new Rop().bind({ a: 1, b: 2 })
    assertStrictEquals(rop.o<number>`a + b`, 3)
  })

  await t.step('bind method with key-value pair', () => {
    const rop = new Rop().bind('a', 1)
    assertStrictEquals(rop.bindings.get('a'), 1)

    rop.bind('b', 'test')
    assertStrictEquals(rop.bindings.get('b'), 'test')
  })

  await t.step('bind method chaining', () => {
    const rop = new Rop()
      .bind('a', 1)
      .bind({ b: 2 })
      .bind(new Map([['c', 3]]))

    assertStrictEquals(rop.bindings.size, 3)
    assertStrictEquals(rop.bindings.get('a'), 1)
    assertStrictEquals(rop.bindings.get('b'), 2)
    assertStrictEquals(rop.bindings.get('c'), 3)
  })

  await t.step('unbind method', () => {
    const rop = new Rop().bind({ a: 1, b: 2, c: 3 })
    assertStrictEquals(rop.bindings.size, 3)

    rop.unbind('b')
    assertStrictEquals(rop.bindings.size, 2)
    assert(rop.bindings.has('a'))
    assert(!rop.bindings.has('b'))
    assert(rop.bindings.has('c'))

    rop.unbind('a', 'c')
    assertStrictEquals(rop.bindings.size, 0)
  })

  await t.step('o template tag', () => {
    const rop = new Rop().bind({ a: 10, b: 5 })
    assertStrictEquals(rop.o<number>`a + b`, 15)
    assertStrictEquals(rop.o<number>`a - b`, 5)
    assertStrictEquals(rop.o<number>`a * b`, 50)
    assert(rop.o<boolean>`a > b`)
  })

  await t.step('reuses a cached template with fresh embedded values', () => {
    const rop = new Rop()
    const add = (a: number, b: number) => rop.o<number>`${a} + ${b}`
    assertStrictEquals(add(1, 2), 3)
    assertStrictEquals(add(20, 30), 50)
  })

  await t.step('compiles positional arguments and captured values', () => {
    const rop = new Rop().overloadDefaults()
    const x = Rop.arg<number>(0, 'x')
    const y = Rop.arg<number>(1, 'y')
    const captured = 4
    const expression = rop.compile<[number, number], number>`${y} * ${captured} + ${x} + ${x}`

    assertStrictEquals(expression(2, 3), 16)
  })

  await t.step('keeps compiled closures and live Rop state separate', () => {
    const rop = new Rop().bind('offset', 1)
    const x = Rop.arg<number>(0)
    const make = (captured: number) => rop.compile<[number], number>`${x} + ${captured} + offset`
    const first = make(10)
    const second = make(20)

    assertStrictEquals(first(2), 13)
    assertStrictEquals(second(2), 23)
    rop.bind('offset', 5)
    assertStrictEquals(first(2), 17)
  })

  await t.step('distinguishes a missing argument from explicit undefined', () => {
    const rop = new Rop()
    const value = Rop.arg<undefined>(0, 'value')
    const expression = rop.compile<[undefined], undefined>`${value}`

    assertStrictEquals(expression(undefined), undefined)
    const error = assertThrows(() => (expression as (...args: unknown[]) => unknown)(), RopTypeError)
    assertEquals(error.span, { start: 0, end: 3 })
    assert(error.message.includes("Argument 0 ('value') was not provided"))
  })

  await t.step('treats an argument placeholder nested in another value as a constant', () => {
    const rop = new Rop()
    const wrapped = { value: Rop.arg(0) }
    const expression = rop.compile<[], typeof wrapped>`${wrapped}`
    assertStrictEquals(expression(), wrapped)
  })

  await t.step('rejects conflicting names for one argument index', () => {
    const rop = new Rop()
    const first = Rop.arg(0, 'first')
    const second = Rop.arg(0, 'second')
    assertThrows(() => rop.compile`${first} + ${second}`, RopTypeError, 'conflicting names')
  })
})

Deno.test('Rop builtin test', async (t) => {
  await t.step('bindBuiltins', () => {
    const rop = new Rop().bindDefaults().bindMaths()
    assert(rop.o<boolean>`true`)
    assert(!rop.o<boolean>`false`)
    assertStrictEquals(rop.o<any>`null`, null)
    assertStrictEquals(rop.o<any>`undefined`, undefined)
    assertStrictEquals(rop.o<number>`Infinity`, Infinity)
    assertStrictEquals(rop.o<number>`-Infinity`, -Infinity)
    assert(Number.isNaN(rop.o<number>`NaN`))

    assertStrictEquals(rop.o<number>`sin(PI / 2)`, 1)
  })

  await t.step('overloadBuiltins', () => {
    const rop = new Rop().overloadDefaults()
    assertEquals(rop.o<number[]>`${[3, 4]} + ${[5, 6]}`, [3, 4, 5, 6])
    assertStrictEquals(rop.o<string>`'a' * 3`, 'aaa')
    assertStrictEquals(rop.o<string>`3 * 'b'`, 'bbb')
    assertEquals(rop.o<Set<number>>`${new Set([5, 6, 7])} + ${new Set([1, 2, 3])}`, new Set([1, 2, 3, 5, 6, 7]))
  })

  await t.step('Array slicing', async (t) => {
    const rop = new Rop().overloadDefaults()
    rop.bind({ arr: [1, 2, 3, 4, 5, 6, 7, 8] })

    await t.step('should throw when step is 0', () => {
      assertThrows(() => rop.o`arr[::0]`)
    })

    await t.step('should get whole array', () => {
      assertEquals(rop.o<number[]>`arr[:]`, [1, 2, 3, 4, 5, 6, 7, 8])
      assertEquals(rop.o<number[]>`arr[::]`, [1, 2, 3, 4, 5, 6, 7, 8])
      assertEquals(rop.o<number[]>`arr[::1]`, [1, 2, 3, 4, 5, 6, 7, 8])
    })

    await t.step('should slice positive step', () => {
      assertEquals(rop.o<number[]>`arr[2:7]`, [3, 4, 5, 6, 7])
      assertEquals(rop.o<number[]>`arr[2:7:1]`, [3, 4, 5, 6, 7])
      assertEquals(rop.o<number[]>`arr[2:8:2]`, [3, 5, 7])
      assertEquals(rop.o<number[]>`arr[2:8:2]`, [3, 5, 7])

      assertEquals(rop.o<number[]>`arr[1:-2:2]`, [2, 4, 6])
      assertEquals(rop.o<number[]>`arr[-2:]`, [7, 8])
    })

    await t.step('should slice negative step', () => {
      assertEquals(rop.o<number[]>`arr[::-1]`, [8, 7, 6, 5, 4, 3, 2, 1])

      assertEquals(rop.o<number[]>`arr[5::-1]`, [6, 5, 4, 3, 2, 1])
      assertEquals(rop.o<number[]>`arr[-2::-1]`, [7, 6, 5, 4, 3, 2, 1])
      assertEquals(rop.o<number[]>`arr[-2::-2]`, [7, 5, 3, 1])

      assertEquals(rop.o<number[]>`arr[:2:-1]`, [8, 7, 6, 5, 4])
      assertEquals(rop.o<number[]>`arr[:-1:-1]`, [])
      assertEquals(rop.o<number[]>`arr[:-4:-1]`, [8, 7, 6])

      assertEquals(rop.o<number[]>`arr[6:2:-1]`, [7, 6, 5, 4])
      assertEquals(rop.o<number[]>`arr[-2:3:-1]`, [7, 6, 5])
    })

    await t.step('should clamp out-of-range slice bounds', () => {
      assertEquals(rop.o<number[]>`arr[-99:99]`, [1, 2, 3, 4, 5, 6, 7, 8])
      assertEquals(rop.o<number[]>`arr[99:-99:-1]`, [8, 7, 6, 5, 4, 3, 2, 1])
      assertEquals(rop.o<number[]>`arr[-99:99:-1]`, [])
      assertEquals(rop.o<number[]>`arr[99:-99]`, [])
    })

    await t.step('should reject invalid slice components', () => {
      assertThrows(() => rop.o`arr[::1.5]`)
      assertThrows(() => rop.o`arr[::${Number.NaN}]`)
      assertThrows(() => rop.o`arr[::${Infinity}]`)
      assertThrows(() => rop.o`arr[::'1']`)
    })
  })
})
