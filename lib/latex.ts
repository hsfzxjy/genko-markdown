import escapeHTML from "escape-html"
import { marked } from "marked"

import ctx from "./context"
import { Cache } from "./util/cache"

const patterns = [
  {
    pattern: /(?<![$\\])\$\$([^$`]+?)\$\$/gm,
    skipIfMatchedAnyOf: [/\n {4}/m],
  },
  {
    pattern: /(?<![$\\])\$([^$`\n]+?)\$(?!\$)/g,
    skipIfMatchedAnyOf: [],
  },
]

const cache = ctx.scoped(() => new Cache())

const hooks = {
  preprocess(text: string): string {
    for (const pat of patterns) {
      text = text.replace(pat.pattern, (raw) => {
        if (pat.skipIfMatchedAnyOf.some((neg) => raw.match(neg) !== null)) {
          return raw
        }
        const id = cache.set(raw)
        return `<\uFFFF>${id}</\uFFFF>`
      })
    }
    return text
  },
}

const extension = <marked.TokenizerAndRendererExtension>{
  name: "latex",
  level: "inline",
  start(src) {
    return src.startsWith("<\uffff>") ? 0 : -1
  },
  tokenizer(src) {
    const match = src.match(/^<\uffff>(\d+)<\/\uffff>/)
    if (match) {
      return {
        type: "latex",
        raw: match[0],
        text: cache.pop(match[1]),
      }
    }
  },
  renderer(token) {
    return escapeHTML(token.text)
  },
}

const walkTokens = <marked.MarkedExtension>{
  walkTokens: (token: marked.Token) => {
    const { type } = token
    let regex: RegExp
    switch (type) {
      case "code":
        regex = /<\uffff>(\d+)<\/\uffff>/g
        break
      case "codespan":
        regex = /&lt;\uffff&gt;(\d+)&lt;\/\uffff&gt;/g
        break
      default:
        return
    }
    token.text = token.text.replace(regex, (_, id) => cache.pop(id))
  },
}

export default {
  hooks: hooks,
  extensions: [extension],
  ...walkTokens,
}
