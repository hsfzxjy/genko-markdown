import "./block/basic_block"
import "./block/unified_block"
import "./block/diff_block"
import "./block/exec_block"

import { marked } from "marked"

import { parse } from "./parse"

export default {
  async: true,
  async walkTokens(token: any) {
    if (token.type !== "code") return
    const rendered = await parse(token).render()
    token.type = "codexRendered"
    token.content = rendered
  },
  extensions: [
    <marked.MarkedExtension>{
      name: "codexRendered",
      renderer(token: { content: string }): string {
        return token.content
      },
    },
  ],
}
