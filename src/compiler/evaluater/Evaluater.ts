import { Slice } from '../../utils';
import type {
	AstNode,
	ValueNode,
	IdentifierNode,
	UnaryNode,
	BinaryNode,
	AccessPropertyNode,
	InvokeNode,
	SlicingNode,
	NodeSlice,
	IndexingNode,
} from '../AstNode';
import { NodeType } from '../AstNode';
import { Operations } from '../Operators';
import { TokenType } from '../Token';
import type { Token, EmbeddedToken, ConstantToken } from '../Token';
import { Rop } from '../../Rop';

/**
 * Evaluater for executing AST nodes and computing their values.
 *
 * This class traverses an AST and evaluates each node according to its type,
 * using the provided Rop instance for context such as bindings and operator overloads.
 */
export class Evaluater {
	/**
	 * Create a new Evaluater with the given AST and Rop context.
	 *
	 * @param ast - The AST to evaluate
	 * @param rop - The Rop instance providing context (bindings, overloads, etc.)
	 */
	public constructor(
		private ast: AstNode,
		private rop: Rop = Rop.INST,
	) {}

	/**
	 * Evaluate the AST and return the result.
	 *
	 * @returns The result of evaluating the AST
	 */
	public evaluate<T = any>(): T {
		return this.evaluateNode(this.ast) as T;
	}

	private evaluateNode(node: AstNode): any {
		switch (node.type) {
			case NodeType.Value:
				return this.evaluateValueNode(node);
			case NodeType.Identifier:
				return this.evaluateIdentifierNode(node);
			case NodeType.Unary:
				return this.evaluateUnaryNode(node);
			case NodeType.Binary:
				return this.evaluateBinaryNode(node);
			case NodeType.AccessProperty:
				return this.evaluateAccessPropertyNode(node);
			case NodeType.Indexing:
				return this.evaluateIndexingNode(node);
			case NodeType.Slicing:
				return this.evaluateSlicingNode(node);
			case NodeType.Invoke:
				return this.evaluateInvokeNode(node);
			default:
				throw new Error(`Unknown node type: ${(node as any).type}`);
		}
	}

	private evaluateValueNode(node: ValueNode): any {
		const token = node.token as Token;
		if (token.type === TokenType.Embedded) {
			return (token as EmbeddedToken).value;
		} else if (token.type === TokenType.Constant) {
			return (token as ConstantToken).value;
		}
		throw new Error(`Unknown value token type: ${token.type}`);
	}

	private evaluateIdentifierNode(node: IdentifierNode): any {
		const bindings = this.rop.bindings;
		if (!bindings.has(node.name)) {
			throw new Error(`Unknown identifier: ${node.name}`);
		}
		return bindings.get(node.name);
	}

	private evaluateUnaryNode(node: UnaryNode): any {
		const operandValue = this.evaluateNode(node.operand);
		const meta = Operations.meta(node.operation);
		if (meta.type !== 'unary') {
			throw new Error(`Invalid node: ${node}`);
		}

		const overload = this.rop.getOverloadOnInstance(operandValue, meta.symbol);
		if (typeof overload === 'function') {
			return overload.call(operandValue);
		}
		return meta.native(operandValue, undefined);
	}

	private evaluateBinaryNode(node: BinaryNode): any {
		const leftValue = this.evaluateNode(node.left);
		const rightValue = this.evaluateNode(node.right);

		const meta = Operations.meta(node.operation);
		if (meta.type !== 'binary') {
			throw new Error(`Invalid node: ${node}`);
		}

		const leftOverload = this.rop.getOverloadOnInstance(leftValue, meta.symbol);
		if (typeof leftOverload === 'function') {
			return leftOverload.call(leftValue, rightValue);
		}

		const rightOverload = this.rop.getOverloadOnInstance(rightValue, meta.symbol);
		if (typeof rightOverload === 'function') {
			return rightOverload.call(rightValue, leftValue);
		}

		return meta.native(leftValue, rightValue);
	}

	private evaluateAccessPropertyNode(node: AccessPropertyNode): any {
		const leftValue = this.evaluateNode(node.left);
		return leftValue[node.name];
	}

	private evaluateInvokeNode(node: InvokeNode): any {
		const target = this.evaluateNode(node.target);
		const args = node.args.map((arg) => this.evaluateNode(arg));

		if (typeof target !== 'function') {
			throw new Error(`Cannot invoke non-function: ${typeof target}`);
		}

		return target(...args);
	}

	private evaluateIndexingNode(node: IndexingNode): any {
		const target = this.evaluateNode(node.target);
		const fn = this.rop.getOverloadOnInstance(target, Operations.symbol('[i]'));
		if (typeof fn === 'function') {
			return fn.call(target, this.evaluateNode(node.index));
		} else {
			return target[this.evaluateNode(node.index)];
		}
	}

	private evaluateSlicingNode(node: SlicingNode): any {
		const target = this.evaluateNode(node.target);

		const fn = this.rop.getOverloadOnInstance(target, Operations.symbol('[:]'));
		if (typeof fn === 'function') {
			return fn.call(
				target,
				node.slices.map((ns) => this.calculateSlice(ns)),
			);
		} else {
			if (node.slices.length !== 1) {
				throw new Error('Target does not support slicing');
			}
			const slice = node.slices[0];
			if (slice.end !== undefined || slice.step !== undefined) {
				throw new Error('Target does not support slicing with end or step');
			}
			return target[this.calculateSlice(slice).start];
		}
	}

	private calculateSlice(ns: NodeSlice): Slice {
		return {
			start: ns.start ? this.evaluateNode(ns.start) : undefined,
			end: ns.end ? this.evaluateNode(ns.end) : undefined,
			step: ns.step ? this.evaluateNode(ns.step) : undefined,
		};
	}
}
