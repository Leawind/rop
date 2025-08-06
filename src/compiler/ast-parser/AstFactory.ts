import {
	ValueNode,
	IdentifierNode,
	UnaryNode,
	BinaryNode,
	AccessPropertyNode,
	SlicingNode,
	InvokeNode,
	NodeType,
	AstNode,
	NodeSlice,
	IndexingNode,
} from '../AstNode';
import { type BinaryOperationName, type UnaryOperationName } from '../Operators';
import { ConstantToken, InterpolationToken } from '../Token';
import { TokenFactory } from '../tokenizer/TokenFactory';

/**
 * Factory class for creating AST nodes.
 *
 * This class provides static methods to create various types of AST nodes
 * used in the parsing and evaluation process.
 */
export class AstFactory {
	private constructor() {}

	public static value(token: InterpolationToken | ConstantToken): ValueNode {
		return { type: NodeType.Value, token };
	}

	public static interpolationValue(value: unknown): ValueNode {
		return this.value(TokenFactory.interpolation(value));
	}

	public static constValue(literal: string, value: string | number | bigint): ValueNode;

	public static constValue(value: number | bigint): ValueNode;

	public static constValue(...args: [literal: string, value: string | number | bigint] | [value: number | bigint]): ValueNode {
		if (args.length === 1) {
			const [value] = args;
			switch (typeof value) {
				case 'number':
					return this.value(TokenFactory.constant(String(value), value));
				case 'bigint':
					return this.value(TokenFactory.constant(String(value) + 'n', value));
			}
		} else {
			const [literal, value] = args;
			return this.value(TokenFactory.constant(literal, value));
		}
	}

	static identifier(name: string): IdentifierNode {
		return { type: NodeType.Identifier, name };
	}

	static unary(operation: UnaryOperationName, operand: AstNode): UnaryNode {
		return { type: NodeType.Unary, operation: operation, operand };
	}

	static binary(left: AstNode, operation: BinaryOperationName, right: AstNode): BinaryNode {
		return { type: NodeType.Binary, left, operation: operation, right };
	}

	static accessProperty(left: AstNode, name: string): AccessPropertyNode {
		return { type: NodeType.AccessProperty, left, name };
	}

	static invoke(target: AstNode, args: AstNode[]): InvokeNode {
		return { type: NodeType.Invoke, target, args: args };
	}

	static index(target: AstNode, index: AstNode): IndexingNode {
		return { type: NodeType.Indexing, target, index };
	}

	static slice(target: AstNode, dims: NodeSlice[]): SlicingNode {
		return { type: NodeType.Slicing, target, slices: dims };
	}
}
