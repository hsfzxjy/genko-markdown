import { h } from "./util"

class UnifiedChildBlock {
  private $header: HTMLElement
  constructor(private $el: HTMLElement, parent: UnifiedBlock) {
    const { gkId: id, gkTitle: title } = $el.dataset
    this.$header = h("div", [], h("span", [], title || id)).on("click", () =>
      parent.switchTo(this)
    )
    parent.$banner.appendChild(this.$header)
  }
  deactivate() {
    this.$el.classList.remove("active")
    this.$header.classList.remove("active")
  }
  activate() {
    this.$el.classList.add("active")
    this.$header.classList.add("active")
  }
}

class UnifiedBlock {
  readonly $banner: HTMLElement
  readonly children: UnifiedChildBlock[] = []
  constructor($container: HTMLElement) {
    this.$banner = h("div", ["banner"])

    for (const $child of $container.childNodes) {
      this.children.push(new UnifiedChildBlock($child as HTMLElement, this))
    }
    this.switchTo(this.children[0])
    $container.prepend(this.$banner)
  }
  switchTo(child: UnifiedChildBlock) {
    this.children.forEach((c) => c.deactivate())
    child.activate()
  }
}

function colorGenerator() {
  let number = 1
  return function () {
    const hue = number * 137.508 // use golden angle approximation
    number++
    return `hsl(${hue},50%,60%)`
  }
}

class CodeBlock {
  $gutter: HTMLElement
  $display: HTMLElement
  id?: string
  title?: string
  desc?: string
  colorRng = colorGenerator()
  constructor(public $figure: HTMLElement) {
    const $container = $figure.querySelector(".gk-code-container")
    this.$display = $figure.querySelector(".gk-code-display")!
    this.$gutter = h("div", ["gk-code-gutter"])
    const { gkId: id, gkTitle: title, gkDesc: desc } = $figure.dataset
    this.id = id
    this.title = title
    this.desc = desc

    const parentHas = (klass: string) =>
      ($figure.parentNode as HTMLElement).classList.contains(klass)
    if (
      title &&
      !(parentHas("gk-unified-code") && (parentHas("tab") || parentHas("diff")))
    ) {
      $figure.prepend(h("div", ["gk-code-title"], h("span", [], title)))
    }

    if (desc) {
      $figure.appendChild(
        h("div", ["gk-code-description"], h("span", [], desc))
      )
    }

    processLines(
      this.$display.querySelector("pre") as HTMLElement,
      this.$gutter,
      this.colorRng
    )
    $container?.prepend(this.$gutter)
  }
}

export function processCodeBlocks($parent: HTMLElement) {
  $parent
    .querySelectorAll(".gk-unified-code.tab, .gk-unified-code.diff")
    .forEach(($el) => new UnifiedBlock($el as HTMLElement))
  $parent
    .querySelectorAll(".gk-code")
    .forEach(($el) => new CodeBlock($el as HTMLElement))
}

const $gutterForNormalLine = h(
  "div",
  ["gk-gutter-line"],
  h("span", ["gk-gutter-item"]),
  h("span", ["gk-gutter-phantom", "line"])
)

type ColorGenerator = ReturnType<typeof colorGenerator>

function processLines(
  $lineContainer: HTMLElement,
  $gutterContainer: HTMLElement,
  colorRng: ColorGenerator
) {
  for (const $lineElement of $lineContainer.children) {
    if ($lineElement.tagName == "BR") continue
    if ($lineElement.classList.contains("line")) {
      const node = $gutterForNormalLine.cloneNode(true)
      ;(node.childNodes[1] as any).innerHTML = $lineElement.innerHTML
      $gutterContainer.append(node)
      continue
    }
    if (!$lineElement.classList.contains("gk-section")) {
      throw new Error(`unknown element: ${$lineElement}`)
    }
    processSection($lineElement as HTMLElement, $gutterContainer, colorRng)
  }
}

function processSection(
  $sectionDisplay: HTMLElement,
  $gutterContainer: HTMLElement,
  colorRng: ColorGenerator
) {
  // const id = $sectionDisplay.dataset.gkSid!
  const type = $sectionDisplay.dataset.gkType!
  const desc = $sectionDisplay.dataset.gkDesc ?? ""
  const isZip = type === "zip"

  let zipExpandable: Expandable | undefined
  const $buttons = <{ text: string; onClick: () => void }[]>[]

  const $gutterLine = h("div", ["gk-gutter-section", `gk-${type}`])
  let $subGutterContainer = $gutterLine
  let $subLineContainer = $sectionDisplay
  {
    if (isZip) {
      $gutterLine.classList.add("expandable")
      $subGutterContainer = h("div", ["expandable-content"])
      $gutterLine.append($subGutterContainer)

      $sectionDisplay.classList.add("expandable")
      $subLineContainer = h("div", ["expandable-content"])
      emplaceChildrenTo($sectionDisplay, $subLineContainer)
      $sectionDisplay.append($subLineContainer)
      zipExpandable = new Expandable(
        [$gutterLine, $sectionDisplay],
        State.from(!$sectionDisplay.classList.contains("zipped"))
      )
      $buttons.push({
        text: "zip",
        onClick: () => zipExpandable?.hide(),
      })
    }

    processLines($subLineContainer, $subGutterContainer, colorRng)
  }

  if (isZip || desc) {
    const color = colorRng()
    $sectionDisplay.style.setProperty("--border-color", color)
    $sectionDisplay.prepend(h("div", ["gk-indicator"]))
  }

  let tooltipExpandable: Expandable | undefined
  if (desc) {
    $buttons.push({
      text: "dismiss",
      onClick: () => tooltipExpandable?.hide(),
    })
    const $tooltip = h(
      "div",
      ["gk-tooltip", "expandable", "hidden"],
      h(
        "div",
        ["expandable-content"],
        h(
          "div",
          ["gk-tooltip-wrapper"],
          h(
            "div",
            ["gk-tooltip-btns"],
            ...$buttons.map(({ text, onClick }) =>
              h("button", [], text).on("click", onClick)
            )
          ),
          desc ? h("div", ["gk-tooltip-content"], desc) : null
        )
      )
    ).on("click", (e) => e.stopPropagation())

    {
      $subLineContainer.append($tooltip)
      const $tooltipClone = $tooltip.cloneNode(true) as HTMLElement
      tooltipExpandable = new Expandable(
        [$tooltip, $tooltipClone],
        State.Hidden,
        (state) =>
          $sectionDisplay.classList.toggle(
            "tooltip-shown",
            state === State.Shown
          )
      )
      $subGutterContainer.append(
        h(
          "div",
          ["gk-gutter-line"],
          h("span", ["gk-gutter-item"]),
          h("span", ["gk-gutter-phantom"], $tooltipClone)
        )
      )
    }
  }

  $sectionDisplay.addEventListener("click", (e) => {
    if (window.getSelection()?.type === "Range") {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    if (zipExpandable?.state === State.Hidden) {
      zipExpandable.toggle()
    } else if (tooltipExpandable) {
      tooltipExpandable?.toggle()
    } else {
      zipExpandable?.toggle()
    }
    e.stopPropagation()
  })

  $gutterContainer.append($gutterLine)
}

function emplaceChildrenTo($src: HTMLElement, $dest: HTMLElement): Element[] {
  const children = Array.from($src.children, (child) => {
    child.remove()
    return child
  })
  $dest.append(...children)
  return children
}
enum State {
  Hidden = 0,
  Shown = 1,
}

namespace State {
  export function toggle(s: State): State {
    return 1 - s
  }
  export function from(value: boolean): State {
    return +value
  }
}

class Expandable {
  private _state: State
  constructor(
    private $elements: HTMLElement[],
    initialState: State,
    private onStateChange?: (newState: State) => void
  ) {
    this._state = initialState
    if (initialState === State.Hidden) {
      this.hide()
    }
  }

  hide() {
    this.$elements.forEach((el) => el.classList.add("hidden"))
    this._state = State.Hidden
    this.onStateChange?.(this._state)
  }

  show() {
    this.$elements.forEach((el) => el.classList.remove("hidden"))
    this._state = State.Shown
    this.onStateChange?.(this._state)
  }

  toggle() {
    switch (this._state) {
      case State.Hidden:
        this.show()
        return
      case State.Shown:
        this.hide()
        return
    }
  }

  get state(): State {
    return this._state
  }
}
