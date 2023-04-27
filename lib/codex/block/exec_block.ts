import * as crypto from "crypto"

import { Executor } from "../exec"
import { defineBlock, Meta } from "../parse"
import { BasicBlock } from "./basic_block"

function getHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

export class ExecBlock {
  static readonly type = "execBlock"
  constructor(
    readonly hashId: string,
    readonly basic: BasicBlock,
    readonly options: Executor.Options
  ) {}

  async render(): Promise<string> {
    const result = await Executor.run(this.basic.text, this.options)
    const rendered = typeof result === "string" ? result : await result.render()
    return rendered
  }
}

defineBlock({
  block: ExecBlock,
  subblock: BasicBlock,
  metaFields: {
    execOptions: <Meta.FieldSpec<Executor.Options>>{},
  },
  directives: {
    exec: {
      arguments: "{ws}type=(?<type>[a-z0-9]+)(?:{ws}(?<cmd>.+))?$",
      handle(meta, { groups }) {
        meta.type.set(ExecBlock)
        meta.execOptions.set({
          type: groups!.type,
          args: {
            cmd: groups!.cmd,
          },
        })
      },
    },
    execarg: {
      arguments: "{ws}(?<key>\\w+){ws}(?<value>\\w+)$",
      handle(meta, { groups }) {
        meta.execOptions.get().args[groups!.key] = groups!.value
      },
    },
  },
  compose({ token, meta, subblock }) {
    const hash = `${token.lang ?? ""}-${getHash(token.raw)}`
    return new ExecBlock(hash, subblock, meta.execOptions)
  },
})
