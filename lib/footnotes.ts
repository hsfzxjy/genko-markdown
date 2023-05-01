import { marked } from "marked"

import context from "./context"
import digest from "./digest"
import { Store } from "./util/store"

const store = context.scoped(() => new Store<marked.Tokens.Generic>())

const extension = <marked.TokenizerAndRendererExtension>{
  name: "footnote",
  level: "inline",
  start(src) {
    return src.match(/\(\(\(/)?.index
  },
  tokenizer(src) {
    const rule = /^\(\(\((.+?)\)\)\)/
    const matched = rule.exec(src)
    if (matched) {
      const contentTokens = this.lexer.inlineTokens(matched[1])
      const token = {
        type: "footnote",
        raw: matched[0],
        content: contentTokens,
        id: "",
      }
      const id = store.set(token)
      token.id = id
      return token
    }
  },
  renderer(token) {
    if (digest.digester.rendering) return ""
    const { id } = token
    token.renderedFootnote = this.parser.parseInline(token.content)
    return `<sup id="fnref:${id}"><a href="#fn:${id}">${id}</a></sup>`
  },
  childTokens: ["content"],
}

export default <marked.MarkedExtension>{
  extensions: [extension],
  hooks: {
    postprocess(this: marked.TokenizerThis, html: string): string {
      if (digest.digester.rendering) return html
      if (!store.size) return html
      const fragments = ['<div class="footnotes"><ol>']
      for (const [id, token] of store.entries()) {
        fragments.push(
          `<li class="footnote" id="fn:${id}">${token.renderedFootnote}</li>`
        )
      }
      fragments.push("</ol></div>")
      return html + fragments.join("")
    },
  },
}
