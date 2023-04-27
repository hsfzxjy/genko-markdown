import { marked } from "marked"

export default <marked.MarkedExtension>{
  renderer: {
    paragraph(text: string) {
      let directive: string | undefined
      text = text.replace(/^@([a-z]+)/, (_, $1) => {
        directive = $1
        return ""
      })
      const klass = directive ? ` class="${directive}"` : ""
      return `<p ${klass}>${text}</p>\n`
    },
  },
}
