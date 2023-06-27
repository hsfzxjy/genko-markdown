type _HTMLElement = HTMLElement & {
  on: (eventName: string, callback: (...args: any[]) => any) => _HTMLElement
  attr: (name: string, value: string) => _HTMLElement
}

export function h(
  tagName: string,
  classes?: string[],
  ...children: (HTMLElement | string | null | false | undefined)[]
): _HTMLElement {
  const $el = document.createElement(tagName) as ReturnType<typeof h>
  if (classes) $el.classList.add(...classes)
  for (const child of children) {
    if (!child) continue
    let $child: Node
    if (typeof child === "string") $child = document.createTextNode(child)
    else $child = child
    $el.appendChild($child)
  }
  $el.on = (eventName, callback) => {
    $el.addEventListener(eventName, callback)
    return $el
  }
  $el.attr = (name, value) => {
    $el.setAttribute(name, value)
    return $el
  }
  return $el
}

export function emplaceChildrenTo(
  $src: HTMLElement,
  $dest: HTMLElement
): Element[] {
  const children = Array.from($src.children, (child) => {
    child.remove()
    return child
  })
  $dest.append(...children)
  return children
}
