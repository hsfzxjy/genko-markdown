import { processCodeBlocks } from "./codex"

addEventListener("DOMContentLoaded", async () => {
  const data = await (await fetch(`/api/${location.search.slice(1)}`)).json()
  fetch(`/poll/${data.time}`).then(() => {
    location.reload()
  })
  const $markdown = document.querySelector("#markdown")!
  const $rendered = document.querySelector("#rendered")!
  $markdown.innerHTML = `<pre>${data.md}</pre>`
  $rendered.innerHTML = data.rendered

  processCodeBlocks($rendered as HTMLElement)
})
