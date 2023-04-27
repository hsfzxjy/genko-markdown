import { marked } from "marked"

import context, { Context } from "./context"

class Digester {
  private _enabled: boolean
  get enabled(): boolean {
    return this._enabled
  }
  private _rendering = false
  get rendering(): boolean {
    return this._rendering
  }
  private readonly separator: string
  readonly replacement: string
  constructor({ options }: Context) {
    this._enabled = options?.digest ?? false
    this.separator = options?.digestSep ?? "<!--more-->"
    this.replacement = `<!--${Math.random()}-->`
  }
  preprocess(text: string): string {
    if (!this._enabled) return text
    let replaced = false
    text = text.replace(this.separator, () => {
      replaced = true
      return this.replacement
    })
    if (!replaced) {
      this._enabled = false
    }
    return text
  }
  parseDigest(
    tokens: marked.Token[],
    parser: marked.Parser
  ): string | undefined {
    if (!this._enabled) return
    const { replacement } = this
    const index = tokens.findIndex(
      ({ raw, type }) => type === "html" && raw.trim() === replacement
    )
    if (index < 0) return
    this._rendering = true
    return parser.parse(tokens.slice(0, index))
  }
}

const digester = context.scoped((ctx) => new Digester(ctx))

const extension = <marked.MarkedExtension>{
  hooks: {
    preprocess: (text: string): string => {
      return digester.preprocess(text)
    },
  },
  renderer: {
    html(html) {
      return html.trim() === digester.replacement ? "" : false
    },
  },
}

export default {
  extension,
  digester,
}
