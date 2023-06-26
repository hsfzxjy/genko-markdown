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
  ): { lines: string[] } {
    const lines = Array.from(origLines)
    for (const i in lines) {
      lines[i] = `<span class="line">${lines[i]}</span><br>`
    }
    for (const section of sections) {
      const { start, end, type, classes, id, description, referee } = section
      const klass = [`gk-section`, `gk-${type}`, ...classes].join(" ")
      const dataSid = ` data-gk-sid="${Id.disambiguate(id)}"`
      const dataType = ` data-gk-type="${type}"`
      const dataDesc = description
        ? `data-gk-desc="${escapeHTML(description)}"`
        : ""
      const dataReferee = referee ? `data-gk-referee="${referee}"` : ""

      const codePrefix = `<span class="${klass}"${dataSid}${dataType}${dataDesc}${dataReferee}>`

      lines[start] = codePrefix + lines[start]
      lines[end] += "</span>"
    }

    return { lines }
  }

  export function wrap(opts: {
    lines: string[]
    sections: SectionMap
    id: string
    title?: string
    description?: string
    classes?: string[]
  }): string {
    const { title, description, id, classes } = opts
    const { lines } = dress(opts.lines, opts.sections)

    const figTitle = title ? ` data-gk-title="${escapeHTML(title)}"` : ""
    const figDesc = description
      ? ` data-gk-desc="${escapeHTML(description)}"`
      : ""
    const figClasses = ["gk-code", ...(classes || [])].join(" ")
    return (
      `<figure class="${figClasses}" data-gk-id="${Id.disambiguate(id)}"` +
      `${figTitle}${figDesc}>` +
      `<div class="gk-code-container">` +
      `<div class="gk-code-display"><pre>` +
      lines.join("") +
      `</pre></div>` +
      "</div></figure>"
    )
  }
}
