import { type BinaryOperationName, type UnaryOperationName } from './Operators';
import { ConstantToken, InterpolationToken } from './Token';

export enum NodeType {
	Value = 'Value',
	Identifier = 'Identifier',
	Unary = 'Unary',
	Binary = 'Binary',
	AccessProperty = 'AccessProperty',
	Slicing = 'Slicing',
	Indexing = 'Indexing',
	Invoke = 'Invoke',
}

interface BaseAstNode<T extends NodeType> {
	type: T;
}

export interface ValueNode extends BaseAstNode<NodeType.Value> {
	token: InterpolationToken | ConstantToken;
}

export interface IdentifierNode extends BaseAstNode<NodeType.Identifier> {
	name: string;
}

// ~x, -x, +x, !x
export interface UnaryNode extends BaseAstNode<NodeType.Unary> {
	operation: UnaryOperationName;
	operand: AstNode;
}

// a + b
export interface BinaryNode extends BaseAstNode<NodeType.Binary> {
	left: AstNode;
	operation: BinaryOperationName;
	right: AstNode;
}

// a.b
export interface AccessPropertyNode extends BaseAstNode<NodeType.AccessProperty> {
	left: AstNode;
	name: string;
}

// fn(a, b, ...)
export interface InvokeNode extends BaseAstNode<NodeType.Invoke> {
	target: AstNode;
	args: AstNode[];
}

// obj[index]
export interface IndexingNode extends BaseAstNode<NodeType.Indexing> {
	target: AstNode;
	index: AstNode;
}

export type NodeSlice = { start?: AstNode; end?: AstNode; step?: AstNode };
// arr[a:b:c, d:e:f, ...]
export interface SlicingNode extends BaseAstNode<NodeType.Slicing> {
	target: AstNode;
	slices: NodeSlice[];
}

export type AstNode = ValueNode | IdentifierNode | UnaryNode | BinaryNode | AccessPropertyNode | InvokeNode | IndexingNode | SlicingNode;
