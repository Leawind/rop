# rop (运行时操作符解析器)

`rop` 是一个通过[带标签的模板字面量语法](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)解析和计算表达式的 TypeScript/JavaScript 库。它支持对自定义类型和内置类型的**操作符重载**，能够为 JS 操作符启用自定义行为，并支持**Python 风格的数组切片**。

## 使用示例

在阅读[快速教程](./test/quick-tutorial.test.ts)之前，以下示例可以使你了解 `rop` 能做什么：

### 计算简单表达式

```ts
o`2 + 3`; // 5
```

### 数组切片

Python 风格的数组切片语法：

```ts
Rop.INST.bind({ arr: [1, 2, 3, 4, 5] });

// 基本切片
o`arr[1:3]`; // [2, 3]

// 负索引
o`arr[:-2]`; // [1, 2, 3]

// 步长
o`arr[::2]`; // [1, 3, 5]

// 反转
o`arr[::-1]`; // [5, 4, 3, 2, 1]

// 多维切片（适用于自定义类型）
o`${tensor}[2:5, 1:5, 4:7]`;
```

### 数组的操作符重载

```ts
o`${[2, 3]} + ${[4, 5]}`; // [2, 3, 4, 5]
```

### `Set` 类型的操作符重载

```ts
Rop.INST.bind({
	a: new Set([1, 2, 3]),
	b: new Set([3, 4, 5]),
});
o`a + b`; // Set { 1, 2, 3, 4, 5 }
```

### 属性访问和索引

```ts
Rop.INST.bind({
	obj: { name: 'Alice' },
	arr: [1, 2, 3],
});

// 访问 `obj` 的属性 `name`
o`obj.name`; // Alice

// 使用 `name` 对 `obj` 进行索引
o`obj['name']`; // Alice
o`arr[1]`; // 2
```

### 自定义类型 `Vec2` 的操作符重载（假设已实现）

```ts
// 绑定标识符 `a` 和 `b`，以便在表达式中使用它们。
rop.bind({
	a: new Vec2(2, 3),
	b: new Vec2(3, 4),
});
rop.o<Vec2>`a + b`; // Vec2 { x: 5, y: 7 }
```
