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

function colorRng() {
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
  colorRng: ReturnType<typeof colorRng> = colorRng()
  constructor(public $figure: HTMLElement) {
    this.$gutter = $figure.querySelector(".gk-code-gutter")!
    this.$display = $figure.querySelector(".gk-code-display")!
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

    this.$gutter
      .querySelectorAll(".gk-section")
      .forEach(($el) => new Section(this, $el as HTMLElement))
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

class Section {
  sid: string
  desc: string
  $section: HTMLElement
  $buttons: HTMLElement[] = []
  zipExpandable: Expandable | undefined
  constructor(public p: CodeBlock, public $el: HTMLElement) {
    const { gkSid: sid } = $el.dataset
    this.sid = sid!
    this.$section = p.$display.querySelector(`[data-gk-sid="${sid}"]`)!
    const { gkDesc: desc } = this.$section.dataset
    this.desc = desc ?? ""

    if (this.isZip) this.initZip()
    if (this.isZip || desc) this.initTooltip()
  }

  get isZip(): boolean {
    return this.$section.classList.contains("gk-zip")
  }

  initZip() {
    this.zipExpandable = new Expandable(
      [this.$el, this.$section],
      () => "22.4",
      async ($el, setHeight) => {
        setHeight()
        $el.classList.toggle("zipped")
      },
      this.$section.classList.contains("zipped") ? State.Hidden : State.Shown
    )

    this.$buttons.push(
      h("button", [], "zip").on("click", () => this.zipExpandable?.collapse())
    )
    this.$el.childNodes[0].addEventListener("click", () =>
      this.zipExpandable?.toggle()
    )
  }

  initTooltip() {
    const color = this.p.colorRng()
    this.$section.style.setProperty("--border-color", color)

    const $indicator = h("div", ["gk-indicator"])
    this.$section.prepend($indicator)

    let expandable: Expandable | undefined

    const $tooltip = h(
      "div",
      ["gk-tooltip", "hide"],
      h(
        "div",
        ["gk-tooltip-wrapper"],
        h(
          "div",
          ["gk-tooltip-btns"],
          h("button", [], "dismiss").on("click", () => expandable?.collapse()),
          ...this.$buttons
        ),
        this.desc ? h("div", ["gk-tooltip-content"], this.desc) : null
      )
    ).on("click", (e) => e.stopPropagation())

    if (this.desc) {
      this.$section.appendChild($tooltip)
      const $clone = $tooltip.cloneNode(true)
      this.$el.appendChild($clone)
      expandable = new Expandable(
        [$tooltip, $clone as HTMLElement],
        () => 0,
        async ($el, setHeight) => {
          $el.parentElement?.classList.toggle("tooltip-show")
          setHeight()
          $el.classList.toggle("hide")
        },
        State.Hidden
      )
    }

    this.$section.addEventListener("click", (e) => {
      if (window.getSelection()?.type === "Range") {
        e.stopPropagation()
        e.preventDefault()
        return
      }
      if (this.zipExpandable?.futureState === State.Hidden) {
        this.zipExpandable.expand()
      } else if (expandable) {
        expandable.toggle()
      } else {
        this.zipExpandable?.toggle()
      }
      e.stopPropagation()
    })
  }
}
enum State {
  Hidden,
  Shown,
}

namespace State {
  export function toggle(s: State): State {
    switch (s) {
      case State.Hidden:
        return State.Shown
      case State.Shown:
        return State.Hidden
    }
  }
}

enum Action {
  Hide,
  Show,
  Toggle,
}

class Expandable {
  constructor(
    private $els: HTMLElement[],
    private getMinHeight: () => number | string,
    private toggleClass: (
      $el: HTMLElement,
      setHeight: () => void
    ) => Promise<any>,
    private state: State
  ) {}

  private promise: Promise<State> | undefined
  private resolveFn: ((x: State) => void) | undefined
  private pending: Action[] = []

  private doit(nextAction: Action): Promise<any> {
    this.pending.push(nextAction)
    if (!this.promise) this.run()
    return this.promise ?? Promise.resolve()
  }

  private run() {
    let targetState = this.state
    for (const action of this.pending) {
      switch (action) {
        case Action.Hide:
          targetState = State.Hidden
          break
        case Action.Show:
          targetState = State.Shown
          break
        case Action.Toggle:
          targetState = State.toggle(targetState)
          break
      }
    }
    this.pending.length = 0
    if (targetState === this.state) return
    this.promise = new Promise<State>((resolve) => {
      this.resolveFn = resolve
    }).then((newState) => {
      this.state = newState
      this.promise = undefined
      return newState
    })
    switch (targetState) {
      case State.Hidden:
        this._collapse()
        return
      case State.Shown:
        this._expand()
        return
    }
  }

  private setHeight($el: HTMLElement) {
    const height = $el.scrollHeight
    $el.style.height = height + "px"
  }

  private async _collapse() {
    const minHeight = this.getMinHeight()
    const transition = this.$els[0].style.transition
    await Promise.all(
      this.$els.map(async ($el) => {
        $el.style.transition = ""
        await this.toggleClass($el, () => this.setHeight($el))
      })
    )
    requestAnimationFrame(() => {
      this.$els.forEach(($el) => ($el.style.transition = transition))

      requestAnimationFrame(() => {
        this.$els.forEach(($el) => ($el.style.height = minHeight + "px"))
        this.resolveFn!(State.Hidden)
      })
    })
  }
  private async _expand() {
    await Promise.all(
      this.$els.map(async ($el) => {
        await this.toggleClass($el, () => this.setHeight($el))
        await waitTransition($el)
        $el.style.height = ""
      })
    )
    this.resolveFn!(State.Shown)
  }
  collapse() {
    return this.doit(Action.Hide)
  }
  expand() {
    return this.doit(Action.Show)
  }
  toggle() {
    return this.doit(Action.Toggle)
  }
  get futureState(): State {
    let res = this.state
    if (this.promise) res = State.toggle(res)
    return res
  }
}

function waitTransition($el: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    let listener: undefined | ((e: TransitionEvent) => void)
    listener = function () {
      $el.removeEventListener("transitionend", listener!)
      listener = undefined
      resolve()
    }
    $el.addEventListener("transitionend", listener!)
  })
}
