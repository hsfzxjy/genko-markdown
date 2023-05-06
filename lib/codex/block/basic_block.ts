import hljs from "highlight.js"

import context from "../../context"
import { NameProvider } from "../../util/name_provider"
import { Id } from "../id"
import { defineBlock, Meta } from "../parse/index"
import { Render } from "../render"
import { SectionMap } from "../section"

const idProvider = context.scoped(() => new NameProvider("", `BLOCK`))

export class BasicBlock {
  static readonly type = "basicBlock"

  constructor(
    readonly id: string,
    readonly lang: string,
    readonly isVisible: boolean,
    readonly lines: string[],
    readonly title: string | undefined,
    readonly description: string | undefined,
    readonly sections: SectionMap,
    readonly classes: string[]
  ) {
    Id.put(this)
  }

  static fromString(content: string): BasicBlock {
    return new BasicBlock(
      idProvider.derive(undefined),
      "plaintext",
      true,
      content.split("\n"),
      undefined,
      undefined,
      new SectionMap(),
      []
    )
  }

  get text(): string {
    return this.lines.join("\n")
  }

  private highlighted: string[] | undefined
  highlight(): string[] {
    if (this.highlighted == undefined) {
      this.highlighted = hljs
        .highlight(this.text, {
          language: this.lang,
        })
        .value.split("\n")
    }
    return this.highlighted
  }

  render(highlighted?: string[]): string {
    let lines: string[]
    if (highlighted !== undefined) {
      lines = highlighted
    } else {
      lines = this.highlight()
    }

    return Render.wrap({
      lines,
      sections: this.sections,
      id: this.id,
      title: this.title,
      description: this.description,
      classes: this.classes,
    })
  }
}

defineBlock({
  block: BasicBlock,

  metaFields: {
    isVisible: <Meta.FieldSpec<boolean>>{
      default: () => true,
    },
    id: <Meta.FieldSpec<string | undefined, string>>{
      default: () => undefined,
      postproc: (val) => idProvider.derive(val),
    },
    title: <Meta.FieldSpec<string | undefined>>{
      default: () => undefined,
    },
    description: <Meta.FieldSpec<string | undefined>>{
      default: () => undefined,
    },
    classes: <Meta.FieldSpec<string[]>>{ default: () => [] },
  },

  directives: {
    invisible: {
      arguments: /^$/,
      handle: (meta) => meta.isVisible.set(false),
    },
    id: {
      arguments: "^{ws}({id})$",
      handle: (meta, m) => meta.id.set(m[1]),
    },
    immersive: {
      arguments: /^$/,
      handle: (meta) => meta.classes.get().push("immersive"),
    },
    title: {
      arguments: "^{ws}({title})$",
      handle: (meta, m) => meta.title.set(m[1]),
    },
    desc: {
      arguments: "^{ws}({desc})$",
      handle: (meta, m) => meta.description.set(m[1]),
    },
  },

  compose({ token, meta, lines, sections }) {
    const lang = hljs.getLanguage(token.lang ?? "") ? token.lang : "plaintext"
    return new BasicBlock(
      meta.id,
      lang!,
      meta.isVisible,
      lines,
      meta.title,
      meta.description,
      sections,
      meta.classes
    )
  },
})
