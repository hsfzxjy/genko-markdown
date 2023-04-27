import { O } from "ts-toolbelt"

const replacements: Record<string, string> = {
  id: `[a-z0-9-_]+`,
  ref: `[a-z0-9-_]+|SELF`,
  title: `.+`,
  desc: `.+`,
  ws: "\\s+",
}

function build(regexp: string | RegExp): RegExp {
  if (typeof regexp === "string") {
    regexp = regexp.replace(/\{([a-z]+)\}/g, (_, $1) => replacements[$1])
    return new RegExp(regexp)
  }
  return regexp
}

export namespace Directive {
  export type Spec<Arg> = _Directive.Spec<Arg>
  export type Specs<Arg> = _Directive.Specs<Arg>
}

export namespace _Directive {
  export type MatchedResult = RegExpMatchArray & { directive: string }
  type Handler<Arg> = O.Overwrite<Spec<Arg>, { arguments: RegExp }>

  export type Spec<Arg> = {
    arguments: RegExp | string
    handle?: (arg: Arg, m: MatchedResult) => void
  }

  export type Specs<Arg> = {
    [k: string]: Spec<Arg> | string
  }

  export class Matcher<Arg> {
    private handlers = new Map<string, Handler<Arg>>()

    private _names?: RegExp
    private get names(): RegExp {
      if (!this._names) {
        const names = Array.from(this.handlers.keys()).join("|")
        this._names = new RegExp(`#gk:(${names})\\b(.*)$`)
      }
      return this._names
    }

    register(specs: Specs<Arg>): this {
      for (const [name, s] of Object.entries(specs)) {
        let spec = s
        while (typeof spec === "string") {
          spec = specs[spec]
        }
        const { arguments: args, handle } = spec
        this.handlers.set(name, { arguments: build(args), handle })
      }
      return this
    }

    process(arg: Arg, line: string): boolean {
      let m = line.match(this.names)
      if (!m) return false
      const name = m[1]
      const rest = m[2]
      const handler = this.handlers.get(name)!
      m = rest.match(handler.arguments)
      if (!m) return false

      const mr = m as unknown as MatchedResult
      mr.directive = name
      handler.handle?.(arg, mr)
      return true
    }
  }
}
