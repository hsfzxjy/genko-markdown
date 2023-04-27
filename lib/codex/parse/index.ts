import { marked } from "marked"

import type { BlockClass } from "../block"
import { Render } from "../render"
import { SectionMap } from "../section"
import { BlockSpec } from "./block"
import { _Directive } from "./directive"
import { Lines } from "./lines"
import { _Meta, Meta } from "./meta"
import { SectionsParser } from "./section_parser"

export { Meta } from "./meta"

const verbatimMatcher = new _Directive.Matcher().register({
  verbatim: { arguments: /^$/ },
})

const metaMatcher = new _Directive.Matcher<Meta.Container.Any>()

const blockSpecs = new Map<BlockClass, Omit<BlockSpec.Any, "directives">>()

export function defineBlock<
  Fields extends Meta.FieldSpecs,
  Block extends BlockClass,
  SubBlock extends BlockClass | undefined
>(spec: BlockSpec<Fields, Block, SubBlock>) {
  blockSpecs.set(spec.block, spec)
  _Meta.Container.register(spec.metaFields)
  metaMatcher.register(spec.directives as any)
}

export function parse(token: marked.Tokens.Code): Render {
  const lines = new Lines(token.text.split("\n"))
  const meta = new _Meta.Container()

  while (lines.hasMore && !lines.current.trim()) {
    lines.next()
  }

  let parseSections = true
  if (!lines.hasMore || verbatimMatcher.process(null, lines.current)) {
    lines.next(true)
    parseSections = false
  } else {
    while (lines.hasMore) {
      if (metaMatcher.process(meta, lines.current)) {
        lines.next(true)
      } else break
    }
  }

  const resolvedMeta = _Meta.Container.resolve(meta)
  const sections = parseSections
    ? new SectionsParser(lines).resolve(resolvedMeta.id)
    : new SectionMap()
  const resolvedLines = lines.resolve()

  const compose = (type: BlockClass) => {
    const BlockClass = blockSpecs.get(type)!
    let subblock: any
    if (BlockClass.subblock) subblock = compose(BlockClass.subblock)
    return BlockClass.compose({
      token,
      meta: resolvedMeta,
      lines: resolvedLines,
      sections,
      subblock,
    })
  }
  return compose(resolvedMeta.type)
}
