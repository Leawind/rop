export interface Slice {
  readonly start?: unknown
  readonly end?: unknown
  readonly step?: unknown
}

export interface NormalizedSlice {
  readonly start: number
  readonly end: number
  readonly step: number
}

function finiteInteger(value: unknown, component: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`Slice ${component} must be a finite integer`)
  }
  return value
}

export function normalizeIndex(index: number, length: number): number {
  return index < 0 ? index + length : index
}

export function normalizeSlice(length: number, slice: Slice): NormalizedSlice {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Slice length must be a non-negative safe integer')
  }
  const step = slice.step === undefined ? 1 : finiteInteger(slice.step, 'step')
  if (step === 0) {
    throw new RangeError('Slice step cannot be zero')
  }

  const clamp = (value: unknown, fallback: number, lower: number, upper: number, component: string): number => {
    if (value === undefined) {
      return fallback
    }
    const index = normalizeIndex(finiteInteger(value, component), length)
    return Math.min(Math.max(index, lower), upper)
  }

  return step > 0
    ? {
      start: clamp(slice.start, 0, 0, length, 'start'),
      end: clamp(slice.end, length, 0, length, 'end'),
      step,
    }
    : {
      start: clamp(slice.start, length - 1, -1, length - 1, 'start'),
      end: clamp(slice.end, -1, -1, length - 1, 'end'),
      step,
    }
}

export function sliceArray<T>(array: readonly T[], slice: Slice): T[] {
  const { start, end, step } = normalizeSlice(array.length, slice)
  const result: T[] = []
  if (step > 0) {
    for (let index = start; index < end; index += step) {
      result.push(array[index]!)
    }
  } else {
    for (let index = start; index > end; index += step) {
      result.push(array[index]!)
    }
  }
  return result
}
