import { spawn } from "node:child_process"
import * as fs from "node:fs/promises"
import { Readable } from "node:stream"

import * as tmp from "tmp-promise"

import { Render } from "./render"

export namespace Executor {
  type Result = string | Render
  export type Options = {
    type: string
    args: Record<string, string>
  }
  export interface Base {
    readonly type: string
    run(text: string, options: Options): Promise<Result>
  }

  class Bash {
    readonly type = "bash"

    async run(text: string, { args: { cmd } }: Options): Promise<Result> {
      const process = await subprocess.exec("/bin/bash", ["-c", cmd], {
        stdin: text,
      })
      return Render.asTextBlock(process.toString().replace(/\n+$/gm, ""))
    }
  }

  const registry = new Map<string, Base>()
  registry.set("bash", new Bash())

  export function register(name: string, executor: Base) {
    registry.set(name, executor)
  }

  export async function run(text: string, options: Options): Promise<Result> {
    const executor = registry.get(options.type)
    if (executor === undefined)
      throw new Error(`unknown executor ${options.type}`)
    return executor.run(text, options)
  }
}

export namespace subprocess {
  function _exec(options: {
    program: string
    args: readonly string[]
    shell: string | boolean | undefined
    stdin: Readable | undefined
    encoding: BufferEncoding
  }): Promise<Result> {
    const p = spawn(options.program, options.args, {
      shell: options.shell,
      stdio: ["pipe", "pipe", "pipe"],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    p.stdout.on("data", (chunk) => stdout.push(chunk))
    p.stderr.on("data", (chunk) => stderr.push(chunk))
    if (options.stdin !== undefined) options.stdin.pipe(p.stdin)
    else p.stdin.end()

    return new Promise((resolve) => {
      p.on("exit", (exitCode) => {
        resolve(
          new Result(
            exitCode ?? 9999,
            Buffer.concat(stdout).toString(options.encoding),
            Buffer.concat(stderr).toString(options.encoding)
          )
        )
      })
    })
  }

  type Options = {
    stdin?: string | Readable | undefined
    shell?: string
    sub?: {
      input: string
      output: string
    }
    encoding?: BufferEncoding
  }

  class Result {
    constructor(
      public readonly exitCode: number,
      public readonly stdout: string,
      public readonly stderr: string,
      public output?: string
    ) {}

    get isSuccess(): boolean {
      return this.exitCode === 0
    }

    toString(): string {
      if (this.exitCode === 0) {
        return this.output ?? this.stdout
      } else {
        return (
          `===== RetCode =====\n${this.exitCode}\n` +
          `===== Stdout: =====\n${this.stdout}\n` +
          `===== Stderr: =====\n${this.stderr}\n`
        )
      }
    }
  }

  export async function exec(
    program: string,
    args: string[],
    options: Options
  ): Promise<Result> {
    let inputFilename: string | undefined
    let outputFilename: string | undefined
    const cleanups: (() => Promise<void>)[] = []
    let stdinContent: Readable | undefined
    if (typeof options.stdin === "string") {
      stdinContent = Readable.from(options.stdin, {
        encoding: options.encoding,
      })
    }
    options.sub = Object.assign(
      { input: "{{input}}", output: "{{output}}" },
      options.sub
    )
    for (const [i, arg] of args.entries()) {
      let newArg = arg
      if (!inputFilename && arg.includes(options.sub.input)) {
        const file = await tmp.file({ discardDescriptor: true })
        inputFilename = file.path
        cleanups.push(file.cleanup)
        newArg = arg.replace(options.sub.input, inputFilename)
      }
      if (!outputFilename && newArg.includes(options.sub.output)) {
        const file = await tmp.file({ discardDescriptor: true })
        outputFilename = file.path
        cleanups.push(file.cleanup)
        newArg = newArg.replace(options.sub.output, outputFilename)
      }
      args[i] = newArg
      if (inputFilename && outputFilename) break
    }
    try {
      if (inputFilename && stdinContent) {
        await fs.writeFile(inputFilename, stdinContent)
        stdinContent = undefined
      }
      const res = <Result>await _exec({
        program,
        args,
        shell: options.shell,
        stdin: stdinContent,
        encoding: options.encoding ?? "utf-8",
      })
      if (outputFilename) {
        res.output = (await fs.readFile(outputFilename)).toString(
          options.encoding
        )
      }
      return res
    } finally {
      await Promise.all(cleanups.map((f) => f()))
    }
  }
}
