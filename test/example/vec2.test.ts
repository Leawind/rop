import { assertEquals } from '@std/assert'
import { o, Rop } from '../../src/index.ts'

class Vec2 {
  public static of(x: number, y: number): Vec2 {
    return new Vec2(x, y)
  }

  public constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  public hypot(): number {
    return Math.hypot(this.x, this.y)
  }

  public lengthSquared() {
    return this.x ** 2 + this.y ** 2
  }

  public add(v: Vec2): Vec2 {
    return Vec2.of(this.x + v.x, this.y + v.y)
  }
  public sub(v: Vec2): Vec2 {
    return Vec2.of(this.x - v.x, this.y - v.y)
  }
  public mul(v: Vec2): Vec2 {
    return Vec2.of(this.x * v.x, this.y * v.y)
  }
  public div(v: Vec2): Vec2 {
    return Vec2.of(this.x / v.x, this.y / v.y)
  }
  public dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y
  }
  public cross(v: Vec2): Vec2 {
    return Vec2.of(this.y * v.x - this.x * v.y, this.x * v.y - this.y * v.x)
  }

  [Rop.op('+')](this: Vec2, other: Vec2) {
    return this.add(other)
  }
  [Rop.op('-')](this: Vec2, other: Vec2) {
    return this.sub(other)
  }
  [Rop.op('*')](this: Vec2, other: Vec2) {
    return this.mul(other)
  }
  [Rop.op('/')](this: Vec2, other: Vec2) {
    return this.div(other)
  }
}

Deno.test('Vec2: Basic Usage', async (t) => {
  const v1 = Vec2.of(3, 4)
  const v2 = Vec2.of(6, 8)

  assertEquals(v1.hypot(), 5)
  assertEquals(v1.lengthSquared(), 25)

  await t.step('Use simple method', () => {
    assertEquals(v1.add(v2), Vec2.of(9, 12))
    assertEquals(v1.sub(v2), Vec2.of(-3, -4))
    assertEquals(v1.mul(v2), Vec2.of(18, 32))
    assertEquals(v1.div(v2), Vec2.of(0.5, 0.5))
    assertEquals(v1.dot(v2), 50)
    assertEquals(v1.cross(v2), Vec2.of(0, 0))
  })

  await t.step('Use Rop operator', () => {
    Rop.INST.bind({ v1, v2 })

    assertEquals(o`v1 + v2`, v1.add(v2))
    assertEquals(o`v1 - v2`, v1.sub(v2))
    assertEquals(o`v1 * v2`, v1.mul(v2))
    assertEquals(o`v1 / v2`, v1.div(v2))
  })
})
