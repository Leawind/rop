const UNARY_OPERATOR_NAMES = ['!', '~', '-x', '+x'] as const;
const BINARY_OPERATOR_NAMES = [
	'+',
	'-',
	'*',
	'/',
	'%',
	'**',
	'&',
	'|',
	'^',
	'<<',
	'>>',
	'>>>',
	'&&',
	'||',
	'==',
	'===',
	'!=',
	'!==',
	'<',
	'>',
	'<=',
	'>=',
] as const;
const OPERATOR_NAMES = ['[i]', '[:]', ...UNARY_OPERATOR_NAMES, ...BINARY_OPERATOR_NAMES] as const;

export type UnaryOperationName = (typeof UNARY_OPERATOR_NAMES)[number];
export type BinaryOperationName = (typeof BINARY_OPERATOR_NAMES)[number];
export type OperationName = (typeof OPERATOR_NAMES)[number];

export type UnaryOperationArrowFn<T = any, R = any> = ((self: T) => R) | (() => R);
export type BinaryOperationArrowFn<T = any, R = any> = ((self: T, other: any) => R) | ((other: any) => R);
export type OperationArrowFn<T = any, R = any> = (self: T, other?: any) => R;
export type OperationFn<R = any> = (...args: any[]) => R;

type PartialOperationMeta =
	| {
			name?: string;
			symbol?: symbol;
			type: 'unary' | 'binary';
			literal: string;
			precedence: number;
			native: OperationArrowFn;
	  }
	| {
			name?: string;
			symbol?: symbol;
			type: 'other';
	  };
type OperationMeta =
	| {
			name: string;
			symbol: symbol;
			type: 'unary' | 'binary';
			literal: string;
			precedence: number;
			native: OperationArrowFn;
	  }
	| {
			name: string;
			symbol: symbol;
			type: 'other';
	  };

const OPERATION_REGISTRY: Record<OperationName | symbol, OperationMeta> = ((obj: Record<OperationName | symbol, PartialOperationMeta>) => {
	for (const [name, meta] of Object.entries(obj) as [OperationName, OperationMeta][]) {
		meta.name = name;
		meta.symbol = Symbol(name);
		obj[meta.symbol] = meta;
	}
	return obj as Record<OperationName | symbol, OperationMeta>;
})({
	// Indexing
	'[i]': { type: 'other' },
	// Slicing
	'[:]': { type: 'other' },

	// Unary
	'!': { type: 'unary', literal: '!', native: (self: any) => !self, precedence: 10 },
	'~': { type: 'unary', literal: '~', native: (self: any) => ~self, precedence: 10 },
	'-x': { type: 'unary', literal: '-', native: (self: any) => -self, precedence: 10 },
	'+x': { type: 'unary', literal: '+', native: (self: any) => +self, precedence: 10 },
	// Binary
	'||': { type: 'binary', literal: '||', precedence: 1, native: (self, other) => self || other },
	'&&': { type: 'binary', literal: '&&', precedence: 2, native: (self, other) => self && other },
	'|': { type: 'binary', literal: '|', precedence: 3, native: (self, other) => self | other },
	'^': { type: 'binary', literal: '^', precedence: 4, native: (self, other) => self ^ other },
	'&': { type: 'binary', literal: '&', precedence: 5, native: (self, other) => self & other },
	'==': { type: 'binary', literal: '==', precedence: 6, native: (self, other) => self == other },
	'===': { type: 'binary', literal: '===', precedence: 6, native: (self, other) => self === other },
	'!=': { type: 'binary', literal: '!=', precedence: 6, native: (self, other) => self != other },
	'!==': { type: 'binary', literal: '!==', precedence: 6, native: (self, other) => self !== other },
	'<': { type: 'binary', literal: '<', precedence: 7, native: (self, other) => self < other },
	'>': { type: 'binary', literal: '>', precedence: 7, native: (self, other) => self > other },
	'<=': { type: 'binary', literal: '<=', precedence: 7, native: (self, other) => self <= other },
	'>=': { type: 'binary', literal: '>=', precedence: 7, native: (self, other) => self >= other },
	'<<': { type: 'binary', literal: '<<', precedence: 8, native: (self, other) => self << other },
	'>>': { type: 'binary', literal: '>>', precedence: 8, native: (self, other) => self >> other },
	'>>>': { type: 'binary', literal: '>>>', precedence: 8, native: (self, other) => self >>> other },
	'+': { type: 'binary', literal: '+', precedence: 9, native: (self, other) => self + other },
	'-': { type: 'binary', literal: '-', precedence: 9, native: (self, other) => self - other },
	'*': { type: 'binary', literal: '*', precedence: 10, native: (self, other) => self * other },
	'/': { type: 'binary', literal: '/', precedence: 10, native: (self, other) => self / other },
	'%': { type: 'binary', literal: '%', precedence: 10, native: (self, other) => self % other },
	'**': { type: 'binary', literal: '**', precedence: 11, native: (self, other) => self ** other },
});

////////////////////////////////////////////////////////////////
// Map: Operator Literal --> Operator Name
////////////////////////////////////////////////////////////////
const OPERATOR_LITERAL_TO_NAME_MAP: Map<string, { unary?: UnaryOperationName; binary?: BinaryOperationName }> = (() => {
	const map = new Map<string, { unary?: UnaryOperationName; binary?: BinaryOperationName }>();
	for (const [name, meta] of Object.entries(OPERATION_REGISTRY)) {
		switch (meta.type) {
			case 'unary':
			case 'binary': {
				const literal = meta.literal;
				if (!map.has(meta.literal)) {
					map.set(literal, {});
				}
				(map.get(literal) as any)[meta.type] = name;
			}
		}
	}
	return map;
})();

export class Operations {
	private constructor() {}

	/**
	 * Check if the given operation is known
	 *
	 * @param op Operation name or symbol
	 */
	public static isKnownOperation(op: string | symbol): boolean {
		return op in OPERATION_REGISTRY;
	}

	public static unaryFromLiteral(literal: string): UnaryOperationName | null {
		return OPERATOR_LITERAL_TO_NAME_MAP.get(literal)?.unary || null;
	}

	public static binaryFromLiteral(literal: string): BinaryOperationName | null {
		return OPERATOR_LITERAL_TO_NAME_MAP.get(literal)?.binary || null;
	}

	/**
	 * Get operation metadata by name or symbol
	 */
	public static meta(op: OperationName): OperationMeta;
	public static meta(op: string | symbol): OperationMeta | null;
	public static meta(op: string | symbol): OperationMeta | null {
		return OPERATION_REGISTRY[op as OperationName] ?? null;
	}

	/**
	 * Get operation symbol by name
	 *
	 * @param name operation name
	 */
	public static symbol(name: OperationName): symbol;

	/**
	 * Get operation symbol by name or symbol
	 *
	 * @param op operation name or symbol
	 * @returns operation symbol or null if not found
	 */
	public static symbol(op: string | symbol): symbol | null;
	public static symbol(op: string | symbol): symbol | null {
		return OPERATION_REGISTRY[op as OperationName]?.symbol ?? null;
	}
}
