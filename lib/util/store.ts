export class Store<T = string> {
  private map = new Map<string, T>()
  private id = 0
  set(text: T): string {
    const id = `${++this.id}`
    this.map.set(id, text)
    return id
  }
  pop(id: string): T {
    const text = this.map.get(id)
    if (text === undefined) throw new Error(`undefined id ${id}`)
    this.map.delete(id)
    return text
  }
  get size(): number {
    return this.map.size
  }
  entries(): Iterable<[string, T]> {
    return this.map.entries()
  }
}
