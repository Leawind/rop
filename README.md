[中文](./README.zh.md) | **English**

# rop (Runtime Operator Parser)

`rop` is a TypeScript/JavaScript library that parses and evaluates expressions via [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates). It supports **operator overloading** for custom and built-in types, enabling custom behaviors for JS operators and **Python-style array slicing**.

## Usage examples

Before reading the [Quick Tutorial](./test/quick-tutorial.test.ts), these examples below can help you understand what `rop` can do:

### Evaluate a simple expression

```ts
o`2 + 3`; // 5

// Value embedding
o`${2} + 3` // 5
```

### Array Slicing

Python-style array slicing syntax:

```ts
Rop.INST.bind({ arr: [1, 2, 3, 4, 5] });

// Basic slicing
o`arr[1:3]`; // [2, 3]

// Negative indices
o`arr[:-2]`; // [1, 2, 3]

// With step
o`arr[::2]`; // [1, 3, 5]

// Reverse
o`arr[::-1]`; // [5, 4, 3, 2, 1]

// Multi-dimensional slicing (for custom types)
o`${tensor}[2:5, 1:5, 4:7]`;
```

### Operator overload for Array

```ts
o`${[2, 3]} + ${[4, 5]}`; // [2, 3, 4, 5]
```

### Operator overloading for `Set`

```ts
Rop.INST.bind({
	a: new Set([1, 2, 3]),
	b: new Set([3, 4, 5]),
});
o`a + b`; // Set { 1, 2, 3, 4, 5 }
```

### Property access and indexing

```ts
Rop.INST.bind({
	obj: { name: 'Alice' },
	arr: [1, 2, 3],
});

// access property `name` on `obj`
o`obj.name`; // Alice

// index `obj` with `name`
o`obj['name']`; // Alice
o`arr[1]`; // 2
```

### Operator overloading for custom type `Vec2` (assume you have it implemented)

```ts
// bind identifiers `a` and `b`, so you can use them in the expression.
rop.bind({
	a: new Vec2(2, 3),
	b: new Vec2(3, 4),
});
rop.o<Vec2>`a + b`; // Vec2 { x: 5, y: 7 }
```
