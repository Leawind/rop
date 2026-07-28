import { Rop } from './Rop.ts'

export { Rop } from './Rop.ts'
export * from './error.ts'
export type { SourceSpan } from './source.ts'
export type { BinaryOperationName, OperationName, ReverseBinaryOperationName, UnaryOperationName } from './compiler/Operators.ts'
export type { NormalizedSlice, Slice } from './utils/slicing.ts'

/**
 * A quick alias for `Rop.INST.o`
 */
export const o = Rop.INST.o
