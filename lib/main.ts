import { parseArgs } from "node:util"

import { readFile, writeFile } from "fs/promises"

import genko from "./index"

async function main() {
  const {
    values: { input, output, plugins },
  } = parseArgs({
    options: {
      input: {
        type: "string",
        short: "i",
      },
      output: {
        type: "string",
        short: "o",
        default: "/dev/stdout",
      },
      plugins: {
        type: "string",
        multiple: true,
        default: [],
        short: "p",
      },
    },
  })
  if (!input || !output) throw new Error("Bad arguments")
  for (const pluginFile of plugins!) {
    const content = (await readFile(pluginFile)).toString()
    genko.loadPlugin(content)
  }
  const content = (await readFile(input)).toString()
  console.time("render")
  const result = await genko.parse(content, {
    digest: true,
    digestSep: "<!--more-->",
  })
  console.timeEnd("render")
  await writeFile(output, result.html)
}

main().catch(console.error)
