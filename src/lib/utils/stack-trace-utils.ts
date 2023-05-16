// Adapted from https://github.com/kysely-org/kysely/blob/master/src/util/stack-trace-utils.ts
// Unchanged code appears between BEGIN and END comments. If these sections
// ever become different from the Kysely code, they should be updated here.

import { isObject, isString } from './object-utils.js'

/* BEGIN SYNCED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
export function extendStackTrace(err: unknown, stackError: Error): unknown {
  if (isStackHolder(err) && stackError.stack) {
    // Remove the first line that just says `Error`.
    const stackExtension = stackError.stack.split('\n').slice(1).join('\n')

    err.stack += `\n${stackExtension}`
    return err
  }

  return err
}

interface StackHolder {
  stack: string
}

function isStackHolder(obj: unknown): obj is StackHolder {
  return isObject(obj) && isString(obj.stack)
}
/* END SYNCED CODE */
