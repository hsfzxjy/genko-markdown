import { BasicBlock } from "../block/basic_block"
import { Id } from "../id"
import { Section, SectionMap } from "../section"
import { _Directive } from "./directive"
import { Lines } from "./lines"

export class SectionsParser {
  private stack: Section[] = []
  private sections = new SectionMap()
  constructor(private lines: Lines) {}

  resolve(blockId: string): SectionMap {
    const lines = this.lines
    while (lines.hasMore) {
      const matched = SectionsParser.matcher.process(this, lines.current)
      lines.next(matched)
    }
    if (this.stack.length) throw new Error("still")
    this.sections.seal(blockId)
    return this.sections
  }

  private begin({ groups, directive }: _Directive.MatchedResult) {
    const s = this.sections.put({
      type: directive,
      id: groups!.id,
      start: this.lines.lineno,
      end: -1,
      description: groups!.desc,
      classes: [],
    })
    this.stack.push(s)
    return s
  }
  private end({ directive }: _Directive.MatchedResult) {
    if (this.stack.at(-1)?.type !== directive.slice(3))
      throw new Error(`unmatched ${directive}`)
    const s = this.stack.pop()!
    ;(s as any).end = this.lines.lineno - 1
  }

  private static matcher = new _Directive.Matcher<SectionsParser>()
  static {
    const commonSuffix = "(?:{ws}id=(?<id>{id}))?(?:{ws}desc=(?<desc>{desc}))?$"
    this.matcher.register({
      include: {
        arguments: `{ws}target=(?<target>{ref})${commonSuffix}`,
        handle: (self, matched) => {
          const section = self.begin(matched)
          const referee = Id.query(
            matched.groups!.target as Id.NonSelf,
            BasicBlock
          )
          Object.assign(section, {
            end: self.lines.lineno + referee.lines.length - 1,
            referee,
          })
          self.lines.replace(referee.lines)
          self.stack.pop()
        },
      },
      zip: {
        arguments: `^(?:{ws}(?<zipped>zipped))?${commonSuffix}`,
        handle: (self, matched) => {
          const section = self.begin(matched)
          if (matched.groups!.zipped) section.classes.push("zipped")
        },
      },
      hl: {
        arguments: commonSuffix,
        handle: (self, m) => self.begin(m),
      },
      section: "hl",
      endzip: {
        arguments: /^$/,
        handle: (self, m) => self.end(m),
      },
      endhl: "endzip",
      endsection: "endzip",
    })
  }
}
