import { assertEquals } from '@std/assert'
import { AstNode } from '../src/compiler/AstNode.ts'
import { Tokenizer } from '../src/compiler/tokenizer/Tokenizer.ts'
import { AstParser } from '../src/compiler/ast-parser/AstParser.ts'
import { Rop } from '../src/Rop.ts'

export function $raw(strings: TemplateStringsArray, ...args: unknown[]) {
  let result = ''
  const raw = strings.raw
  for (let i = 0; i < strings.length; i++) {
    result += Tokenizer.parseUnicodeEscapes(raw[i])
    if (i < args.length) {
      result += args[i]
    }
  }
  return result
}

export function $ast(strs: TemplateStringsArray, ...args: unknown[]): AstNode {
  const tokens = Tokenizer.tokenize(strs, ...args)
  const ast = new AstParser(tokens, Tokenizer.source(strs)).parse()
  return ast
}

export function $eval(strs: TemplateStringsArray, ...args: unknown[]): any {
  return Rop.INST.o(strs, ...args)
}

Deno.test('Test utils', async (t) => {
  await t.step('r tag', () => {
    assertEquals($raw``, '')

    assertEquals($raw`abc`, 'abc')
    assertEquals($raw`abc${1}`, 'abc1')
    assertEquals($raw`abc${1}def`, 'abc1def')
    assertEquals($raw`abc${1}def${2}`, 'abc1def2')
    assertEquals($raw`${1}def${2}ghi`, '1def2ghi')

    assertEquals($raw`你好`, '你好')

    assertEquals($raw`\n`, '\\n')
    assertEquals($raw`"\""`, '"\\""')
  })
})
