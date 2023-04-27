import { Executor, subprocess } from "./codex/exec"
import { Render } from "./codex/render"

const genko = {
  codex: { Executor: { register: Executor.register } },
  util: {
    exec: subprocess.exec,
    render: {
      asTextBlock: Render.asTextBlock,
    },
  },
  config: {},
}

export function loadPlugin(scriptContent: string) {
  const fn = new Function(`genko`, `${scriptContent}`)
  fn(genko)
}

export function registerPlugin(scriptInit: (gk: typeof genko) => void) {
  scriptInit(genko)
}
