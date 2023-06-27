import { h } from "./util"

class UnifiedBlockSwitcherItem {
  private $header: HTMLElement
  constructor(
    private $el: HTMLElement,
    $switcher: HTMLElement,
    itemList: UnifiedBlockSwitcherItem[]
  ) {
    const { gkId: id, gkTitle: title } = $el.dataset
    const titleContent = (title || id) ?? ""
    this.$header = h("span", ["gk-font-ui"], titleContent)
      .on("click", () => {
        itemList.forEach((item) => item.activate(false))
        this.activate(true)
      })
      .attr("title", titleContent)
    $switcher.appendChild(this.$header)
  }
  activate(value: boolean) {
    this.$el.classList.toggle("active", value)
    this.$header.classList.toggle("active", value)
  }
}

function processUnifiedBlock($container: HTMLElement) {
  const $switcher = h("div", ["gk-unified-code-switcher"])
  const itemList: UnifiedBlockSwitcherItem[] = []

  for (const $basicBlock of $container.children) {
    itemList.push(
      new UnifiedBlockSwitcherItem(
        $basicBlock as HTMLElement,
        $switcher,
        itemList
      )
    )
  }
  itemList[0].activate(true)
  $container.prepend($switcher)
}

function colorGenerator() {
  let number = 1
  return function () {
    const hue = number * 137.508 // use golden angle approximation
    number++
    return `hsl(${hue},50%,60%)`
  }
}

function processBasicBlock($figure: HTMLElement, idPrefix: string) {
  const $container = $figure.querySelector(".gk-code-container")!
  const $display = $figure.querySelector(".gk-code-display")!
  const $gutter = h("div", ["gk-code-gutter"])
  const { gkId: id, gkTitle: title, gkDesc: desc } = $figure.dataset

  $figure.id = `${idPrefix}${id}`

  const parentHas = (klass: string) =>
    $figure.parentElement!.classList.contains(klass)

  const shouldShowTitle =
    title && // always show if title is not empty
    // otherwise, show if current block not in a tab|diff unified block
    !(
      parentHas("gk-unified-code") && // continue to check unified code type
      (parentHas("tab") || parentHas("diff"))
    )

  if (shouldShowTitle) {
    $figure.prepend(
      h("div", ["gk-code-title", "gk-font-ui"], h("span", [], title))
        .attr("title", title)
        .attr("aria-label", title)
    )
  }

  if (desc) {
    $figure.appendChild(h("div", ["gk-code-description"], h("span", [], desc)))
  }

  processLines($display.querySelector("pre") as HTMLElement, $gutter, {
    colorRng: colorGenerator(),
    idPrefix,
  })
  $container.prepend($gutter)
}

interface ProcessorContext {
  colorRng: ColorGenerator
  idPrefix: string
}

export function processBlocks($parent: HTMLElement, idPrefix = "") {
  $parent
    .querySelectorAll(".gk-unified-code.tab, .gk-unified-code.diff")
    .forEach(($el) => processUnifiedBlock($el as HTMLElement))
  $parent
    .querySelectorAll(".gk-code")
    .forEach(($el) => processBasicBlock($el as HTMLElement, idPrefix))
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
  context: ProcessorContext
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
    processSection($lineElement as HTMLElement, $gutterContainer, context)
  }
}

function processSection(
  $sectionDisplay: HTMLElement,
  $gutterContainer: HTMLElement,
  context: ProcessorContext
) {
  const { dataset } = $sectionDisplay
  const id = dataset.gkSid!
  const type = dataset.gkType!
  const desc = dataset.gkDesc ?? ""
  const isZip = type === "zip"

  $sectionDisplay.id = `${context.idPrefix}${id}`

  let zipExpandable: Expandable | undefined
  const $buttons = <{ text: string; onClick: () => void }[]>[]

  if (type === "include") {
    const refereeId = `${context.idPrefix}${dataset.gkReferee!}`
    $buttons.push({
      text: `Ref: <${refereeId}>`,
      onClick: () => {
        location.hash = `#${refereeId}`
        document.getElementById(refereeId)?.scrollIntoView()
      },
    })
  }

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
        text: "Zip Content",
        onClick: () => zipExpandable?.hide(),
      })
    }

    processLines($subLineContainer, $subGutterContainer, context)
  }

  if (desc) {
    const color = context.colorRng()
    $sectionDisplay.style.setProperty("--border-color", color)
    $sectionDisplay.prepend(h("div", ["gk-indicator"]))
  }

  let tooltipExpandable: Expandable | undefined
  if (desc) {
    $buttons.push({
      text: "Close Tooltip",
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
            ["gk-tooltip-button-group"],
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
