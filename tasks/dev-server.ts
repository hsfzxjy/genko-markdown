import { ChildProcess, spawn } from "node:child_process"

import gulp from "gulp"

import { namedTask } from "./util"

class DevServer {
  private reloadFlag = false
  private process?: ChildProcess
  private watcher: ReturnType<typeof gulp.watch>

  constructor(private callback: gulp.TaskFunctionCallback) {
    this.watcher = gulp.watch("dev-server/**.js")
    this.run()
    this.watcher
      .on("change", () => {
        this.reloadFlag = true
        this.process?.kill()
      })
      .on("error", () => this.onWatcherClose())
      .on("close", () => this.onWatcherClose())
  }

  private onWatcherClose() {
    this.reloadFlag = false
    this.process?.kill()
  }

  private run() {
    this.process = spawn("node", ["dev-server/server.js"], {
      stdio: "inherit",
      env: { ...process.env },
    }).on("exit", () => this.reloadProcess())
  }

  private reloadProcess() {
    if (!this.reloadFlag) {
      this.callback(null)
      return
    }
    this.reloadFlag = false
    this.run()
  }
}

export const devServer = namedTask(
  "dev-server",
  (cb: gulp.TaskFunctionCallback) => {
    new DevServer(cb)
  }
)
