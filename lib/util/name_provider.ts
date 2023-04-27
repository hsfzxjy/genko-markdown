export class NameProvider {
  private count = 0
  private refs = new Map<string, number>()
  constructor(
    private prefix = "",
    private absentPrefix = "",
    private refDelimiter: string | false = false
  ) {}

  derive(name: string | undefined): string {
    if (name === undefined) name = `${this.absentPrefix}${++this.count}`
    name = `${this.prefix}${name}`
    const refs = this.refs
    const refCount = refs.get(name) ?? 0
    if (refCount !== 0 && this.refDelimiter === false)
      throw new Error(`duplicated name ${name}`)
    refs.set(name, refCount + 1)
    return refCount === 0 ? name : `${name}${this.refDelimiter}${refCount}`
  }
}
