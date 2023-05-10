import * as crypto from "crypto"

import cache from "../../util/cache"
import { Executor } from "../exec"
import { defineBlock, Meta } from "../parse"
import { BasicBlock } from "./basic_block"

function getHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

enum CachePolicy {
  No,
  Yes,
}

namespace CachePolicy {
  export function fromBoolean(value: boolean): CachePolicy {
    if (value) return CachePolicy.Yes
    else return CachePolicy.No
  }
}

export class ExecBlock {
  static readonly type = "execBlock"
  constructor(
    readonly hashId: string,
    readonly basic: BasicBlock,
    readonly options: Executor.Options,
    readonly cachePolicy: CachePolicy
  ) {}

  async render(): Promise<string> {
    if (this.cachePolicy === CachePolicy.Yes) {
      const hit = await cache.get(this.hashId)
      if (hit !== undefined) return hit
    }
    const result = await Executor.run(this.basic.text, this.options)
    const rendered = typeof result === "string" ? result : await result.render()
    if (this.cachePolicy === CachePolicy.Yes) {
      await cache.store(this.hashId, rendered)
    }
    return rendered
  }
}

defineBlock({
  block: ExecBlock,
  subblock: BasicBlock,
  metaFields: {
    execOptions: <Meta.FieldSpec<Executor.Options>>{},
    cachePolicy: <Meta.FieldSpec<CachePolicy>>{
      default: () => CachePolicy.Yes,
    },
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
    cache: {
      arguments: "{ws}(yes|no)$",
      handle(meta, m) {
        meta.cachePolicy.set(CachePolicy.fromBoolean(m[1] == "yes"))
      },
    },
  },
  compose({ token, meta, subblock }) {
    const hash = `${token.lang ?? ""}-${getHash(token.raw)}`
    return new ExecBlock(hash, subblock, meta.execOptions, meta.cachePolicy)
  },
})
