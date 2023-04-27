import { marked } from "marked"
import { C } from "ts-toolbelt"

import { BlockClass } from "../block"
import { SectionMap } from "../section"
import { Directive } from "./directive"
import { Meta } from "./meta"

export interface BlockSpec<
  Fields extends Meta.FieldSpecs,
  Block extends BlockClass,
  SubBlock extends BlockClass | undefined
> {
  block: Block
  subblock?: SubBlock
  metaFields: Fields
  directives: Directive.Specs<Meta.Container<Fields>>

  compose(options: {
    token: marked.Tokens.Code
    meta: Meta.Container.Resolved<Fields>
    lines: string[]
    sections: SectionMap
    subblock: SubBlock extends C.Class<any[], infer I> ? I : undefined
  }): InstanceType<Block>
}

export namespace BlockSpec {
  export type Any = BlockSpec<
    Meta.FieldSpecs,
    BlockClass,
    BlockClass | undefined
  >
}
