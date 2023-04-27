import hljs, { HLJSOptions } from "highlight.js"

type CodexOptions = {
  directivePrefix: string
  classPrefix: string
}

export type Options = {
  [k: string]: any
  hljs?: Partial<HLJSOptions>
  codex?: Partial<CodexOptions>
  digest?: boolean
  digestSep?: string
}

export class Context {
  [key: symbol]: any
  constructor(public options?: Options) {
    hljs.configure(options?.hljs ?? {})
  }
}

class Module {
  private current: Context | undefined
  private waiters = <(() => void)[]>[]

  async push(options?: Options): Promise<Context> {
    if (this.current === undefined) {
      this.current = new Context(options)
      return this.current
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve)
    }).then(() => {
      if (this.current !== undefined) throw new Error("race condition")
      this.current = new Context(options)
      return this.current
    })
  }

  pop() {
    this.current = undefined
    const waiter = this.waiters.shift()
    if (waiter !== undefined) waiter()
  }

  scoped<T extends object>(builder: (ctx: Context) => T): T {
    const key = Symbol()
    const currentTarget = (): T => {
      const ctx = this.current!
      if (key in ctx) return ctx[key]
      const target = (ctx[key] = builder(ctx))
      return target
    }
    return new Proxy({} as any as T, {
      deleteProperty(_, property) {
        return Reflect.deleteProperty(currentTarget(), property)
      },
      get(_, property) {
        const target = currentTarget()
        const value = Reflect.get(target, property)
        return typeof value === "function" ? value.bind(target) : value
      },
      has(_, property) {
        return property in currentTarget()
      },
      set(_, property, value) {
        return Reflect.set(currentTarget(), property, value)
      },
    })
  }
}

export default new Module()
