// Copied from https://github.com/kysely-org/kysely/blob/master/src/util/object-utils.ts

// Copyright (c) 2022 Sami Koskimäki | MIT License

export function isFunction(obj: unknown): obj is Function {
  return typeof obj === 'function'
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null
}

export function isString(obj: unknown): obj is string {
  return typeof obj === 'string'
}

export function freeze<T>(obj: T): Readonly<T> {
  return Object.freeze(obj)
}
