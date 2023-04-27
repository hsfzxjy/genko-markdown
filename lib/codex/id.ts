import { C } from "ts-toolbelt"

import context from "../context"
import { NameProvider } from "../util/name_provider"

export namespace Id {
  export type Entity = {
    readonly id: string
  }
  const SELF = "SELF"
  type SELF = typeof SELF

  export type MaybeSelf<E extends Entity> = E | SELF
  export type NonSelf = Exclude<string, SELF>

  type ClassOf<E extends object> = C.Class<any[], E>

  const table = context.scoped(() => new Map<string, Entity>())

  export function put(e: Entity) {
    const { id } = e
    if (table.has(id)) throw new Error(`Entity with id=${id} already exists`)
    table.set(id, e)
  }

  export function query<E extends Entity>(id: NonSelf, klass?: ClassOf<E>): E
  export function query<E extends Entity>(
    id: string,
    klass?: ClassOf<E>
  ): E | SELF {
    if (id === SELF) return id
    const entity = table.get(id)
    if (entity === undefined) {
      throw new Error(`Entity with id=${id} not exists`)
    }
    if (klass && !(entity instanceof klass)) {
      throw new Error(`Entity with id=${id} is not instance of ${klass}`)
    }
    return entity as E
  }

  export function fillSelf<E extends Entity>(self: E, maybeSelf: E | SELF): E {
    return maybeSelf === SELF ? self : maybeSelf
  }

  const disambiguator = context.scoped(
    () => new NameProvider(undefined, undefined, ":")
  )

  export function disambiguate(id: string): string {
    return disambiguator.derive(id)
  }
}
