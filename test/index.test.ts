import { assert, assertEquals, assertThrows } from '@std/assert'
import { Rop } from '../src/index.ts'

Deno.test('Rop operation overloading for custom types', async (t) => {
  const rop = new Rop()
  class Vec2 {
    constructor(
      public x: number,
      public y: number,
    ) {}

    [Rop.op('~')]() {
      return new Vec2(~this.x, ~this.y)
    }

    [Rop.op('+')](other: Vec2) {
      return new Vec2(this.x + other.x, this.y + other.y)
    }
  }

  await t.step('should be able to overload operations for custom types', () => {
    const v = new Vec2(2, 3)

    const v2 = rop.o<Vec2>`~${v}`
    assertEquals(v2, new Vec2(~v.x, ~v.y))

    const v3 = rop.o<Vec2>`${v} + ${v2}`
    assertEquals(v3, new Vec2(v.x + v2.x, v.y + v2.y))
  })

  await t.step('should overload an existing type with `Rop#overload`', () => {
    const a = new Vec2(1, 2)
    const b = new Vec2(3, 4)

    rop.overload(Vec2, '==', (self: Vec2, other: Vec2) => self.x === other.x && self.y === other.y)
    assert(!rop.o<Vec2>`${a} == ${b}`)

    rop.overload(Vec2, '-', (self: Vec2, other: Vec2) => new Vec2(self.x - other.x, self.y - other.y))
    assertEquals(rop.o<Vec2>`${a} - ${b}`, new Vec2(a.x - b.x, a.y - b.y))
  })

  await t.step('should overload an existing type with `Rop.overloads`', () => {
    const a = new Vec2(2, 3)
    const b = new Vec2(5, 7)

    rop.overloads(Vec2, {
      '+': (self: Vec2, other: Vec2) => new Vec2(self.x + other.x, self.y + other.y),
      '==': (self: Vec2, other: Vec2) => {
        return self.x === other.x && self.y === other.y
      },
      '-': (self: Vec2, other: Vec2) => new Vec2(self.x - other.x, self.y - other.y),
    })
    assertEquals(rop.o<Vec2>`${a} + ${b}`, new Vec2(a.x + b.x, a.y + b.y))
    assertEquals(rop.o<Vec2>`${a} - ${b}`, new Vec2(a.x - b.x, a.y - b.y))
    assert(!rop.o<Vec2>`${a} == ${b}`)
  })

  await t.step('should reject unknown operation names', () => {
    assertThrows(() => Rop.op('toString' as never))
    assertThrows(() => new Rop().overloads(Vec2, { typo: () => undefined } as never))
  })
})
