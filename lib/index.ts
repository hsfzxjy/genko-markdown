import { marked } from "marked"

import codex from "./codex"
import context from "./context"
import digest from "./digest"
import footnotes from "./footnotes"
import latex from "./latex"
import { loadPlugin, registerPlugin } from "./plugin"
import typography from "./typography"

marked.setOptions({ smartypants: true })

marked.use(codex as any)
marked.use(latex)
marked.use(typography as any)
marked.use(footnotes)
marked.use(digest.extension)

const parser = new marked.Parser()
const markedOptions: marked.MarkedOptions & {
  hooks?: {
    preprocess?: (text: string) => string
    postprocess?: (text: string) => string
  }
} = marked.defaults

async function parse(
  src: string,
  options?: {
    tidy?: boolean
    digest?: boolean
    digestSep?: string
    marked?: marked.MarkedOptions
  }
): Promise<{ html: string; digest: string | undefined }> {
  await context.push(options)
  const { hooks } = markedOptions
  try {
    src = (await hooks?.preprocess?.(src)) ?? src
    const tokens = marked.lexer(src, { ...markedOptions, ...options?.marked })
    await Promise.all(
      (marked.walkTokens as any)(tokens, markedOptions.walkTokens) as any
    )
    let html = parser.parse(tokens)
    html = (await hooks?.postprocess?.(html)) ?? html

    let digestHtml = digest.digester.parseDigest(tokens, parser)
    if (digestHtml) {
      digestHtml = (await hooks?.postprocess?.(digestHtml)) ?? digestHtml
    }
    return { html, digest: digestHtml }
  } finally {
    context.pop()
  }
}

export default {
  parse,
  loadPlugin,
  registerPlugin,
}
