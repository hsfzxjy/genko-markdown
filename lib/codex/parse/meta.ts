import { BlockClass } from "../block"
import { BasicBlock } from "../block/basic_block"

const empty: unique symbol = Symbol()
class Field<I, F = I> {
  constructor(private name: string, private spec: Meta.FieldSpec<I, F>) {}

  private value: I | typeof empty = empty
  set(value: I) {
    if (
      (this.value !== empty && this.value !== value) ||
      this.resolved !== empty
    )
      throw new Error("once")
    this.value = value
  }
  get(): I {
    let value = this.value
    const { default: defaultfn } = this.spec
    if (value === empty) {
      if (defaultfn === undefined) throw new Error(`unset ${this.name}`)
      this.value = value = defaultfn()
    }
    return value
  }

  private resolved: F | I | typeof empty = empty
  resolve(): F | I {
    if (this.resolved === empty) {
      const value = this.get()
      const { postproc } = this.spec
      this.resolved = postproc ? postproc(value) : value
    }
    return this.resolved
  }
}

export namespace _Meta {
  export class Container {
    [k: string]: Field<any>
    readonly type = new Field<BlockClass>("type", {
      default: () => BasicBlock,
    })
    constructor() {
      Container.fieldSpecs.forEach((spec, name) => {
        this[name] = new Field(name, spec)
      })
    }

    static resolve(self: Container): any {
      const cache = new Map<string | symbol, any>()
      return new Proxy(
        {},
        {
          get(_, p) {
            let val: any
            if (cache.has(p)) return cache.get(p)
            cache.set(p, (val = self[p as string].resolve()))
            return val
          },
        }
      )
    }

    static register(specs: Meta.FieldSpecs) {
      for (const [name, spec] of Object.entries(specs)) {
        this.fieldSpecs.set(name, spec)
      }
    }
    private static fieldSpecs = new Map<string, Meta.FieldSpec.Any>()
  }
}

export namespace Meta {
  export interface FieldSpec<I, F = I> {
    default?: () => I
    postproc?: (val: I) => F
  }
  export namespace FieldSpec {
    export type Any = FieldSpec<any>
  }
  export type FieldSpecs = {
    [k: string]: FieldSpec.Any
  }

  export type Container<Specs extends FieldSpecs> = {
    [k in keyof Specs]: Specs[k] extends FieldSpec<infer I, infer F>
      ? Field<I, F>
      : never
  } & { type: Field<BlockClass> }

  export namespace Container {
    export type Any = Container<FieldSpecs>
    export type Resolved<Specs extends FieldSpecs> = {
      [k in keyof Specs]: Specs[k] extends FieldSpec<any, infer F> ? F : never
    }
  }
}
