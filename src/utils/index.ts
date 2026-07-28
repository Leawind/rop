export type Clazz<T = any> = new (...args: any[]) => T

export type AnyFunction<
  Return = any,
  Params extends any[] = any[],
> = (...args: Params) => Return

export type Constructor<
  Return = any,
  Params extends any[] = any[],
> = new (...args: Params) => Return

export * from './slicing.ts'
