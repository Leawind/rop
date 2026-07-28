import { AstParser } from './compiler/ast-parser/AstParser.ts'
import { Evaluator } from './compiler/evaluator/Evaluator.ts'
import {
  BinaryOperationArrowFn,
  BinaryOperationName,
  OperationFn,
  OperationName,
  Operations,
  ReverseBinaryOperationName,
  UnaryOperationArrowFn,
  UnaryOperationName,
} from './compiler/Operators.ts'
import { Tokenizer } from './compiler/tokenizer/Tokenizer.ts'
import { Clazz, normalizeIndex, Slice, sliceArray } from './utils/index.ts'
import { AstNode } from './compiler/AstNode.ts'
import { TokenType } from './compiler/Token.ts'
import { RopTypeError } from './error.ts'
import { SourceSpan } from './source.ts'

type BoundOperation<R = unknown> = (...args: any[]) => R

const ropArguments = new WeakSet<object>()

/** A positional argument placeholder used by {@link Rop.compile}. */
export interface RopArgument<T = unknown> {
  readonly index: number
  readonly name?: string
  /** @internal Carries `T` for TypeScript without adding a runtime field. */
  readonly __type?: T
}

/** A function produced by {@link Rop.compile}. */
export type CompiledExpression<Args extends readonly unknown[], Result> = (...args: Args) => Result

interface CachedTemplate {
  source: string
  ast: AstNode
  embeddedSpans: readonly SourceSpan[]
}

export class Rop {
  /**
   * { Clazz.prototype --> { Operation.symbol --> OperationFn } }
   */
  private readonly overloadings: Map<object, Map<symbol, BoundOperation>> = new Map()

  /**
   * { identifier_name --> value } []
   *
   * An array of binding maps. Each binding map contains map of identifier name to value.
   *
   * Those identifiers can be used in the template string.
   */
  public readonly bindings: Map<string, unknown> = new Map()

  private static readonly templateCache = new WeakMap<TemplateStringsArray, CachedTemplate>()

  public constructor() {}

  /**
   * Get the template evaluator function.
   *
   * This property returns a tagged template function that can evaluate expressions.
   *
   * ### Example
   * ```ts
   * const rop = new Rop();
   * const result = rop.o`1 + 2`; // 3
   * ```
   */
  public o<T = any>(strs: TemplateStringsArray, ...args: unknown[]): T {
    const template = Rop.getTemplate(strs, args)
    const result = new Evaluator(template.ast, this, template.source, args).evaluate<T>()
    return result
  }

  /**
   * Create a positional argument placeholder for {@link Rop.compile}.
   *
   * The optional type parameter is only used by TypeScript; it is not checked at runtime.
   */
  public static arg<T = unknown>(index: number, name?: string): RopArgument<T> {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new RangeError(`Argument index must be a non-negative safe integer, received ${index}`)
    }
    const argument = Object.freeze(name === undefined ? { index } : { index, name }) as RopArgument<T>
    ropArguments.add(argument)
    return argument
  }

  /**
   * Compile an expression template into a reusable function.
   *
   * Ordinary interpolated values are captured now. Direct interpolations created by
   * {@link Rop.arg} are read from the returned function's positional arguments.
   */
  public compile<Args extends readonly unknown[] = readonly unknown[], Result = unknown>(
    strs: TemplateStringsArray,
    ...values: unknown[]
  ): CompiledExpression<Args, Result> {
    const template = Rop.getTemplate(strs, values)
    const namedArguments = new Map<number, string>()

    for (let slot = 0; slot < values.length; slot++) {
      const value = values[slot]
      if (!Rop.isArgument(value) || value.name === undefined) {
        continue
      }
      const previousName = namedArguments.get(value.index)
      if (previousName !== undefined && previousName !== value.name) {
        throw new RopTypeError(
          template.source,
          template.embeddedSpans[slot],
          `Argument ${value.index} has conflicting names: '${previousName}' and '${value.name}'`,
        )
      }
      namedArguments.set(value.index, value.name)
    }

    return ((...args: Args): Result => {
      const embeddedValues = values.map((value, slot) => {
        if (!Rop.isArgument(value)) {
          return value
        }
        if (value.index >= args.length) {
          const label = value.name === undefined ? `Argument ${value.index}` : `Argument ${value.index} ('${value.name}')`
          throw new RopTypeError(template.source, template.embeddedSpans[slot], `${label} was not provided`)
        }
        return args[value.index]
      })
      return new Evaluator(template.ast, this, template.source, embeddedValues).evaluate<Result>()
    }) as CompiledExpression<Args, Result>
  }

  private static isArgument(value: unknown): value is RopArgument {
    return typeof value === 'object' && value !== null && ropArguments.has(value)
  }

  private static getTemplate(strs: TemplateStringsArray, values: readonly unknown[]): CachedTemplate {
    let template = Rop.templateCache.get(strs)
    if (template === undefined) {
      const source = Tokenizer.source(strs)
      const tokens = Tokenizer.tokenize(strs, ...values)
      const embeddedSpans = tokens.filter((token) => token.type === TokenType.Embedded).map((token) => token.span)
      template = { source, ast: new AstParser(tokens, source).parse(), embeddedSpans }
      Rop.templateCache.set(strs, template)
    }
    return template
  }

  /**
   * Bind a value to an identifier, or bind multiple values from an object or Map.
   *
   * ### Example
   *
   * ```ts
   * const rop = new Rop();
   * // Bind a single value
   * rop.bind('a', 1).bind('b', 2);
   * // Bind multiple values from an object
   * rop.bind({ a: 1, b: 2 });
   * // Bind multiple values from a Map
   * rop.bind(new Map([['a', 1], ['b', 2]]));
   *
   * const result = rop.o`a + b`; // 3
   * ```
   *
   * @param args - Either a key-value pair, an object with multiple key-value pairs, or a Map
   */
  public bind(key: string, value: unknown): this
  public bind(bindings: Record<string, unknown>): this
  public bind(bindings: ReadonlyMap<string, unknown>): this
  public bind(...args: [key: string, value: unknown] | [bindings: Record<string, unknown>] | [bindings: ReadonlyMap<string, unknown>]): this {
    if (typeof args[0] === 'string') {
      const [key, value] = args
      this.bindings.set(key, value)
    } else if (args[0] instanceof Map) {
      for (const [key, value] of args[0].entries()) {
        this.bindings.set(key, value)
      }
    } else {
      for (const [key, value] of Object.entries(args[0])) {
        this.bindings.set(key, value)
      }
    }
    return this
  }

  /**
   * Remove bindings for the specified keys.
   *
   * ### Example
   *
   * ```ts
   * const rop = new Rop().bind({ a: 1, b: 2 });
   * rop.unbind('a');
   * rop.unbind('b', 'c');
   * ```
   *
   * @param keys - The keys to unbind
   */
  public unbind(...keys: string[]): this {
    for (const k of keys) {
      this.bindings.delete(k)
    }
    return this
  }

  /**
   * Get the operation symbol for the given operation name.
   *
   * @param name - The operation name.
   * @returns The operation symbol.
   * @throws {Error} If the operation name is not valid.
   */
  public static op(name: OperationName): symbol {
    if (!Operations.isKnownOperation(name)) {
      throw new Error(`Unknown operation name: '${name}'`)
    }
    return Operations.symbol(name)
  }

  /**
   * Set the overloaded operation to a prototype object
   *
   * @param prototype - The prototype object.
   * @param symbol - The operation symbol.
   * @param operationFn - The operation function.
   */
  private setOverload<T>(prototype: any, symbol: symbol, operationFn: OperationFn): void {
    if (!this.overloadings.has(prototype)) {
      this.overloadings.set(prototype, new Map())
    }
    const classOverloads = this.overloadings.get(prototype)!

    classOverloads.set(symbol, function (this: unknown, ...args: unknown[]) {
      return operationFn(this, ...args)
    })
  }

  /**
   * Overload a single operation for a class.
   *
   * This method stores the operation function in the Rop instance, not the Class.prototype.
   *
   * ### Example
   *
   * ```ts
   * class Vec2 {
   *   constructor(public x: number, public y: number) {}
   * }
   *
   * const rop = new Rop();
   * rop.overload(Vec2, '+', (self: Vec2, other: Vec2) => {
   *   return new Vec2(self.x + other.x, self.y + other.y);
   * });
   * ```
   *
   * @param clazz - The class to overload the operation for
   * @param operation - The operation name or symbol to overload
   * @param operationFn - The function that implements the operation
   */
  public overload<T>(clazz: Clazz, operation: UnaryOperationName, operationFn: UnaryOperationArrowFn<T>): this
  public overload<T>(clazz: Clazz, operation: BinaryOperationName, operationFn: BinaryOperationArrowFn<T>): this
  public overload<T>(clazz: Clazz, operation: ReverseBinaryOperationName, operationFn: BinaryOperationArrowFn<T>): this
  public overload<T>(clazz: Clazz, operation: symbol, operationFn: OperationFn<T>): this
  public overload<T>(clazz: Clazz, operation: OperationName | symbol, operationFn: OperationFn<T>): this
  public overload<T>(clazz: Clazz, op: OperationName | symbol, operationFn: OperationFn<T>): this {
    if (clazz.prototype === undefined) {
      throw new TypeError('clazz must be a class')
    }
    const symbol = Operations.symbol(op)
    if (symbol === null) {
      throw new TypeError(`Unknown operation: ${String(op)}`)
    }
    this.setOverload(clazz.prototype, symbol, operationFn)
    return this
  }

  /**
   * Overload multiple operations for a class at once.
   *
   * ### Examples
   *
   * ```ts
   * class Vec2 {
   *   constructor(public x: number, public y: number) {}
   * }
   *
   * const rop = new Rop()
   * rop.overloads(Vec2, {
   *   // All instance-level overloads receive the overloaded value as `self`.
   *   '+': (self: Vec2, other: Vec2) => {
   *     return new Vec2(self.x + other.x, self.y + other.y);
   *   },
   *   '==': (self: Vec2, other: Vec2) => {
   *     return self.x === other.x && self.y === other.y;
   *   },
   * })
   * ```
   *
   * @param clazz - The class to overload operations for
   * @param def - An object mapping operation names or symbols to their implementation functions
   */
  public overloads(clazz: Clazz, def: Partial<Record<OperationName | symbol, OperationFn<any>>>): this {
    if (clazz.prototype === undefined) {
      throw new TypeError('clazz must be a class')
    }

    for (const key of Reflect.ownKeys(def)) {
      const symbol = Operations.symbol(key)
      if (symbol === null) {
        throw new TypeError(`Unknown operation: ${String(key)}`)
      }
      const operationFn = def[key as keyof typeof def]!
      if (typeof operationFn !== 'function') {
        throw new TypeError(`Expected operation function '${symbol.description}' to be a function, but got ${typeof operationFn}`)
      }

      this.setOverload(clazz.prototype, symbol, operationFn)
    }
    return this
  }

  /**
   * Get the overloaded operation function on a prototype chain.
   *
   * @param prototype prototype object. Get by `Object.getPrototypeOf(inst)` or `Clazz.prototype`
   * @param symbol operation symbol. Get by `Operations.symbol(op)` or `Operations.meta(op).symbol`
   */
  private getOverloadFromPrototypeChain(prototype: any, symbol: symbol): BoundOperation | null {
    let p = prototype
    while (p !== null) {
      // Check if the class has overloaded the operation
      const classOverloads = this.overloadings.get(p)
      if (classOverloads !== undefined && classOverloads.has(symbol)) {
        return classOverloads.get(symbol) ?? null
      }

      // Check if the symbol is a property of the prototype
      if (typeof p === 'object' && symbol in p && typeof p[symbol] === 'function') {
        return p[symbol]
      }

      p = Object.getPrototypeOf(p)
    }
    return null
  }

  /**
   * Get the overloaded operation function for a class.
   *
   * @param clazz - The class to check for operation overload
   * @param symbol - The operation symbol
   * @returns The overloaded operation function, or null if not found
   */
  public getOverloadOnClass<T>(clazz: Clazz<T>, symbol: symbol): BoundOperation | null {
    return this.getOverloadFromPrototypeChain(clazz.prototype, symbol)
  }

  /**
   * Get the overloaded operation function for an instance.
   *
   * @param inst - The object instance to check for operation overload
   * @param symbol - The operation symbol
   * @returns The overloaded operation function, or null if not found
   */
  public getOverloadOnInstance<T>(inst: T, symbol: symbol): BoundOperation | null {
    return this.getOverloadFromPrototypeChain(inst, symbol)
  }

  ////////////////////////////////
  // Builtins
  ////////////////////////////////

  /**
   * Bind built-in identifiers like `true`, `false`, `null`, `undefined`, `Infinity`, `NaN`
   */
  public bindDefaults(): this {
    return this.bind({
      true: true,
      false: false,
      null: null,
      undefined,
      Infinity,
      NaN,
      Object,
      Number,
      BigInt,
      String,
      Boolean,
      Array,
      Date,
      Symbol,
      JSON,
      Math,
    })
  }

  /**
   * Bind all properties of the `Math` object.
   */
  public bindMaths(): this {
    return this.bind(
      Object.getOwnPropertyNames(Math).reduce((m, k) => {
        Reflect.set(m, k, Reflect.get(Math, k))
        return m
      }, {}),
    )
  }

  /**
   * Overload built-in operations for common classes like Array, String, and Set.
   *
   * Currently includes:
   * - Array `+` for concatenation
   * - String `*` for repetition
   * - Set `+` for union
   * - Set `-` for difference
   */
  public overloadDefaults(): this {
    this.overloads(Array, {
      '+': (self: unknown[], other: unknown[]) => [...self, ...other],
      '[i]': (self: unknown[], index: number) => {
        if (typeof index !== 'number') {
          throw new Error('Index of Array must be a number')
        }
        return self[normalizeIndex(index, self.length)]
      },
      '[:]': (self: unknown[], slices: Slice[]): unknown[] | unknown => {
        if (slices.length !== 1) {
          throw new Error('Multi slice is not supported')
        }
        return sliceArray(self, slices[0])
      },
    })
    this.overloads(String, {
      '*': (self: string, n: number) => self.repeat(n),
      'r*': (self: string, n: number) => self.repeat(n),
    })
    this.overloads(Set, {
      '+': (self: Set<unknown>, b: Set<unknown>) => new Set([...self, ...b]),
      '-': (self: Set<unknown>, b: Set<unknown>) => new Set([...self].filter((x) => !b.has(x))),
    })
    return this
  }

  private static instance?: Rop

  /**
   * The default Rop instance.
   *
   * - This instance provides default bindings and operations
   * - This instance can be modified by calling `Rop#bind`, {@link Rop.overload} or {@link Rop.overloads} on the instance.
   * - You can use {@link Rop.resetDefaultInstance()} to reset the default instance to its initial state.
   * - You can create your own Rop instance by calling `new Rop()`.
   */
  public static get INST(): Rop {
    if (this.instance === undefined) {
      this.instance = new Rop().bindDefaults().bindMaths().overloadDefaults()
    }
    return this.instance
  }

  /**
   * Reset the default Rop instance {@link Rop.INST} to its initial state.
   */
  public static resetDefaultInstance(): void {
    this.instance = undefined
  }
}
