import { AstParser } from './compiler/ast-parser/AstParser';
import { Evaluater } from './compiler/evaluater/Evaluater';
import {
	BinaryOperationArrowFn,
	BinaryOperationName,
	OperationArrowFn,
	OperationFn,
	OperationName,
	Operations,
	UnaryOperationArrowFn,
	UnaryOperationName,
} from './compiler/Operators';
import { Tokenizer } from './compiler/tokenizer/Tokenizer';
import { Clazz, detectFunctionType, normalizeIndex, Slice } from './utils';

export class Rop {
	/**
	 * { Clazz.prototype --> { Operation.symbol --> OperationFn } }
	 */
	private readonly overloadings: Map<any, Map<symbol, OperationArrowFn>> = new Map();

	/**
	 * { identifier_name --> value } []
	 *
	 * An array of binding maps. Each binding map contains map of identifier name to value.
	 *
	 * Those identifiers can be used in the template string.
	 */
	public readonly bindings: Map<string, any> = new Map();

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
		const tokens = Tokenizer.tokenize(strs, ...args);
		const ast = new AstParser(tokens).parse();
		const result = new Evaluater(ast, this).evaluate<T>();
		return result;
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
	public bind(key: string, value: any): Rop;
	public bind(bindings: Record<string, any>): Rop;
	public bind(bindings: Map<string, any>): Rop;
	public bind(...args: [key: string, value: any] | [bindings: Record<string, any>] | [bindings: Map<string, any>]): Rop {
		if (typeof args[0] === 'string') {
			const [key, value] = args;
			this.bindings.set(key, value);
		} else if (args[0] instanceof Map) {
			for (const [key, value] of args[0].entries()) {
				this.bindings.set(key, value);
			}
		} else {
			for (const [key, value] of Object.entries(args[0])) {
				this.bindings.set(key, value);
			}
		}
		return this;
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
	public unbind(...keys: string[]): Rop {
		for (const k of keys) {
			this.bindings.delete(k);
		}
		return this;
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
			throw new Error(`Unknown operation name: '${name}'`);
		}
		return Operations.symbol(name);
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
			this.overloadings.set(prototype, new Map());
		}
		const classOverloads = this.overloadings.get(prototype)!;

		switch (detectFunctionType(operationFn)) {
			case 'normal':
			case 'method':
				classOverloads.set(symbol, operationFn);
				break;
			case 'arrow':
				classOverloads.set(symbol, function (this: any, ...args: unknown[]) {
					return operationFn(this, ...args);
				});
				break;
		}
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
	 *
	 */
	public overload<T>(clazz: Clazz, operation: UnaryOperationName, operationFn: UnaryOperationArrowFn<T>): Rop;
	public overload<T>(clazz: Clazz, operation: BinaryOperationName, operationFn: BinaryOperationArrowFn<T>): Rop;
	public overload<T>(clazz: Clazz, operation: symbol, operationFn: OperationFn<T>): Rop;
	public overload<T>(clazz: Clazz, operation: OperationName | symbol, operationFn: OperationFn<T>): Rop;
	public overload<T>(clazz: Clazz, op: OperationName | symbol, operationFn: OperationFn<T>): Rop {
		if (clazz.prototype === undefined) {
			throw new TypeError('clazz must be a class');
		}
		const symbol = Operations.symbol(op);
		if (symbol === null) {
			throw new TypeError(`Unknown operation: ${String(op)}`);
		}
		this.setOverload(clazz.prototype, symbol, operationFn);
		return this;
	}

	/**
	 * Overload multiple operations for a class at once.
	 *
	 * ### Examples
	 *
	 * ```ts
	 * rop.overloads(Vec2, {
	 *   // Method (Recommended style)
	 *   '+'(this: Vec2, other: Vec2) {
	 *     return new Vec2(this.x + other.x, this.y + other.y);
	 *   },
	 *   // Normal function
	 *   '*': function (this: Vec2, other: Vec2) {
	 *     return new Vec2(this.x * other.x, this.y * other.y);
	 *   },
	 *   // Arrow function
	 *   '/': (self: Vec2, other: Vec2) => {
	 *     return new Vec2(self.x / other.x, self.y / other.y);
	 *   },
	 * })
	 * ```
	 *
	 * @param clazz - The class to overload operations for
	 * @param def - An object mapping operation names or symbols to their implementation functions
	 */
	public overloads<T>(clazz: Clazz, def: Partial<Record<OperationName | symbol, OperationFn<T>>>): Rop {
		if (clazz.prototype === undefined) {
			throw new TypeError('clazz must be a class');
		}

		for (const key of Reflect.ownKeys(def)) {
			const symbol = Operations.symbol(key);
			if (symbol === null) {
				continue;
			}
			const operationFn = def[key as keyof typeof def]!;
			if (typeof operationFn !== 'function') {
				throw new TypeError(`Expected operation function '${symbol.description}' to be a function, but got ${typeof operationFn}`);
			}

			this.setOverload(clazz.prototype, symbol, operationFn);
		}
		return this;
	}

	/**
	 * Get the overloaded operation function on a prototype chain.
	 *
	 * @param prototype prototype object. Get by `Object.getPrototypeOf(inst)` or `Clazz.prototype`
	 * @param symbol operation symbol. Get by `Operations.symbol(op)` or `Operations.meta(op).symbol`
	 */
	private getOverloadFromPrototypeChain(prototype: any, symbol: symbol): OperationFn | null {
		let p = prototype;
		while (p !== null) {
			// Check if the class has overloaded the operation
			const classOverloads = this.overloadings.get(p);
			if (classOverloads !== undefined && classOverloads.has(symbol)) {
				return classOverloads.get(symbol) ?? null;
			}

			// Check if the symbol is a property of the prototype
			if (typeof p === 'object' && symbol in p && typeof p[symbol] === 'function') {
				return p[symbol];
			}

			p = Object.getPrototypeOf(p);
		}
		return null;
	}

	/**
	 * Get the overloaded operation function for a class.
	 *
	 * @param clazz - The class to check for operation overload
	 * @param symbol - The operation symbol
	 * @returns The overloaded operation function, or null if not found
	 */
	public getOverloadOnClass<T>(clazz: Clazz<T>, symbol: symbol): OperationFn<T> | null {
		return this.getOverloadFromPrototypeChain(clazz.prototype, symbol);
	}

	/**
	 * Get the overloaded operation function for an instance.
	 *
	 * @param inst - The object instance to check for operation overload
	 * @param symbol - The operation symbol
	 * @returns The overloaded operation function, or null if not found
	 */
	public getOverloadOnInstance<T>(inst: T, symbol: symbol): OperationFn | null {
		return this.getOverloadFromPrototypeChain(inst, symbol);
	}

	////////////////////////////////
	// Builtins
	////////////////////////////////

	/**
	 * Bind built-in identifiers like `true`, `false`, `null`, `undefined`, `Infinity`, `NaN`,
	 * and all properties of the `Math` object.
	 */
	public bindDefaults(): Rop {
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
		});
	}

	/**
	 * Bind all properties of the `Math` object.
	 */
	public bindMaths(): Rop {
		return this.bind(
			Object.getOwnPropertyNames(Math).reduce((m, k) => {
				Reflect.set(m, k, Reflect.get(Math, k));
				return m;
			}, {}),
		);
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
	public overloadDefaults(): Rop {
		this.overloads(Array, {
			'+': (self: unknown[], other: unknown[]) => [...self, ...other],
			'[i]'(this: unknown[], index: number) {
				if (typeof index !== 'number') {
					throw new Error('Index of Array must be a number');
				}
				return this[normalizeIndex(index, this.length)];
			},
			'[:]'(this: unknown[], slices: Slice[]): unknown[] | unknown {
				if (slices.length !== 1) {
					throw new Error('Multi slice is not supported');
				}
				const slice = slices[0];
				if (slice.step === 0) {
					throw new Error('Slice step cannot be zero');
				} else {
					slice.step ??= 1;
					const result = [];
					if (slice.step > 0) {
						slice.start = slice.start === undefined ? 0 : normalizeIndex(slice.start, this.length);
						slice.end = slice.end === undefined ? this.length : normalizeIndex(slice.end, this.length);
						for (let i = slice.start; i < slice.end; i += slice.step) {
							result.push(this[i]);
						}
					} else {
						slice.start = slice.start === undefined ? this.length - 1 : normalizeIndex(slice.start, this.length);
						slice.end = slice.end === undefined ? -1 : normalizeIndex(slice.end, this.length);
						for (let i = slice.start; i > slice.end; i += slice.step) {
							result.push(this[i]);
						}
					}
					return result;
				}
			},
		});
		this.overloads(String, { '*': (self: string, n: number) => self.repeat(n) });
		this.overloads(Set, {
			'+': (self: Set<unknown>, b: Set<unknown>) => new Set([...self, ...b]),
			'-': (self: Set<unknown>, b: Set<unknown>) => new Set([...self].filter((x) => !b.has(x))),
		});
		return this;
	}

	private static instance?: Rop;

	/**
	 * The default Rop instance.
	 *
	 * - This instance provides default bindings and operations
	 * - This instance can be modified by calling `Rop#bind`, {@link Rop.overload} or {@link Rop.overloads} on the instance.
	 * - You can use {@link Rop.resetDefaultInstance()} to reset the default instance to its initial state.
	 * - You can create your own Rop instance by calling `new Rop()`.
	 */
	public static get INST() {
		if (this.instance === undefined) {
			this.instance = new Rop().bindDefaults().bindMaths().overloadDefaults();
		}
		return this.instance;
	}

	/**
	 * Reset the default Rop instance {@link Rop.INST} to its initial state.
	 */
	public static resetDefaultInstance() {
		this.instance = undefined;
	}
}
