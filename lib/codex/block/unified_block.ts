import { Id } from "../id"
import { defineBlock, Meta } from "../parse"
import { BasicBlock } from "./basic_block"
import { MultiBlockStyle } from "./style"

export class UnifiedBlock {
  static readonly type = "unifiedBlock"
  constructor(readonly blocks: BasicBlock[], readonly style: MultiBlockStyle) {}

  render(): string {
    return (
      `<div class="gk-unified-code ${this.style}">` +
      this.blocks.map((block) => block.render()).join("") +
      `</div>`
    )
  }
}

defineBlock({
  block: UnifiedBlock,
  subblock: BasicBlock,
  metaFields: {
    blocks: <Meta.FieldSpec<Id.MaybeSelf<BasicBlock>[]>>{
      default: () => [],
    },
    style: <Meta.FieldSpec<MultiBlockStyle>>{
      default: () => "row",
    },
  },
  directives: {
    style: {
      arguments: "^{ws}(row|col|tab)$",
      handle: (meta, m) => {
        meta.style.set(m[1] as MultiBlockStyle)
      },
    },
    with: {
      arguments: "^{ws}({ref})$",
      handle: (meta, m) => {
        meta.type.set(UnifiedBlock)
        meta.blocks.get().push(Id.query(m[1], BasicBlock))
      },
    },
  },
  compose({ meta, subblock }) {
    const blocks = meta.blocks.map((b) => Id.fillSelf(subblock, b))
    return new UnifiedBlock(blocks, meta.style)
  },
})
