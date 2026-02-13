import { assertStrictEquals } from '@std/assert'

import { detectFunctionType, normalizeIndex } from '../../src/utils/index.ts'

Deno.test('Function Type', async (t) => {
  await t.step('test detect function type', () => {
    const obj = {
      a: function () {},
      b: () => {},
      c() {},
    }

    for (const f of [obj.a, obj.b, obj.c]) {
      f.toString = () => 'Hello world!'
    }

    assertStrictEquals(detectFunctionType(obj.a), 'normal')
    assertStrictEquals(detectFunctionType(obj.b), 'arrow')
    assertStrictEquals(detectFunctionType(obj.c), 'method')
  })

  await t.step('test detect function type for special characters', () => {
    const obj = {
      甲: function (_a: string = '():?,;[]{}中a1$-_=>{', ..._args: any[]) {},
      乙: (_a: any) => {},
      ['丙'](_a: string = '():?,;[]{}中a1$-_=>{', ..._args: any[]) {},
    }

    for (const f of [obj.甲, obj.乙, obj.丙]) {
      f.toString = () => 'Hello world!'
    }

    assertStrictEquals(detectFunctionType(obj.甲), 'normal')
    assertStrictEquals(detectFunctionType(obj.乙), 'arrow')
    assertStrictEquals(detectFunctionType(obj.丙), 'method')
  })
})

Deno.test('normalizeIndex', async (t) => {
  await t.step('should normalize index', () => {
    assertStrictEquals(normalizeIndex(0, 10), 0)
    assertStrictEquals(normalizeIndex(-2, 10), 8)
    assertStrictEquals(normalizeIndex(-10, 10), 0)
    assertStrictEquals(normalizeIndex(10, 10), 10)
  })
})
