export function process($from: HTMLElement, idPrefix: string) {
  for (const $el of $from.querySelectorAll<HTMLDivElement>(
    ".gk-unified-code"
  )) {
    new GKUnifiedCode($el, idPrefix)
  }
  for (const $el of $from.querySelectorAll<HTMLDivElement>(".gk-code")) {
    processGKCode($el, idPrefix)
  }
}

function processGKCode($el: HTMLDivElement, idPrefix: string, tabber?: Tabber) {
  if ($el.dataset.processed) return
  if (!tabber) {
    tabber = new Tabber()
    new GKCode($el, idPrefix, tabber, false)
    tabber.placeEl((tabber) => $el.before(tabber))
  } else {
    new GKCode($el, idPrefix, tabber, true)
  }
}

class GKUnifiedCode {
  constructor($el: HTMLElement, idPrefix: string) {
    ;({
      tab: this.initTabStyle,
      row: this.initRowStyle,
      col: this.initColStyle,
    })[$el.dataset.gkStyle ?? "tab"]!($el, idPrefix)
  }
  private initTabStyle($el: HTMLElement, idPrefix: string) {
    const tabber = new Tabber()
    for (const $child of $el.querySelectorAll<HTMLDivElement>(".gk-code")) {
      processGKCode($child, idPrefix, tabber)
    }
    tabber.placeEl((tabber) => $el.prepend(tabber))
  }
  private initRowStyle($el: HTMLElement, idPrefix: string) {
    const tabbers = []
    for (const $child of $el.querySelectorAll<HTMLDivElement>(".gk-code")) {
      const tabber = new Tabber()
      processGKCode($child, idPrefix, tabber)
      tabbers.push(tabber)
    }
    for (const tabber of tabbers.reverse()) {
      tabber.placeEl((tabber) => $el.prepend(tabber))
    }
    $el.style.setProperty("--gk-code-count", `${tabbers.length}`)
  }
  private initColStyle($el: HTMLElement, idPrefix: string) {
    for (const $child of $el.querySelectorAll<HTMLDivElement>(".gk-code")) {
      const tabber = new Tabber()
      processGKCode($child, idPrefix, tabber)
      tabber.placeEl((tabber) => $child.before(tabber))
    }
  }
}

class Env {
  private _lineHeight?: number
  get lineHeight() {
    if (this._lineHeight === undefined) {
      this._lineHeight = parseInt(
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--gk-code-line-height")
      )
    }
    return this._lineHeight
  }
  private colorState = 1
  nextColor() {
    const hue = this.colorState * 137.508 // use golden angle approximation
    this.colorState++
    return `hsla(${hue},50%,60%,0.8)`
  }
}

const env = new Env()

type VisibilitySM = SM<"visible" | "hidden">

class Tabber {
  private $el?: HTMLElement
  private $elList?: HTMLElement
  private sms = <VisibilitySM[]>[]
  private tabs = <HTMLElement[]>[]
  private $prevButton?: HTMLElement
  private $nextButton?: HTMLElement
  private activeIndex = 0
  private create$ElList(): HTMLElement {
    if (this.$el) return this.$elList!
    this.$el = $("div", {
      class: "gk-tabber",
      children: [
        (this.$elList = $("div", {
          class: "gk-tab-list",
        })),
      ],
    })
    return this.$elList
  }
  private onTabClick(i: number) {
    this.activeIndex = i
    for (let j = 0; j < this.sms.length; j++) {
      this.sms[j].set(i === j ? "visible" : "hidden")
    }
    this.adjustIndicator()
  }
  add(text: string, sm: VisibilitySM) {
    const $el = this.create$ElList()
    const $tab = $("div", { class: "gk-tab", children: text })
    $el.append($tab)
    const i = this.sms.length
    $tab.addEventListener("click", () => this.onTabClick(i))
    this.sms.push(sm)
    this.tabs.push($tab)
    sm.classSetter("gk-active", "visible").bind($tab)
  }
  placeEl(placeFn: (el: HTMLElement) => void) {
    if (!this.$el) return
    this.onTabClick(0)
    this.$prevButton = $("div", {
      class: ["gk-tab-button", "gk-tab-button-prev", "gk-disabled"],
      children: [$("span")],
    })
    this.$prevButton.addEventListener("click", () => {
      this.$elList!.scrollBy({ left: -100, behavior: "smooth" })
      this.adjustButtons(this.$elList!.scrollLeft - 100)
    })

    this.$el.append(this.$prevButton)
    this.$nextButton = $("div", {
      class: ["gk-tab-button", "gk-tab-button-next", "gk-disabled"],
      children: [$("span")],
    })
    this.$nextButton.addEventListener("click", () => {
      this.$elList!.scrollBy({ left: 100, behavior: "smooth" })
      this.adjustButtons(this.$elList!.scrollLeft + 100)
    })
    this.$el.append(this.$nextButton)
    placeFn(this.$el)
    this.adjustButtons(0)
    new ResizeObserver(() => {
      this.adjustButtons(this.$elList!.scrollLeft)
      this.adjustIndicator()
    }).observe(this.$el!)
  }
  private adjustIndicator() {
    let x = 0
    for (let i = 0; i < this.activeIndex; i++) {
      x += this.tabs[i].getBoundingClientRect().width
    }
    const width = this.tabs[this.activeIndex].getBoundingClientRect().width
    this.$elList!.style.setProperty("--gk-tab-indicator-left", `${x}px`)
    this.$elList!.style.setProperty("--gk-tab-indicator-width", `${width}px`)
  }
  private adjustButtons(scrollLeft: number) {
    let totalWidth = 0
    for (const $tab of this.tabs) {
      totalWidth += $tab.getBoundingClientRect().width
    }
    const visualWidth = this.$el!.getBoundingClientRect().width
    this.$prevButton!.classList.toggle("gk-disabled", scrollLeft <= 0)
    this.$nextButton!.classList.toggle(
      "gk-disabled",
      totalWidth - scrollLeft <= visualWidth + 2
    )
  }
}

class GKCode {
  private readonly $gutterEl: HTMLElement
  private readonly children: Widget[]
  constructor(
    private $el: HTMLElement,
    idPrefix: string,
    tabber: Tabber,
    forceTitle: boolean
  ) {
    $el.id = `${idPrefix}${$el.dataset.gkId!}`
    $el.dataset.processed = "true"
    this.$gutterEl = $("div", { class: "gk-gutter" })
    this.$el.prepend(this.$gutterEl)
    const $pre = $el.querySelector(".gk-code-display > pre")! as HTMLPreElement

    const root = new Node("auto")
    this.children = Widget.createList($pre, idPrefix, this.$gutterEl, root)
    for (const c of this.children) {
      c.onBeforeLayout()
    }
    root.seal(0)

    const sm = SM.binary("visible", "hidden", "visible")
    sm.classSetter("gk-hidden", "hidden").bind($el)

    let titleText = this.$el.dataset.gkTitle
    if (!titleText && forceTitle) {
      titleText = this.$el.dataset.gkId!
    }
    if (titleText) tabber.add(titleText, sm)
  }
}

class GutterWidget {
  readonly $el: HTMLElement
  constructor(
    public readonly $parentEl: HTMLElement,
    type: "line" | "group",
    protected node: Node
  ) {
    this.$el = $("div", { class: `gk-gutter-${type}` })
    $parentEl.appendChild(this.$el)
    node.valueChanged.on(({ new: value }) => {
      this.$el.style.height = `${value * env.lineHeight}px`
    })
    node.precSumChanged.on(({ new: precSum }) => {
      this.$el.style.top = `${precSum * env.lineHeight}px`
    })
  }
}

/**
 * A Widget is a line or a section in a code block.
 */
abstract class Widget {
  abstract readonly firstLine: Line
  abstract readonly lastLine: Line

  constructor(
    public readonly $el: HTMLElement,
    idPrefix: string,
    public readonly $gutterParent: HTMLElement,
    protected readonly parentNode: Node
  ) {
    const id = $el.dataset.gkSid
    if (id) {
      $el.id = `${idPrefix}${id}`
    }
  }

  onBeforeLayout() {}

  static create(...args: ConstructorParameters<typeof Widget>): Widget {
    let cntr: { new (..._: typeof args): Widget }

    const $el = args[0]
    const cl = $el.classList
    if (cl.contains("line")) {
      cntr = Line
    } else if (cl.contains("gk-section")) {
      const gkType = $el.dataset.gkType ?? ""
      cntr =
        {
          zip: GKZipSection,
          section: GKSection,
        }[gkType] ?? GKSection
      if (!cntr) throw new Error(`Unknown gkType: ${gkType}`)
    } else {
      throw new Error(`Unknown widget type: ${$el}`)
    }
    return new cntr(...args)
  }

  static createList(
    ...[$parent, ...rest]: ConstructorParameters<typeof Widget>
  ): Widget[] {
    function skip($el: Element): boolean {
      if ($el.tagName === "BR") return true
      for (const c of $el.classList) {
        if (c.startsWith("gk-tooltip")) return true
      }
      return false
    }
    const list = []
    for (const $el of $parent.children) {
      if (skip($el)) continue
      list.push(Widget.create($el as HTMLElement, ...rest))
    }
    return list
  }
}

class GKSection extends Widget {
  private children: Widget[]

  get firstLine() {
    return this.children[0].firstLine
  }

  get lastLine() {
    return this.children[this.children.length - 1].lastLine
  }

  readonly gutter: GutterWidget
  readonly node: Node

  constructor(...args: ConstructorParameters<typeof Widget>) {
    super(...args)
    this.node = this.parentNode.insertAtTail("auto")
    this.node.valueChanged.on(({ new: value }) => {
      this.$el.style.height = `${value * env.lineHeight}px`
    })
    this.gutter = new GutterWidget(this.$gutterParent, "group", this.node)
    this.children = Widget.createList(
      this.$el,
      args[1],
      this.gutter.$el,
      this.node
    )

    const gkType = this.$el.dataset.gkType ?? "section"
    this.gutter.$el.dataset.gkType = gkType
  }

  onBeforeLayout() {
    let shouldLayout = false
    const desc = this.$el.dataset.gkDesc
    if (desc) {
      shouldLayout =
        this.lastLine.registerTooltip({
          for: this,
          text: desc,
          show: !!this.$el.dataset.gkDescShow,
        }) == 0
    }
    for (const c of this.children) {
      c.onBeforeLayout()
    }
    if (shouldLayout) {
      this.lastLine.layoutTooltip()
    }
  }
}

type TooltipOption = Readonly<{
  for: GKSection
  text: string
  show: boolean
}>

class Tooltip {
  readonly linesCount: number
  readonly color: string
  constructor(
    private readonly container: TooltipContainer,
    public readonly option: TooltipOption,
    private readonly index: number
  ) {
    this.linesCount = option.text.split("\n").length
    this.color = env.nextColor()
  }
  private get level() {
    let level = 0
    for (let p: Node | null = this.option.for.node; p; p = p.parent) {
      level++
    }
    return level - 2
  }
  layout(topLines: number) {
    const $container = this.container.$container
    const top = Math.trunc(topLines * env.lineHeight)
    const left = (this.index * 2 + 1) * env.lineHeight
    const height = this.linesCount * env.lineHeight
    const level = this.level

    const $box = $("div", {
      class: "gk-tooltip-box",
      style: {
        "--top": `${top}px`,
        "--left": `${left}px`,
        "--height": `${height}px`,
        "--color": this.color,
      },
      children: [
        $("span", { class: "gk-tooltip-box-text", children: this.option.text }),
      ],
    })
    $container.appendChild($box)

    const $hline = $("div", {
      class: "gk-tooltip-hline",
      style: {
        "--top": `${top + height / 2}px`,
        "--width": `${left}px`,
        "--color": this.color,
        "--level": `${level}`,
      },
    })
    $container.appendChild($hline)

    const $vline1 = $("div", {
      class: "gk-tooltip-vline1",
      style: {
        "--height": `${top + height / 2}px`,
        "--color": this.color,
        "--level": `${level}`,
      },
    })
    $container.appendChild($vline1)

    const $vline2 = $("div", {
      class: "gk-tooltip-vline2",
      style: {
        "--height": `${top + height / 2}px`,
        "--color": this.color,
        "--level": `${level}`,
      },
    })
    this.option.for.$el.appendChild($vline2)

    this.container.switcherClassSetter
      .bind($vline1)
      .bind($vline2)
      .bind($hline)
      .bind($box)
  }
}

class TooltipContainer {
  public readonly $container: HTMLElement
  public readonly gutter: GutterWidget
  public readonly tooltips: Tooltip[] = []
  readonly node: Node
  constructor(firstOption: TooltipOption) {
    this.$container = $("div", { class: "gk-tooltip-container" })
    firstOption.for.$el.after(this.$container)
    this.node = firstOption.for.node.insertAfterMe("auto")
    this.gutter = new GutterWidget(
      firstOption.for.$gutterParent,
      "group",
      this.node
    )
    this.register(firstOption)

    let $button: HTMLElement
    const $switcher = $("div", {
      class: "gk-tooltip-switcher",
      children: [
        ($button = $("div", {
          class: "gk-tooltip-switcher-button",
          children: { html: iconMore },
        })),
      ],
    })
    $button.addEventListener("click", () => this.switcherSM.advance())
    this.$container.before($switcher)
    this.switcherClassSetter.bind(this.$container).bind($button)
    this.node.valueChanged.on(({ new: value }) => {
      this.$container.style.height = `${value * env.lineHeight}px`
    })
  }
  register(option: TooltipOption): number {
    const level = this.tooltips.length
    this.tooltips.push(new Tooltip(this, option, level))
    if (option.show) this.switcherSM.set("visible")
    return level
  }
  readonly switcherSM = SM.binary("visible", "hidden", "hidden")
  readonly switcherClassSetter = this.switcherSM.classSetter(
    "gk-hidden",
    "hidden"
  )
  layout() {
    const L = this.tooltips.length
    const marginLines = (L % 2 === 0 ? L + 2 : L + 1) / 2
    let top = 0
    let totalLines = marginLines
    for (let i = L - 1; i >= 0; i--) {
      const tt = this.tooltips[i]
      top += marginLines / (L + 1)
      tt.layout(top)
      top += tt.linesCount
      totalLines += tt.linesCount
    }
    this.switcherSM.withNode(this.node, {
      visible: totalLines,
      hidden: 0,
    })
  }
}

class GKZipSection extends GKSection {
  private readonly sm = SM.binary("visible", "hidden", "visible")
  constructor(...args: ConstructorParameters<typeof GKSection>) {
    super(...args)
    const $ellip = $("span", { class: "gk-ellipsis", children: "…" })
    this.firstLine.$el.appendChild($ellip)
    this.firstLine.$el.classList.add("gk-zip-first-line")
    this.firstLine.$el.addEventListener("click", () => this.sm.advance())

    const $iconCaret = $("span", {
      class: "gk-icon-caret",
      children: { html: iconCaret },
    })
    this.firstLine.gutter.$el.appendChild($iconCaret)

    this.sm
      .withNode(this.node, { hidden: 1, visible: "auto" })
      .classSetter("gk-hidden", "hidden")
      .bind(this.$el)
      .bind($iconCaret)
      .bind($ellip)

    this.firstLine.gutter.$el.addEventListener("click", () => this.sm.advance())
  }
}

class Line extends Widget {
  readonly gutter: GutterWidget
  get lastLine() {
    return this
  }
  get firstLine() {
    return this
  }
  constructor(...args: ConstructorParameters<typeof Widget>) {
    super(...args)
    const node = this.parentNode.insertAtTail(1)
    this.gutter = new GutterWidget(this.$gutterParent, "line", node)
  }
  private _tooltipContainer?: TooltipContainer
  registerTooltip(option: TooltipOption): number {
    if (!this._tooltipContainer) {
      this._tooltipContainer = new TooltipContainer(option)
      return 0
    }
    return this._tooltipContainer.register(option)
  }
  layoutTooltip() {
    if (this._tooltipContainer) {
      this._tooltipContainer.layout()
    }
  }
}

type StateChangeHandler<Names> = (n: Names) => void

abstract class Setter<I extends string, V> {
  private readonly elements = <HTMLElement[]>[]
  private lastInput?: I
  constructor(private evalFn: (i: I) => Record<string, V>) {}
  bind($el: HTMLElement): Setter<I, V> {
    this.elements.push($el)
    if (this.lastInput !== undefined) {
      this.fireElement($el, this.evalFn(this.lastInput))
    }
    return this
  }
  protected abstract fireElement(
    $el: HTMLElement,
    style: Record<string, V>
  ): void
  fire(i: I) {
    this.lastInput = i
    const style = this.evalFn(i)
    for (const $el of this.elements) {
      this.fireElement($el, style)
    }
  }
}

class StyleSetter<I extends string> extends Setter<I, string | null> {
  protected fireElement($el: HTMLElement, style: Record<string, string>) {
    for (const [k, v] of Object.entries(style)) {
      $el.style.setProperty(k, v)
    }
  }
}

class ClassSetter<I extends string> extends Setter<I, boolean> {
  protected fireElement($el: HTMLElement, style: Record<string, boolean>) {
    for (const [k, v] of Object.entries(style)) {
      $el.classList.toggle(k, v)
    }
  }
}

type TransitionMap<Names extends string> = {
  [k in Names]: Names
}

class SM<K extends string> {
  private stillAtInitial = true
  private readonly handlers = <StateChangeHandler<K>[]>[]
  get currentState() {
    return this.state
  }
  constructor(private map: TransitionMap<K>, private state: K) {}
  private fire() {
    for (const h of this.handlers) {
      h(this.state)
    }
  }
  withNode(node: Node, map: { [k in K]: number | "auto" }) {
    return this.onChanged((state) => {
      node.setMode(map[state])
    })
  }
  onChanged(h: StateChangeHandler<K>) {
    this.handlers.push(h)
    h(this.state)
    return this
  }

  set(state: K) {
    this.stillAtInitial = false
    this.state = state
    this.fire()
  }
  advance() {
    this.set(this.map[this.state])
  }

  styleSetter(getStyle: (i: K) => Record<string, string | null>) {
    const s = new StyleSetter(getStyle)
    this.onChanged((state) => s.fire(state))
    return s
  }

  classSetter(className: string, state: K): ClassSetter<K>
  classSetter(getClassList: (i: K) => Record<string, boolean>): ClassSetter<K>
  classSetter(arg1: any, arg2?: K): ClassSetter<K> {
    let getClassList: (i: K) => Record<string, boolean>
    if (typeof arg1 === "string") {
      getClassList = (i) => ({ [arg1]: i === arg2 })
    } else {
      getClassList = arg1
    }
    const s = new ClassSetter(getClassList)
    this.onChanged((state) => s.fire(state))
    return s
  }

  static binary<K1 extends string, K2 extends string>(
    k1: K1,
    k2: K2,
    initial: K1 | K2
  ): SM<K1 | K2> {
    return new SM({ [k1]: k2, [k2]: k1 } as TransitionMap<K1 | K2>, initial)
  }
}

const iconCaret = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M0 2l4 4 4-4H0z"></path></svg>`
const iconMore = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><defs><style>.a{fill:none;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;}</style></defs><path class="a" d="M7.2446,17.6313V30.5194"></path><path class="a" d="M12.8291,35.4112V12.66"></path><path class="a" d="M18.4149,15.32V32.8666"></path><path class="a" d="M23.9994,37.7429V10.1562"></path><path class="a" d="M29.5851,5.5v37"></path><path class="a" d="M35.1709,35.2977V12.9008"></path><path class="a" d="M40.7554,20.052v8.09"></path></g></svg>`

type Listener<T> = (arg: T) => void
type IEventBinder<T> = {
  on: (l: Listener<T>) => IEventBinder<T>
}

class EventEmitter<T> {
  private listeners = <Listener<T>[]>[]
  on(l: Listener<T>): EventEmitter<T> {
    this.listeners.push(l)
    return this
  }
  emit(arg: T) {
    for (const l of this.listeners) {
      l(arg)
    }
  }
  get binder() {
    return this as IEventBinder<T>
  }
}

type ChangedEvent<T extends NonNullable<any>> = { new: T; old: T | null }

class Node {
  private _sealed = false
  get sealed() {
    return this._sealed
  }

  protected prev: Node | null = null
  protected next: Node | null = null
  public parent: Node | null = null
  protected childHead: Node | null = null
  protected childTail: Node | null = null

  private insertAfter(newNode: Node, anchor: Node | null) {
    if (this.sealed) throw new Error("Sealed")
    newNode.parent = this
    if (anchor) {
      if (anchor.parent !== this) {
        throw new Error("Expected same parent")
      }
      newNode.next = anchor.next
      if (anchor.next) {
        anchor.next.prev = newNode
      }
      anchor.next = newNode
      newNode.prev = anchor
      if (newNode.next === null) {
        this.childTail = newNode
      }
    } else {
      if (this.childHead || this.childTail) {
        throw new Error("Expected no child")
      }
      this.childHead = newNode
      this.childTail = newNode
    }
  }

  insertAfterMe(mode: number | "auto"): Node {
    if (!this.parent) throw new Error("No parent")
    const node = new Node(mode)
    this.parent.insertAfter(node, this)
    return node
  }

  insertAtTail(mode: number | "auto"): Node {
    if (this.sealed) throw new Error("Sealed")
    const node = new Node(mode)
    this.insertAfter(node, this.childTail)
    return node
  }

  private readonly _precSumChanged = new EventEmitter<ChangedEvent<number>>()
  readonly precSumChanged = this._precSumChanged.binder

  private readonly _valueChanged = new EventEmitter<ChangedEvent<number>>()
  readonly valueChanged = this._valueChanged.binder

  private precSum = 0
  private childSum = 0
  private value = 0
  constructor(private mode: number | "auto") {}
  public seal(myPrecSum: number): number {
    if (this.sealed) throw new Error("Sealed")
    this._sealed = true
    this.precSum = myPrecSum
    this._precSumChanged.emit({ new: this.precSum, old: null })

    let childSum = 0
    for (let p = this.childHead; p; p = p.next) {
      childSum += p.seal(childSum)
    }
    this.childSum = childSum
    this.value = this.mode === "auto" ? childSum : this.mode
    this._valueChanged.emit({ new: this.value, old: null })
    return this.value
  }
  private setChildSumAndMode(childSum: number, mode: number | "auto") {
    if (!this.sealed) throw new Error("Not sealed")
    const oldValue = this.value
    this.childSum = childSum
    this.mode = mode
    const newValue = this.mode === "auto" ? this.childSum : this.mode
    this.value = newValue
    if (oldValue === newValue) return
    const delta = newValue - oldValue
    for (let p = this.next; p; p = p.next) {
      p.precSum += delta
      p._precSumChanged.emit({ new: p.precSum, old: p.precSum - delta })
    }
    if (!this.parent) return
    this.parent.setChildSumAndMode(
      this.parent.childSum + delta,
      this.parent.mode
    )
    this._valueChanged.emit({ new: newValue, old: oldValue })
  }
  public setMode(mode: number | "auto") {
    if (!this.sealed) {
      this.mode = mode
      return
    }
    this.setChildSumAndMode(this.childSum, mode)
  }
}

function $(
  tagName: string,
  option?: {
    class?: string[] | string
    style?: Record<string, string>
    children?: HTMLElement[] | string | { html: string }
  }
): HTMLElement {
  const $el = document.createElement(tagName)
  if (option?.class) {
    if (typeof option.class === "string") {
      $el.classList.add(option.class)
    } else {
      $el.classList.add(...option.class)
    }
  }
  if (option?.style) {
    for (const [k, v] of Object.entries(option.style)) {
      $el.style.setProperty(k, v)
    }
  }
  if (option?.children) {
    if (typeof option.children === "string") {
      $el.appendChild(document.createTextNode(option.children))
    } else if (Array.isArray(option.children)) {
      for (const c of option.children) {
        $el.appendChild(c)
      }
    } else {
      $el.innerHTML = option.children.html
    }
  }
  return $el
}
