[中文](./README.zh.md) | **English**

[![GitHub License](https://img.shields.io/github/license/Leawind/rop?color=%2377f)](https://github.com/Leawind/rop)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Leawind/rop/verify.yaml?branch=main&logo=github-actions&label=test)](https://github.com/Leawind/rop/actions/workflows/verify.yaml)
[![NPM Version](https://img.shields.io/npm/v/@leawind/rop?color=bc3433)](https://www.npmjs.com/package/@leawind/rop)

# rop (Runtime Operator Parser)

`rop` is a TypeScript/JavaScript library that parses and evaluates expressions via [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates). It supports **operator overloading** for custom and built-in types, enabling custom behaviors for JS operators and **Python-style array slicing**.

> [!WARNING]
> ROP is an expression evaluator, not a security sandbox. Never evaluate expressions from users, networks, or other untrusted sources.

`Rop.INST` and its `o` alias are process-wide mutable conveniences. Use `new Rop()` and keep that instance in the desired scope when bindings or overloads must be isolated.

## Usage examples

Before reading the [Quick Tutorial](./test/quick-tutorial.test.ts), these examples below show what `rop` can do:

### Evaluate a simple expression

```ts
o`2 + 3` // 5

// Value embedding
o`${2} + 3` // 5
```

### Compile a reusable expression

Use `Rop.arg(index, name?)` directly in a template interpolation to mark a positional function argument:

```ts
const rop = new Rop().overloadDefaults()
const x = Rop.arg<number>(0, 'x')
const y = Rop.arg<number>(1, 'y')

const calculate = rop.compile<[number, number], number>`${x} * 2 + ${y}`
calculate(3, 4) // 10
```

Argument indexes may be repeated or appear out of order. Missing arguments throw a `RopTypeError`; passing `undefined` explicitly still counts as providing an argument. The generic type on `Rop.arg<T>()` is TypeScript-only and does not perform runtime validation.

Ordinary interpolations are captured when `compile` is called. Bindings and operator overloads belong to the `Rop` instance and are looked up each time the compiled function runs:

```ts
const offset = 2
const calculate = rop.compile<[number], number>`${x} + ${offset} + dynamicOffset`
```

Only a placeholder used as a direct interpolation is special. For example, `${{ value: x }}` embeds that object as an ordinary captured value.

### Array Slicing

Python-style array slicing syntax:

```ts
Rop.INST.bind({ arr: [1, 2, 3, 4, 5] })

// Basic slicing
o`arr[1:3]` // [2, 3]

// Negative indices
o`arr[:-2]` // [1, 2, 3]

// With step
o`arr[::2]` // [1, 3, 5]

// Reverse
o`arr[::-1]` // [5, 4, 3, 2, 1]

// Multi-dimensional slicing (for custom types)
o`${tensor}[2:5, 1:5, 4:7]`
```

### Operator overload for Array

```ts
o`${[2, 3]} + ${[4, 5]}` // [2, 3, 4, 5]
```

### Operator overloading for `Set`

```ts
Rop.INST.bind({
  a: new Set([1, 2, 3]),
  b: new Set([3, 4, 5]),
})
o`a + b` // Set { 1, 2, 3, 4, 5 }
```

### Property access and indexing

```ts
Rop.INST.bind({
  obj: { name: 'Alice' },
  arr: [1, 2, 3],
})

// access property `name` on `obj`
o`obj.name` // Alice

// index `obj` with `name`
o`obj['name']` // Alice
o`arr[1]` // 2
```

### Operator overloading for custom type `Vec2` (assume you have it implemented)

```ts
// bind identifiers `a` and `b`, so you can use them in the expression.
rop.bind({
  a: new Vec2(2, 3),
  b: new Vec2(3, 4),
})
rop.o<Vec2>`a + b` // Vec2 { x: 5, y: 7 }
```

### Reverse operator overloading

Normal and reverse overloads are intentionally distinct. A normal overload such as `-` is searched on the left operand; its reverse form `r-` is searched on the right operand:

```ts
rop.overloads(Box, {
  '-': (self: Box, other: number) => self.value - other,
  'r-': (self: Box, other: number) => other - self.value,
})

rop.o`${new Box(10)} - 3` // 7
rop.o`20 - ${new Box(6)}` // 14
```

Reverse names are available for every binary operator by prefixing its name with `r`. Unknown overload names throw immediately instead of being ignored.

### Errors

Tokenizer, parser, reference, and evaluation failures expose a stable error code and source span. Use `error.format({ color: true })` to render the relevant source lines when displaying a ROP error in a terminal.
