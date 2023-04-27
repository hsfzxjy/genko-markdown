import escapeHTML from "escape-html"

import { BasicBlock } from "../block/basic_block"
import { Id } from "../id"
import { SectionMap } from "../section"

export interface Render {
  render: () => Promise<string> | string
}

export namespace Render {
  export function asTextBlock(text: string): Render {
    return BasicBlock.fromString(text)
  }
}

export namespace Render {
  function dress(
    origLines: string[],
    sections: SectionMap
  ): { lines: string[]; gutter: string[] } {
    const lines = Array.from(origLines)
    const gutter = new Array(lines.length)
    for (const i in lines) {
      lines[i] = `<span class="line">${lines[i]}</span>`
      gutter[i] = `<span class="line"></span>`
    }
    for (const section of sections) {
      const { start, end, type, classes, id, description, referee } = section
      const klass = [`gk-section`, `gk-${type}`, ...classes].join(" ")
      const dataSid = ` data-gk-sid="${Id.disambiguate(id)}"`
      const dataDesc = description
        ? `data-gk-desc="${escapeHTML(description)}"`
        : ""
      const dataReferee = referee ? `data-gk-referee="${referee}"` : ""

      const codePrefix = `<div class="${klass}"${dataSid}${dataDesc}${dataReferee}>`
      const gutterPrefix = `<div class="${klass}"${dataSid}>`

      lines[start] = codePrefix + lines[start]
      lines[end] += "</div>"
      gutter[start] = gutterPrefix + gutter[start]
      gutter[end] += "</div>"
    }

    return { lines, gutter }
  }

  export function wrap(opts: {
    lines: string[]
    sections: SectionMap
    id: string
    title?: string
    description?: string
  }): string {
    const { title, description, id } = opts
    const { lines, gutter } = dress(opts.lines, opts.sections)

    const figTitle = title ? ` data-gk-title="${escapeHTML(title)}"` : ""
    const figDesc = description
      ? ` data-gk-desc="${escapeHTML(description)}"`
      : ""
    return (
      `<figure class="gk-code" data-gk-id="${Id.disambiguate(id)}"` +
      `${figTitle}${figDesc}>` +
      `<div class="gk-code-container">` +
      `<div class="gk-code-gutter"><pre>` +
      gutter.join("") +
      `</pre></div>` +
      `<div class="gk-code-display"><pre>` +
      lines.join("") +
      `</pre></div>` +
      "</div></figure>"
    )
  }
}
