export type Clazz<T = any> = new (...args: any[]) => T

/**
 * Three types of function:
 *
 * - **`normal`** - `const fn = function(){}`
 * - **`arrow`** - `const fn = ()=>{}`
 * - **`method`** - `const fn = { m(){} }.m`
 */
export type FunctionType = 'normal' | 'arrow' | 'method'

export type AnyFunction<
  Return = any,
  Params extends any[] = any[],
> = (...args: Params) => Return

export type Constructor<
  Return = any,
  Params extends any[] = any[],
> = new (...args: Params) => Return

export function detectFunctionType<F extends ((...args: any[]) => any) | (new (...args: any[]) => any)>(fn: F): FunctionType {
  if (Object.prototype.hasOwnProperty.call(fn, 'prototype')) {
    return 'normal'
  }

  const str = Function.prototype.toString.call(fn)
  if (str.startsWith('(') || /^[^(),.=>{}[]]+\s*=>\s*\{/.test(str)) {
    return 'arrow'
  }

  return 'method'
}

////////////////////////////////
// Slicing
////////////////////////////////
export type Slice = { start?: any; end?: any; step?: any }
export type SlicingFn<T = any, R = any> = (self: T, slices: Slice[]) => R

/**
 * @param index the zero-based index. A negative index will count back from the last item.
 * @param length the length of the array.
 * @returns the normalized index, may be out of range.
 */
export function normalizeIndex(index: number, length: number): number {
  return index < 0 ? index + length : index
}
