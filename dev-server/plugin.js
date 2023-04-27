genko.codex.Executor.register("d2", {
  run: async (text, options) => {
    let args = ["--pad", "0"]
    args.push("--bundle=false")
    if (options.args.theme) {
      args.push("--theme", options.args.theme)
    }
    if (options.args.sketch) {
      args.push("--sketch")
    }

    args = ["-c", `svgo -p 0 <(d2 ${args.join(" ")} {{input}} -) -o {{output}}`]
    const result = await genko.util.exec("/bin/bash", args, { stdin: text })

    return result.isSuccess
      ? `<figure class="gk-d2">${result.output}</figure>`
      : genko.util.render.asTextBlock(result.toString())
  },
})
