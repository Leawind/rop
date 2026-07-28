import { assertEquals, assertObjectMatch, assertThrows } from '@std/assert'
import { AstNode, NodeType } from '../../src/compiler/AstNode.ts'
import { TokenType } from '../../src/compiler/Token.ts'
import { $ast } from '../test-utils.test.ts'
import { AstFactory } from '../../src/compiler/ast-parser/AstFactory.ts'

function assertAstNodeMatch(
  actual: AstNode,
  expected: AstNode,
  msg?: string,
): void {
  assertObjectMatch(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), msg)
}

Deno.test('Parse single operand', async (t) => {
  await t.step('should parse value', () => {
    assertEquals($ast`${123}`, AstFactory.embeddedValue(123))
  })

  await t.step('should parse single number constant', () => {
    assertEquals($ast`42`, AstFactory.constValue('42', 42))
  })

  await t.step('should parse single number in parentheses', () => {
    assertEquals($ast`((((((3.14))))))`, AstFactory.constValue('3.14', 3.14))
  })

  await t.step('should parse single constant', () => {
    assertEquals($ast`"hello"`, AstFactory.constValue('"hello"', 'hello'))
  })

  await t.step('should parse identifier', () => {
    assertEquals($ast`variable`, AstFactory.identifier('variable'))
  })
})

Deno.test('Parse operators', async (t) => {
  await t.step('should parse unary operators', () => {
    assertEquals($ast`!true`, AstFactory.unary('!', AstFactory.identifier('true')))
    assertEquals($ast`~314`, AstFactory.unary('~', AstFactory.constValue('314', 314)))
    assertEquals($ast`-5`, AstFactory.unary('-x', AstFactory.constValue('5', 5)))
  })

  await t.step('should parse repeated unary operators', () => {
    assertEquals($ast`!!!true`, AstFactory.unary('!', AstFactory.unary('!', AstFactory.unary('!', AstFactory.identifier('true')))))
    assertEquals($ast`~~~314`, AstFactory.unary('~', AstFactory.unary('~', AstFactory.unary('~', AstFactory.constValue('314', 314)))))
    assertEquals($ast`---5`, AstFactory.unary('-x', AstFactory.unary('-x', AstFactory.unary('-x', AstFactory.constValue('5', 5)))))
  })

  await t.step('should parse binary operators', () => {
    assertEquals($ast`1 + 2`, AstFactory.binary(AstFactory.constValue('1', 1), '+', AstFactory.constValue('2', 2)))
  })

  await t.step('should parse operator precedence', () => {
    assertEquals(
      $ast`1 + 2 * 3`,
      AstFactory.binary(
        AstFactory.constValue('1', 1),
        '+',
        AstFactory.binary(AstFactory.constValue('2', 2), '*', AstFactory.constValue('3', 3)),
      ),
    )
  })

  await t.step('should parse mixed unary and binary operators', () => {
    assertEquals(
      $ast`-2 + -4`,
      AstFactory.binary(AstFactory.unary('-x', AstFactory.constValue('2', 2)), '+', AstFactory.unary('-x', AstFactory.constValue('4', 4))),
    )
    assertEquals(
      $ast`- 2 / -4`,
      AstFactory.unary('-x', AstFactory.binary(AstFactory.constValue('2', 2), '/', AstFactory.unary('-x', AstFactory.constValue('4', 4)))),
    )
  })

  await t.step('should parse parentheses for grouping', () => {
    assertEquals(
      $ast`1 + (2 * 3)`,
      AstFactory.binary(
        AstFactory.constValue('1', 1),
        '+',
        AstFactory.binary(AstFactory.constValue('2', 2), '*', AstFactory.constValue('3', 3)),
      ),
    )
    assertEquals(
      $ast`((1 + 2)) * 3`,
      AstFactory.binary(AstFactory.binary(AstFactory.constValue(1), '+', AstFactory.constValue(2)), '*', AstFactory.constValue(3)),
    )
  })

  await t.step('should parse unary operator precedence', () => {
    assertEquals($ast`-5 * 3`, AstFactory.unary('-x', AstFactory.binary(AstFactory.constValue(5), '*', AstFactory.constValue(3))))
  })

  await t.step('should parse right associative operator', () => {
    assertEquals(
      $ast`2 ** 3 ** 4`,
      AstFactory.binary(AstFactory.constValue(2), '**', AstFactory.binary(AstFactory.constValue(3), '**', AstFactory.constValue(4))),
    )
  })
  await t.step('should parse left associative operator', () => {
    assertEquals(
      $ast`2 * 3 * 4`,
      AstFactory.binary(AstFactory.binary(AstFactory.constValue(2), '*', AstFactory.constValue(3)), '*', AstFactory.constValue(4)),
    )
  })
})

Deno.test('Parse property access', async (t) => {
  await t.step('should parse property access', () => {
    assertEquals($ast`obj.prop`, AstFactory.accessProperty(AstFactory.identifier('obj'), 'prop'))
  })
  await t.step('should parse chained property access', () => {
    assertEquals($ast`a.b.c`, AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.identifier('a'), 'b'), 'c'))
  })
  await t.step('should parse chained property access', () => {
    assertEquals(
      $ast`a.b.c.d.e`,
      AstFactory.accessProperty(
        AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.identifier('a'), 'b'), 'c'), 'd'),
        'e',
      ),
    )
  })
  await t.step('should parse property access of expression', () => {
    assertEquals(
      $ast`(${'hey'} + '345').prop`,
      AstFactory.accessProperty(AstFactory.binary(AstFactory.embeddedValue('hey'), '+', AstFactory.constValue("'345'", '345')), 'prop'),
    )
  })
})

Deno.test('Parse invocation', async (t) => {
  await t.step('should parse invocation with no argument', () => {
    assertEquals($ast`sin()`, AstFactory.invoke(AstFactory.identifier('sin'), []))
  })

  await t.step('should parse invocation with single argument', () => {
    assertEquals($ast`sin(3)`, AstFactory.invoke(AstFactory.identifier('sin'), [AstFactory.constValue(3)]))
  })

  await t.step('should parse invocation with many arguments', () => {
    assertEquals(
      $ast`max(3, 5, 2)`,
      AstFactory.invoke(AstFactory.identifier('max'), [AstFactory.constValue(3), AstFactory.constValue(5), AstFactory.constValue(2)]),
    )
  })
  await t.step('should reject missing or repeated argument separators', () => {
    assertThrows(() => $ast`max(1 2)`)
    assertThrows(() => $ast`max(1,,2)`)
  })
  await t.step('should parse nested invocation', () => {
    assertEquals(
      $ast`a(b(c()))`,
      AstFactory.invoke(AstFactory.identifier('a'), [
        AstFactory.invoke(AstFactory.identifier('b'), [AstFactory.invoke(AstFactory.identifier('c'), [])]),
      ]),
    )
  })

  await t.step('should parse method invocation', () => {
    assertEquals(
      $ast`Math.max(3, 4)`,
      AstFactory.invoke(AstFactory.accessProperty(AstFactory.identifier('Math'), 'max'), [AstFactory.constValue(3), AstFactory.constValue(4)]),
    )
  })
  await t.step('should parse chained method invocation', () => {
    assertEquals(
      $ast`a().b().c()`,
      AstFactory.invoke(
        AstFactory.accessProperty(
          AstFactory.invoke(AstFactory.accessProperty(AstFactory.invoke(AstFactory.identifier('a'), []), 'b'), []),
          'c',
        ),
        [],
      ),
    )
  })
})
Deno.test('Parse array indexing', async (t) => {
  await t.step('should throw parsing empty []', () => {
    assertThrows(() => $ast`arr[]`)
  })
  await t.step('should parse array index', () => {
    assertEquals($ast`arr[0]`, AstFactory.index(AstFactory.identifier('arr'), AstFactory.constValue(0)))
  })
  await t.step('should parse array index [-a]', () => {
    assertEquals($ast`arr[-5]`, AstFactory.index(AstFactory.identifier('arr'), AstFactory.unary('-x', AstFactory.constValue(5))))
  })

  await t.step('should parse nesting indexing', () => {
    assertEquals(
      $ast`a[b[c[d]]]`,
      AstFactory.index(
        AstFactory.identifier('a'),
        AstFactory.index(AstFactory.identifier('b'), AstFactory.index(AstFactory.identifier('c'), AstFactory.identifier('d'))),
      ),
    )
  })
})

Deno.test('Parse array slicing', async (t) => {
  await t.step('should parse array index [:]', () => {
    assertEquals($ast`arr[:]`, AstFactory.slice(AstFactory.identifier('arr'), [{ start: undefined, end: undefined, step: undefined }]))
  })
  await t.step('should parse array index [::]', () => {
    assertEquals($ast`arr[::]`, AstFactory.slice(AstFactory.identifier('arr'), [{ start: undefined, end: undefined, step: undefined }]))
  })

  await t.step('should parse array index combinations with no colon', () => {
    assertAstNodeMatch(
      $ast`arr[2, 3, 4]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        { start: AstFactory.constValue(2) },
        { start: AstFactory.constValue(3) },
        { start: AstFactory.constValue(4) },
      ]),
    )
  })

  await t.step('should parse array index combinations with 1 colon', () => {
    assertAstNodeMatch(
      $ast`arr[:, 1:, :2, 3:4]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        {},
        { start: AstFactory.constValue(1) },
        { end: AstFactory.constValue(2) },
        { start: AstFactory.constValue(3), end: AstFactory.constValue(4) },
      ]),
    )
  })

  await t.step('should parse array index combinations with 2 colons', () => {
    assertAstNodeMatch(
      $ast`arr[::, 2::, :3:, ::4, 5:6:, 7::8, :9:0, A:B:C]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        {},
        { start: AstFactory.constValue(2) },
        { end: AstFactory.constValue(3) },
        { step: AstFactory.constValue(4) },
        { start: AstFactory.constValue(5), end: AstFactory.constValue(6) },
        { start: AstFactory.constValue(7), step: AstFactory.constValue(8) },
        { end: AstFactory.constValue(9), step: AstFactory.constValue(0) },
        { start: AstFactory.identifier('A'), end: AstFactory.identifier('B'), step: AstFactory.identifier('C') },
      ]),
    )
  })

  await t.step('should parse array slice [a:b]', () => {
    assertAstNodeMatch(
      $ast`arr[5:9]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        {
          start: AstFactory.constValue(5),
          end: AstFactory.constValue(9),
        },
      ]),
    )
  })
  await t.step('should parse array slice [a:b:c]', () => {
    assertAstNodeMatch(
      $ast`arr[9:3:2]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        {
          start: AstFactory.constValue(9),
          end: AstFactory.constValue(3),
          step: AstFactory.constValue(2),
        },
      ]),
    )
  })

  await t.step('should parse array slice [a, b]', () => {
    assertAstNodeMatch(
      $ast`arr[5, 6]`,
      AstFactory.slice(AstFactory.identifier('arr'), [{ start: AstFactory.constValue(5) }, { start: AstFactory.constValue(6) }]),
    )
  })
  await t.step('should parse array slice [:, :]', () => {
    assertAstNodeMatch($ast`arr[:, :]`, AstFactory.slice(AstFactory.identifier('arr'), [{}, {}]))
  })

  await t.step('should parse array slice [::, ::-1]', () => {
    assertAstNodeMatch(
      $ast`arr[::, ::-1]`,
      AstFactory.slice(AstFactory.identifier('arr'), [{}, { step: AstFactory.unary('-x', AstFactory.constValue(1)) }]),
    )
  })

  await t.step('should parse nested array slicing', () => {
    assertAstNodeMatch(
      $ast`arr[a[:] : b[:] , c[:]]`,
      AstFactory.slice(AstFactory.identifier('arr'), [
        {
          start: AstFactory.slice(AstFactory.identifier('a'), [{}]),
          end: AstFactory.slice(AstFactory.identifier('b'), [{}]),
        },
        { start: AstFactory.slice(AstFactory.identifier('c'), [{}]) },
      ]),
    )
  })

  await t.step('should reject malformed slices', () => {
    assertThrows(() => $ast`arr[:::]`)
    assertThrows(() => $ast`arr[1 2]`)
    assertThrows(() => $ast`arr[1,,2]`)
  })
})

Deno.test('Parse complex expressions', async (t) => {
  await t.step('should parse complex expression 1', () => {
    assertAstNodeMatch(
      $ast`1 + 2 * 3 - 4 / 5`,
      AstFactory.binary(
        AstFactory.binary(AstFactory.constValue(1), '+', AstFactory.binary(AstFactory.constValue(2), '*', AstFactory.constValue(3))),
        '-',
        AstFactory.binary(AstFactory.constValue(4), '/', AstFactory.constValue(5)),
      ),
    )
  })

  await t.step('parse complex expression 2', () => {
    assertAstNodeMatch(
      $ast`3 + (bob) * (x + 2) / sin(abs( -a ** 6)) - 'yes' `,
      AstFactory.binary(
        AstFactory.binary(
          AstFactory.constValue(3),
          '+',
          AstFactory.binary(
            AstFactory.binary(
              AstFactory.identifier('bob'),
              '*',
              AstFactory.binary(AstFactory.identifier('x'), '+', AstFactory.constValue(2)),
            ),
            '/',
            AstFactory.invoke(AstFactory.identifier('sin'), [
              AstFactory.invoke(AstFactory.identifier('abs'), [
                AstFactory.unary('-x', AstFactory.binary(AstFactory.identifier('a'), '**', AstFactory.constValue(6))),
              ]),
            ]),
          ),
        ),
        '-',
        AstFactory.constValue("'yes'", 'yes'),
      ),
    )
  })
})

Deno.test('Parse special cases', async (t) => {
  await t.step('should throw error parsing empty', () => {
    assertThrows(() => $ast``)
  })

  await t.step('should throw error parsing incomplete expression', () => {
    assertThrows(() => $ast`1 +`)
  })
})
