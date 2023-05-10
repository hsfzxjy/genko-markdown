import { diffLines } from "diff"

import context from "../../context"
import { NameProvider } from "../../util/name_provider"
import { Id } from "../id"
import { defineBlock, Meta } from "../parse"
import { Render } from "../render"
import { SectionMap } from "../section"
import { BasicBlock } from "./basic_block"
import { MultiBlockStyle } from "./style"

const idProvider = context.scoped(() => new NameProvider("", "DIFF"))

export class DiffBlock {
  static readonly type = "diffBlock"
  constructor(
    readonly blockOld: BasicBlock,
    readonly blockNew: BasicBlock,
    readonly style: MultiBlockStyle
  ) {}

  render(): string {
    const oldLines = this.blockOld.highlight()
    const newLines = this.blockNew.highlight()
    const changes = diffLines(this.blockOld.text, this.blockNew.text)
    const sections = new SectionMap()

    const lines: string[] = []
    let i = 0,
      j = 0,
      m = 0
    for (const change of changes) {
      const n = change.count!
      if (change.added) {
        for (let k = 0; k < n; k++, j++) lines.push(newLines[j])
        sections.put({
          id: undefined,
          type: "hl",
          start: m,
          end: m + n - 1,
          classes: ["diff-add"],
        })
      } else if (change.removed) {
        for (let k = 0; k < n; k++, i++) lines.push(oldLines[i])
        sections.put({
          id: undefined,
          type: "hl",
          start: m,
          end: m + n - 1,
          classes: ["diff-del"],
        })
      } else {
        for (let k = 0; k < n; k++, i++, j++) lines.push(oldLines[i])
        if (n >= 7)
          sections.put({
            id: undefined,
            type: "zip",
            start: m + 2,
            end: m + n - 3,
            classes: ["zipped"],
          })
      }
      m += n
    }

    const blockId = idProvider.derive(undefined)
    sections.seal(blockId)
    return (
      `<div class="gk-unified-code diff">` +
      Render.wrap({ lines, sections, id: blockId, title: "DIFF" }) +
      this.blockOld.render({ inUnified: true }) +
      this.blockNew.render({ inUnified: true }) +
      `</div>`
    )
  }
}

defineBlock({
  block: DiffBlock,
  subblock: BasicBlock,
  metaFields: {
    style: <Meta.FieldSpec<MultiBlockStyle>>{
      default: () => "row",
    },
    blockOld: <Meta.FieldSpec<Id.MaybeSelf<BasicBlock>>>{},
    blockNew: <Meta.FieldSpec<Id.MaybeSelf<BasicBlock>>>{},
  },
  directives: {
    style: {
      arguments: "^{ws}(row|col|tab)$",
      handle: (meta, m) => {
        meta.style.set(m[1] as MultiBlockStyle)
      },
    },
    diff: {
      arguments: "^{ws}({ref}){ws}({ref})$",
      handle: (meta, m) => {
        meta.type.set(DiffBlock)
        meta.blockOld.set(Id.query(m[1], BasicBlock))
        meta.blockNew.set(Id.query(m[2], BasicBlock))
      },
    },
  },
  compose({ meta, subblock }) {
    return new DiffBlock(
      Id.fillSelf(subblock, meta.blockOld),
      Id.fillSelf(subblock, meta.blockNew),
      meta.style
    )
  },
})
