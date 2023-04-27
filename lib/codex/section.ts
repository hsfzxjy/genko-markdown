import { NameProvider } from "../util/name_provider"
import { Id } from "./id"

export class Section {
  constructor(
    readonly type: string,
    readonly id: string,
    readonly start: number,
    readonly end: number,
    readonly classes: string[],
    readonly referee?: Id.Entity,
    readonly description?: string
  ) {}

  get lines(): string[] {
    throw new Error("Method not implemented.")
  }
}

export namespace Section {
  const _ = { ...({} as Section) }
  export type Args = typeof _ | { id?: string }
}

export class SectionMap {
  private map = new Map<string, Section>()
  private idProvider = new NameProvider("", "SEC")
  private sealed = false

  put(args: Section.Args): Section {
    if (this.sealed) throw new Error("blockId already set")
    const id = (args.id = this.idProvider.derive(args.id))
    const section = new (Section as any)()
    Object.assign(section, args)
    this.map.set(id, section)
    return section
  }

  seal(blockId: string) {
    if (this.sealed) throw new Error("blockId already set")
    this.sealed = true
    for (const section of this) {
      const { id } = section
      Object.assign(section, { id: `${blockId}.${id}` })
      Id.put(section)
    }
  }

  [Symbol.iterator](): Iterator<Section> {
    if (!this.sealed && this.map.size) {
      throw new Error("blockId not set")
    }
    return this.map.values()
  }
}
