import { Slice } from '../../utils/index.ts'
import type {
  AccessPropertyNode,
  AstNode,
  BinaryNode,
  IdentifierNode,
  IndexingNode,
  InvokeNode,
  NodeSlice,
  SlicingNode,
  UnaryNode,
  ValueNode,
} from '../AstNode.ts'
import { NodeType } from '../AstNode.ts'
import { Operations } from '../Operators.ts'
import { TokenType } from '../Token.ts'
import type { ConstantToken, EmbeddedToken, Token } from '../Token.ts'
import { Rop } from '../../Rop.ts'
import { RopError, RopEvaluationError, RopReferenceError, RopTypeError } from '../../error.ts'

/**
 * Evaluator for executing AST nodes and computing their values.
 *
 * This class traverses an AST and evaluates each node according to its type,
 * using the provided Rop instance for context such as bindings and operator overloads.
 */
export class Evaluator {
  /**
   * Create a new Evaluator with the given AST and Rop context.
   *
   * @param ast - The AST to evaluate
   * @param rop - The Rop instance providing context (bindings, overloads, etc.)
   */
  public constructor(
    private ast: AstNode,
    private rop: Rop = Rop.INST,
    private source: string = '',
    private embeddedValues: readonly unknown[] = [],
  ) {}

  /**
   * Evaluate the AST and return the result.
   *
   * @returns The result of evaluating the AST
   */
  public evaluate<T = any>(): T {
    return this.evaluateNode(this.ast) as T
  }

  private evaluateNode(node: AstNode): any {
    try {
      switch (node.type) {
        case NodeType.Value:
          return this.evaluateValueNode(node)
        case NodeType.Identifier:
          return this.evaluateIdentifierNode(node)
        case NodeType.Unary:
          return this.evaluateUnaryNode(node)
        case NodeType.Binary:
          return this.evaluateBinaryNode(node)
        case NodeType.AccessProperty:
          return this.evaluateAccessPropertyNode(node)
        case NodeType.Indexing:
          return this.evaluateIndexingNode(node)
        case NodeType.Slicing:
          return this.evaluateSlicingNode(node)
        case NodeType.Invoke:
          return this.evaluateInvokeNode(node)
        default:
          throw new RopEvaluationError(this.source, this.ast.span, `Unknown node type: ${(node as any).type}`)
      }
    } catch (error) {
      if (error instanceof RopError) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new RopEvaluationError(this.source, node.span, message, { cause: error })
    }
  }

  private evaluateValueNode(node: ValueNode): any {
    const token = node.token as Token
    if (token.type === TokenType.Embedded) {
      const embedded = token as EmbeddedToken
      return embedded.index === undefined ? embedded.value : this.embeddedValues[embedded.index]
    } else if (token.type === TokenType.Constant) {
      return (token as ConstantToken).value
    }
    throw new Error(`Unknown value token type: ${token.type}`)
  }

  private evaluateIdentifierNode(node: IdentifierNode): any {
    const bindings = this.rop.bindings
    if (!bindings.has(node.name)) {
      throw new RopReferenceError(this.source, node.span, `Unknown identifier: ${node.name}`)
    }
    return bindings.get(node.name)
  }

  private evaluateUnaryNode(node: UnaryNode): any {
    const operandValue = this.evaluateNode(node.operand)
    const meta = Operations.meta(node.operation)
    if (meta.type !== 'unary') {
      throw new Error(`Invalid node: ${node}`)
    }

    const overload = this.rop.getOverloadOnInstance(operandValue, meta.symbol)
    if (typeof overload === 'function') {
      return overload.call(operandValue)
    }
    return meta.native(operandValue, undefined)
  }

  private evaluateBinaryNode(node: BinaryNode): any {
    const leftValue = this.evaluateNode(node.left)
    const meta = Operations.meta(node.operation)
    if (meta.type !== 'binary') {
      throw new Error(`Invalid node: ${node}`)
    }

    const leftOverload = this.rop.getOverloadOnInstance(leftValue, meta.symbol)
    if (typeof leftOverload === 'function') {
      const rightValue = this.evaluateNode(node.right)
      return leftOverload.call(leftValue, rightValue)
    }

    // Preserve JavaScript's lazy evaluation when the left operand does not
    // provide an overload that needs to receive the right operand.
    if (node.operation === '&&' && !leftValue) {
      return leftValue
    }
    if (node.operation === '||' && leftValue) {
      return leftValue
    }

    const rightValue = this.evaluateNode(node.right)

    const rightOverload = this.rop.getOverloadOnInstance(rightValue, Operations.symbol(Operations.reverse(node.operation)))
    if (typeof rightOverload === 'function') {
      return rightOverload.call(rightValue, leftValue)
    }

    return meta.native(leftValue, rightValue)
  }

  private evaluateAccessPropertyNode(node: AccessPropertyNode): any {
    const leftValue = this.evaluateNode(node.left)
    return leftValue[node.name]
  }

  private evaluateInvokeNode(node: InvokeNode): any {
    let target: any
    let receiver: any = undefined

    if (node.target.type === NodeType.AccessProperty) {
      receiver = this.evaluateNode(node.target.left)
      target = receiver[node.target.name]
    } else if (node.target.type === NodeType.Indexing) {
      receiver = this.evaluateNode(node.target.target)
      const index = this.evaluateNode(node.target.index)
      const indexing = this.rop.getOverloadOnInstance(receiver, Operations.symbol('[i]'))
      target = typeof indexing === 'function' ? indexing.call(receiver, index) : receiver[index]
    } else {
      target = this.evaluateNode(node.target)
    }
    const args = node.args.map((arg) => this.evaluateNode(arg))

    if (typeof target !== 'function') {
      throw new RopTypeError(this.source, node.target.span, `Cannot invoke non-function: ${typeof target}`)
    }

    return Reflect.apply(target, receiver, args)
  }

  private evaluateIndexingNode(node: IndexingNode): any {
    const target = this.evaluateNode(node.target)
    const fn = this.rop.getOverloadOnInstance(target, Operations.symbol('[i]'))
    if (typeof fn === 'function') {
      return fn.call(target, this.evaluateNode(node.index))
    } else {
      return target[this.evaluateNode(node.index)]
    }
  }

  private evaluateSlicingNode(node: SlicingNode): any {
    const target = this.evaluateNode(node.target)

    const fn = this.rop.getOverloadOnInstance(target, Operations.symbol('[:]'))
    if (typeof fn === 'function') {
      return fn.call(
        target,
        node.slices.map((ns) => this.calculateSlice(ns)),
      )
    } else {
      if (node.slices.length !== 1) {
        throw new Error('Target does not support slicing')
      }
      const slice = node.slices[0]
      if (slice.end !== undefined || slice.step !== undefined) {
        throw new Error('Target does not support slicing with end or step')
      }
      return target[this.calculateSlice(slice).start as PropertyKey]
    }
  }

  private calculateSlice(ns: NodeSlice): Slice {
    return {
      start: ns.start ? this.evaluateNode(ns.start) : undefined,
      end: ns.end ? this.evaluateNode(ns.end) : undefined,
      step: ns.step ? this.evaluateNode(ns.step) : undefined,
    }
  }
}
