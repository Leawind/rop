import {
  AccessPropertyNode,
  AstNode,
  BinaryNode,
  IdentifierNode,
  IndexingNode,
  InvokeNode,
  NodeSlice,
  NodeType,
  SlicingNode,
  UnaryNode,
  ValueNode,
} from '../AstNode.ts'
import { type BinaryOperationName, type UnaryOperationName } from '../Operators.ts'
import { ConstantToken, EmbeddedToken } from '../Token.ts'
import { TokenFactory } from '../tokenizer/TokenFactory.ts'
import { defineSpan, mergeSpans, SourceSpan } from '../../source.ts'

/**
 * Factory class for creating AST nodes.
 *
 * This class provides static methods to create various types of AST nodes
 * used in the parsing and evaluation process.
 */
export class AstFactory {
  private constructor() {}

  public static value(token: EmbeddedToken | ConstantToken): ValueNode {
    return defineSpan({ type: NodeType.Value, token }, token.span)
  }

  public static embeddedValue(value: unknown): ValueNode {
    return this.value(TokenFactory.embeddedValue(value))
  }

  public static constValue(literal: string, value: string | number | bigint): ValueNode

  public static constValue(value: number | bigint): ValueNode

  public static constValue(...args: [literal: string, value: string | number | bigint] | [value: number | bigint]): ValueNode {
    if (args.length === 1) {
      const [value] = args
      switch (typeof value) {
        case 'number':
          return this.value(TokenFactory.constant(String(value), value))
        case 'bigint':
          return this.value(TokenFactory.constant(String(value) + 'n', value))
      }
    } else {
      const [literal, value] = args
      return this.value(TokenFactory.constant(literal, value))
    }
  }

  static identifier(name: string): IdentifierNode {
    return defineSpan({ type: NodeType.Identifier, name })
  }

  static unary(operation: UnaryOperationName, operand: AstNode): UnaryNode {
    return defineSpan({ type: NodeType.Unary, operation: operation, operand }, operand.span)
  }

  static binary(left: AstNode, operation: BinaryOperationName, right: AstNode): BinaryNode {
    return defineSpan({ type: NodeType.Binary, left, operation: operation, right }, mergeSpans(left, right))
  }

  static accessProperty(left: AstNode, name: string): AccessPropertyNode {
    return defineSpan({ type: NodeType.AccessProperty, left, name }, left.span)
  }

  static invoke(target: AstNode, args: AstNode[]): InvokeNode {
    const span: SourceSpan = args.length > 0 ? mergeSpans(target, args.at(-1)!) : target.span
    return defineSpan({ type: NodeType.Invoke, target, args: args }, span)
  }

  static index(target: AstNode, index: AstNode): IndexingNode {
    return defineSpan({ type: NodeType.Indexing, target, index }, mergeSpans(target, index))
  }

  static slice(target: AstNode, dims: NodeSlice[]): SlicingNode {
    const nodes = dims.flatMap(({ start, end, step }) => [start, end, step]).filter((node): node is AstNode => node !== undefined)
    return defineSpan({ type: NodeType.Slicing, target, slices: dims }, nodes.length > 0 ? mergeSpans(target, nodes.at(-1)!) : target.span)
  }
}
