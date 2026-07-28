import { assertEquals, assertThrows } from '@std/assert'
import { Tokenizer } from '../../src/compiler/tokenizer/Tokenizer.ts'
import { TokenizingError } from '../../src/error.ts'
import { TokenFactory } from '../../src/compiler/tokenizer/TokenFactory.ts'

Deno.test('Tokenize single token', async (t) => {
  await t.step('should tokenize empty string', () => {
    assertEquals(Tokenizer.tokenize``, [])
  })

  await t.step('should ignore whitespaces', () => {
    assertEquals(Tokenizer.tokenize` `, [])
    assertEquals(Tokenizer.tokenize`	`, [])
    assertEquals(Tokenizer.tokenize(`\n`), [])
    assertEquals(Tokenizer.tokenize(`\n    	\n	  \n`), [])
    assertEquals(
      Tokenizer.tokenize` 	
			   
			  `,
      [],
    )
  })

  await t.step('should tokenize single value', () => {
    assertEquals(Tokenizer.tokenize`${2}`, [TokenFactory.embeddedValue(2)])
    assertEquals(Tokenizer.tokenize`${'hello'}`, [TokenFactory.embeddedValue('hello')])
  })

  await t.step('should tokenize single constant: number', () => {
    assertEquals(Tokenizer.tokenize`234`, [TokenFactory.constant('234', 234)])
    assertEquals(Tokenizer.tokenize`234.567`, [TokenFactory.constant('234.567', 234.567)])
    assertEquals(Tokenizer.tokenize`1e-4`, [TokenFactory.constant('1e-4', 1e-4)])
    assertEquals(Tokenizer.tokenize`1E-4`, [TokenFactory.constant('1E-4', 1e-4)])
    assertEquals(Tokenizer.tokenize`31415.926e-4`, [TokenFactory.constant('31415.926e-4', 31415.926e-4)])
    assertEquals(Tokenizer.tokenize`0.31415e1`, [TokenFactory.constant('0.31415e1', 0.31415e1)])
    assertEquals(Tokenizer.tokenize`2998e+5`, [TokenFactory.constant('2998e+5', 2998e5)])
    assertEquals(Tokenizer.tokenize`3.14159265358979323846264338327`, [
      TokenFactory.constant('3.14159265358979323846264338327', 3.14159265358979323846264338327),
    ])
    assertEquals(Tokenizer.tokenize`0xFF`, [TokenFactory.constant('0xFF', 255)])
    assertEquals(Tokenizer.tokenize`0b1010`, [TokenFactory.constant('0b1010', 10)])
    assertEquals(Tokenizer.tokenize`0o755`, [TokenFactory.constant('0o755', 493)])
    assertEquals(Tokenizer.tokenize`1_000_000`, [TokenFactory.constant('1_000_000', 1_000_000)])
    assertEquals(Tokenizer.tokenize`.5`, [TokenFactory.constant('.5', 0.5)])
  })
  await t.step('should tokenize single constant: bigint', () => {
    assertEquals(Tokenizer.tokenize`123n`, [TokenFactory.constant('123n', 123n)])
    assertEquals(Tokenizer.tokenize`43252352354n`, [TokenFactory.constant('43252352354n', 43252352354n)])
    assertEquals(Tokenizer.tokenize`0xFFn`, [TokenFactory.constant('0xFFn', 255n)])
  })
  await t.step('should tokenize single constant: string', () => {
    assertEquals(Tokenizer.tokenize`'Hello world!'`, [TokenFactory.constant("'Hello world!'", 'Hello world!')])
    assertEquals(Tokenizer.tokenize`"I said 'yes'"`, [TokenFactory.constant(`"I said 'yes'"`, "I said 'yes'")])
    assertEquals(Tokenizer.tokenize`'I said "yes"'`, [TokenFactory.constant(`'I said "yes"'`, 'I said "yes"')])
    assertEquals(Tokenizer.tokenize`"I said \"yes\""`, [TokenFactory.constant(`"I said \\"yes\\""`, 'I said "yes"')])
    assertEquals(Tokenizer.tokenize`'I said \'yes\''`, [TokenFactory.constant(`'I said \\'yes\\''`, "I said 'yes'")])

    assertEquals(Tokenizer.tokenize`"I say 'yes', you say \"no\""`, [
      TokenFactory.constant(`"I say 'yes', you say \\"no\\""`, `I say 'yes', you say "no"`),
    ])
    assertEquals(Tokenizer.tokenize`'line\n\t\x41\u{1F600}'`, [TokenFactory.constant(`'line\\n\\t\\x41\\u{1F600}'`, 'line\n\tA😀')])
  })

  await t.step('should tokenize single identity with ascii characters', () => {
    assertEquals(Tokenizer.tokenize`boolean`, [TokenFactory.identifier('boolean')])
    assertEquals(Tokenizer.tokenize`true`, [TokenFactory.identifier('true')])
    assertEquals(Tokenizer.tokenize`false`, [TokenFactory.identifier('false')])
    assertEquals(Tokenizer.tokenize`Infinity`, [TokenFactory.identifier('Infinity')])
    assertEquals(Tokenizer.tokenize`myVar`, [TokenFactory.identifier('myVar')])
    assertEquals(Tokenizer.tokenize`customName`, [TokenFactory.identifier('customName')])
  })

  await t.step('should tokenize single identity with special characters', () => {
    assertEquals(Tokenizer.tokenize`hello`, [TokenFactory.identifier('hello')])
    assertEquals(Tokenizer.tokenize`你好`, [TokenFactory.identifier('你好')])
    assertEquals(Tokenizer.tokenize`\u4F60\u597D`, [TokenFactory.identifier('你好')])
    assertEquals(Tokenizer.tokenize`Γειά`, [TokenFactory.identifier('Γειά')])
    assertEquals(Tokenizer.tokenize`مرحبًا`, [TokenFactory.identifier('مرحبًا')])
    assertEquals(Tokenizer.tokenize`Привет`, [TokenFactory.identifier('Привет')])
    assertEquals(Tokenizer.tokenize`こんにちは`, [TokenFactory.identifier('こんにちは')])
    assertEquals(Tokenizer.tokenize`안녕하세요`, [TokenFactory.identifier('안녕하세요')])
    assertEquals(Tokenizer.tokenize`שלום`, [TokenFactory.identifier('שלום')])

    assertEquals(Tokenizer.tokenize`$_mixed_混合_123`, [TokenFactory.identifier('$_mixed_混合_123')])
  })

  await t.step('should tokenize single operator', () => {
    assertEquals(Tokenizer.tokenize`~`, [TokenFactory.operator('~')])
    assertEquals(Tokenizer.tokenize`!`, [TokenFactory.operator('!')])

    assertEquals(Tokenizer.tokenize`+`, [TokenFactory.operator('+')])
    assertEquals(Tokenizer.tokenize`-`, [TokenFactory.operator('-')])
    assertEquals(Tokenizer.tokenize`*`, [TokenFactory.operator('*')])
    assertEquals(Tokenizer.tokenize`/`, [TokenFactory.operator('/')])
    assertEquals(Tokenizer.tokenize`%`, [TokenFactory.operator('%')])
    assertEquals(Tokenizer.tokenize`**`, [TokenFactory.operator('**')])
    assertEquals(Tokenizer.tokenize`<<`, [TokenFactory.operator('<<')])
    assertEquals(Tokenizer.tokenize`>>`, [TokenFactory.operator('>>')])
    assertEquals(Tokenizer.tokenize`>>>`, [TokenFactory.operator('>>>')])
    assertEquals(Tokenizer.tokenize`&`, [TokenFactory.operator('&')])
    assertEquals(Tokenizer.tokenize`|`, [TokenFactory.operator('|')])
    assertEquals(Tokenizer.tokenize`^`, [TokenFactory.operator('^')])
    assertEquals(Tokenizer.tokenize`&&`, [TokenFactory.operator('&&')])
    assertEquals(Tokenizer.tokenize`||`, [TokenFactory.operator('||')])
    assertEquals(Tokenizer.tokenize`==`, [TokenFactory.operator('==')])
    assertEquals(Tokenizer.tokenize`===`, [TokenFactory.operator('===')])
    assertEquals(Tokenizer.tokenize`!=`, [TokenFactory.operator('!=')])
    assertEquals(Tokenizer.tokenize`!==`, [TokenFactory.operator('!==')])
    assertEquals(Tokenizer.tokenize`>`, [TokenFactory.operator('>')])
    assertEquals(Tokenizer.tokenize`<`, [TokenFactory.operator('<')])
    assertEquals(Tokenizer.tokenize`>=`, [TokenFactory.operator('>=')])
    assertEquals(Tokenizer.tokenize`<=`, [TokenFactory.operator('<=')])
  })

  await t.step('should tokenize single grouper', () => {
    assertEquals(Tokenizer.tokenize`(`, [TokenFactory.punctuation('(')])
    assertEquals(Tokenizer.tokenize`)`, [TokenFactory.punctuation(')')])
    assertEquals(Tokenizer.tokenize`[`, [TokenFactory.punctuation('[')])
    assertEquals(Tokenizer.tokenize`]`, [TokenFactory.punctuation(']')])
    assertEquals(Tokenizer.tokenize`{`, [TokenFactory.punctuation('{')])
    assertEquals(Tokenizer.tokenize`}`, [TokenFactory.punctuation('}')])
  })
})

Deno.test('Tokenize expression', async (t) => {
  await t.step('should tokenize value operation', () => {
    assertEquals(Tokenizer.tokenize`${2} ** (${6} + ${2})`, [
      TokenFactory.embeddedValue(2),
      TokenFactory.operator('**'),
      TokenFactory.punctuation('('),
      TokenFactory.embeddedValue(6),
      TokenFactory.operator('+'),
      TokenFactory.embeddedValue(2),
      TokenFactory.punctuation(')'),
    ])
  })

  await t.step('should tokenize value, number and bigint', () => {
    assertEquals(Tokenizer.tokenize`${123} + 456 * 32n`, [
      TokenFactory.embeddedValue(123),
      TokenFactory.operator('+'),
      TokenFactory.constant('456', 456),
      TokenFactory.operator('*'),
      TokenFactory.constant('32n', 32n),
    ])
  })

  await t.step('should tokenize strings', () => {
    assertEquals(Tokenizer.tokenize`'hey' + "wow"`, [
      TokenFactory.constant("'hey'", 'hey'),
      TokenFactory.operator('+'),
      TokenFactory.constant('"wow"', 'wow'),
    ])
  })

  await t.step('should tokenize identifiers', () => {
    assertEquals(Tokenizer.tokenize`true + customName`, [
      TokenFactory.identifier('true'),
      TokenFactory.operator('+'),
      TokenFactory.identifier('customName'),
    ])
  })

  await t.step('should tokenize groupers', () => {
    assertEquals(Tokenizer.tokenize`2 * (7 + 4)`, [
      TokenFactory.constant('2', 2),
      TokenFactory.operator('*'),
      TokenFactory.punctuation('('),
      TokenFactory.constant('7', 7),
      TokenFactory.operator('+'),
      TokenFactory.constant('4', 4),
      TokenFactory.punctuation(')'),
    ])
  })

  await t.step('should tokenize function call', () => {
    assertEquals(Tokenizer.tokenize`cos(3)`, [
      TokenFactory.identifier('cos'),
      TokenFactory.punctuation('('),
      TokenFactory.constant('3', 3),
      TokenFactory.punctuation(')'),
    ])
  })
  await t.step('should tokenize array indexing', () => {
    assertEquals(Tokenizer.tokenize`arr[3]`, [
      TokenFactory.identifier('arr'),
      TokenFactory.punctuation('['),
      TokenFactory.constant('3', 3),
      TokenFactory.punctuation(']'),
    ])
  })
  await t.step('should tokenize array slicing', () => {
    assertEquals(Tokenizer.tokenize`arr[4:5]`, [
      TokenFactory.identifier('arr'),
      TokenFactory.punctuation('['),
      TokenFactory.constant('4', 4),
      TokenFactory.punctuation(':'),
      TokenFactory.constant('5', 5),
      TokenFactory.punctuation(']'),
    ])

    assertEquals(Tokenizer.tokenize`tensor[3:4, 5:6:-1]`, [
      TokenFactory.identifier('tensor'),
      TokenFactory.punctuation('['),
      TokenFactory.constant('3', 3),
      TokenFactory.punctuation(':'),
      TokenFactory.constant('4', 4),
      TokenFactory.punctuation(','),
      TokenFactory.constant('5', 5),
      TokenFactory.punctuation(':'),
      TokenFactory.constant('6', 6),
      TokenFactory.punctuation(':'),
      TokenFactory.operator('-'),
      TokenFactory.constant('1', 1),
      TokenFactory.punctuation(']'),
    ])
  })

  await t.step('should tokenize chained property access', () => {
    assertEquals(Tokenizer.tokenize`Math.max.prototype`, [
      TokenFactory.identifier('Math'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('max'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('prototype'),
    ])
  })

  await t.step('should tokenize chained method calls', () => {
    assertEquals(Tokenizer.tokenize`a.b().c()`, [
      TokenFactory.identifier('a'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('b'),
      TokenFactory.punctuation('('),
      TokenFactory.punctuation(')'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('c'),
      TokenFactory.punctuation('('),
      TokenFactory.punctuation(')'),
    ])
  })

  await t.step('should tokenize invocation with multiple arguments', () => {
    assertEquals(Tokenizer.tokenize`max(3, 16n, 'hey')`, [
      TokenFactory.identifier('max'),
      TokenFactory.punctuation('('),
      TokenFactory.constant('3', 3),
      TokenFactory.punctuation(','),
      TokenFactory.constant('16n', 16n),
      TokenFactory.punctuation(','),
      TokenFactory.constant("'hey'", 'hey'),
      TokenFactory.punctuation(')'),
    ])
  })
})

Deno.test('Tokenize complex expressions', async (t) => {
  await t.step('should tokenize complex expression 1', () => {
    assertEquals(Tokenizer.tokenize`3 + (bob) * (x + 2) / sin(abs( -a ** 6)) - 'yes' `, [
      TokenFactory.constant('3', 3),
      TokenFactory.operator('+'),
      TokenFactory.punctuation('('),
      TokenFactory.identifier('bob'),
      TokenFactory.punctuation(')'),
      TokenFactory.operator('*'),
      TokenFactory.punctuation('('),
      TokenFactory.identifier('x'),
      TokenFactory.operator('+'),
      TokenFactory.constant('2', 2),
      TokenFactory.punctuation(')'),
      TokenFactory.operator('/'),
      TokenFactory.identifier('sin'),
      TokenFactory.punctuation('('),
      TokenFactory.identifier('abs'),
      TokenFactory.punctuation('('),
      TokenFactory.operator('-'),
      TokenFactory.identifier('a'),
      TokenFactory.operator('**'),
      TokenFactory.constant('6', 6),
      TokenFactory.punctuation(')'),
      TokenFactory.punctuation(')'),
      TokenFactory.operator('-'),
      TokenFactory.constant("'yes'", 'yes'),
    ])
  })
  await t.step('should tokenize complex expression 2', () => {
    assertEquals(Tokenizer.tokenize`abc().方法((34))(9.3) + 'abc'.qwer`, [
      TokenFactory.identifier('abc'),
      TokenFactory.punctuation('('),
      TokenFactory.punctuation(')'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('方法'),
      TokenFactory.punctuation('('),
      TokenFactory.punctuation('('),
      TokenFactory.constant('34', 34),
      TokenFactory.punctuation(')'),
      TokenFactory.punctuation(')'),
      TokenFactory.punctuation('('),
      TokenFactory.constant('9.3', 9.3),
      TokenFactory.punctuation(')'),
      TokenFactory.operator('+'),
      TokenFactory.constant("'abc'", 'abc'),
      TokenFactory.punctuation('.'),
      TokenFactory.identifier('qwer'),
    ])
  })
})

Deno.test('Tokenize unexpected character', async (t) => {
  await t.step('should throw an error', () => {
    assertThrows(() => {
      Tokenizer.tokenize`3 + 🌍`
    }, TokenizingError)
  })

  await t.step('should reject malformed literals', () => {
    for (const source of ['1e', '1n.2', '0x', '1__0', "'unterminated", "'line\nbreak'"]) {
      assertThrows(() => Tokenizer.tokenize(source), TokenizingError)
    }
  })
})
