const events = require("events")
const path = require("node:path")
const fs = require("node:fs/promises")
const chok = require("chokidar")
const express = require("express")
const escape = require("escape-html")

function removeModuleCache(name) {
  const toRemove = Object.keys(require.cache).filter((s) => s.match(name))
  toRemove.forEach((n) => delete require.cache[n])
}

async function genkoParse(content) {
  removeModuleCache("genko-markdown/dist/node")
  removeModuleCache("marked")
  removeModuleCache("highlight.js")
  const genko = require("../dist/node/index").default
  const scriptContent = await fs.readFile(pathTo("dev-server", "plugin.js"))
  genko.loadPlugin(scriptContent.toString())
  return genko.parse(content)
}

const app = express()
const port = 3000

app.get("/api/:name", async (req, res) => {
  const { name } = req.params
  const fn = pathTo("samples", name + ".md")
  const content = (await fs.readFile(fn)).toString()
  const rendered = (await genkoParse(content)).html
  res.json({
    md: escape(content),
    rendered,
    time: Date.now(),
  })
  res.end()
})

// Watch files
const emitter = new events.EventEmitter()
let lastChanged = Date.now()
const pathTo = (...args) => path.join(__dirname, "..", ...args)
chok.watch([pathTo("dist")]).on("all", () => {
  lastChanged = Date.now()
  emitter.emit("fire")
})

app.get("/poll/:time", async (req, res) => {
  const reqTime = parseInt(req.params.time)
  if (reqTime < lastChanged) {
    res.send("refresh")
    res.end()
    return
  }
  const listener = () => {
    res.send("refresh")
    emitter.removeListener("fire", listener)
    res.end()
  }
  emitter.addListener("fire", listener)
})

app.use("/web", express.static(pathTo("dist", "web"), {}))
app.use("/hljs", express.static(pathTo("node_modules", "highlight.js"), {}))

app.listen(port, () => {
  console.log(`dev server listening on port ${port}`)
})
