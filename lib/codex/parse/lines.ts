export class Lines {
  private removed = new Set<number>()
  private replaced = new Map<number, string[]>()
  private i = 0
  private nadded = 0

  constructor(private lines: string[]) {}

  get hasMore(): boolean {
    return this.i < this.lines.length
  }
  get current(): string {
    return this.lines[this.i]
  }
  get lineno(): number {
    return this.i + this.nadded - this.removed.size
  }
  replace(replacement: string[]) {
    this.nadded += replacement.length
    this.replaced.set(this.i, replacement)
  }
  next(removeCurrent = false) {
    if (this.hasMore) {
      if (removeCurrent) this.removed.add(this.i)
      this.i++
    }
  }
  resolve(): string[] {
    return this.lines
      .map((text, index) => {
        return this.replaced.get(index) ?? text
      })
      .filter((_, index) => {
        return !this.removed.has(index) || this.replaced.has(index)
      })
      .flat()
  }
}
