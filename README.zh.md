**中文** | [English](./README.md)

[![GitHub License](https://img.shields.io/github/license/Leawind/rop?color=%2377f)](https://github.com/Leawind/rop)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Leawind/rop/verify.yaml?branch=main&logo=github-actions&label=test)](https://github.com/Leawind/rop/actions/workflows/verify.yaml)
[![NPM Version](https://img.shields.io/npm/v/@leawind/rop?color=bc3433)](https://www.npmjs.com/package/@leawind/rop)

# rop (Runtime Operator Parser)

`rop` 是一个能通过[带标签的模板字面量语法](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)解析和计算表达式的 TypeScript/JavaScript 库。它支持对自定义类型和内置类型的**操作符重载**，能够为 JS 操作符启用自定义行为，并支持**Python 风格的数组切片**。

> [!WARNING]
> ROP 是表达式求值工具，不是安全沙箱。不要执行来自用户、网络或其他不可信来源的表达式。

`Rop.INST` 及其别名 `o` 是进程级的可变便利实例。如果绑定或重载需要限制在特定作用域，请使用 `new Rop()` 并自行管理该实例。

## 使用示例

在阅读[快速教程](./test/quick-tutorial.test.ts)之前，以下示例展示了 `rop` 能做什么：

### 计算简单表达式

```ts
o`2 + 3` // 5

// 值嵌入
o`${2} + 3` // 5
```

### 数组切片

Python 风格的数组切片语法：

```ts
Rop.INST.bind({ arr: [1, 2, 3, 4, 5] })

// 基本切片
o`arr[1:3]` // [2, 3]

// 负索引
o`arr[:-2]` // [1, 2, 3]

// 步长
o`arr[::2]` // [1, 3, 5]

// 反转
o`arr[::-1]` // [5, 4, 3, 2, 1]

// 多维切片（适用于自定义类型）
o`${tensor}[2:5, 1:5, 4:7]`
```

### 数组的操作符重载

```ts
o`${[2, 3]} + ${[4, 5]}` // [2, 3, 4, 5]
```

### `Set` 类型的操作符重载

```ts
Rop.INST.bind({
  a: new Set([1, 2, 3]),
  b: new Set([3, 4, 5]),
})
o`a + b` // Set { 1, 2, 3, 4, 5 }
```

### 属性访问和索引

```ts
Rop.INST.bind({
  obj: { name: 'Alice' },
  arr: [1, 2, 3],
})

// 访问 `obj` 的属性 `name`
o`obj.name` // Alice

// 使用 `name` 对 `obj` 进行索引
o`obj['name']` // Alice
o`arr[1]` // 2
```

### 自定义类型 `Vec2` 的操作符重载（假设已实现）

```ts
// 绑定标识符 `a` 和 `b`，以便在表达式中使用它们。
rop.bind({
  a: new Vec2(2, 3),
  b: new Vec2(3, 4),
})
rop.o<Vec2>`a + b` // Vec2 { x: 5, y: 7 }
```

### 反向操作符重载

普通重载和反向重载是相互独立的。普通重载（如 `-`）在左操作数上查找；对应的反向重载 `r-` 在右操作数上查找：

```ts
rop.overloads(Box, {
  '-': (self: Box, other: number) => self.value - other,
  'r-': (self: Box, other: number) => other - self.value,
})

rop.o`${new Box(10)} - 3` // 7
rop.o`20 - ${new Box(6)}` // 14
```

每个二元操作符都可以通过在名称前添加 `r` 得到反向名称。未知的重载名称会立即抛错，不再被静默忽略。

### 错误

词法、语法、引用和求值错误都提供稳定的错误代码与源码范围。在终端中显示错误时，可以使用 `error.format({ color: true })` 渲染相关源码。
