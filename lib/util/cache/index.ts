import fs from "fs/promises"
import os from "os"
import path from "path"
import { rimrafSync } from "rimraf"

// eslint-disable-next-line @typescript-eslint/ban-types
type StoreOptions = {}

interface Backend<E = string> {
  store(key: string, value: E, options?: StoreOptions): Promise<boolean>
  get(key: string): Promise<E | undefined>
}

class FSBackend implements Backend<string> {
  private base: string
  private tmp!: string
  constructor(base: string) {
    this.base = path.resolve(base)
  }
  async store(
    key: string,
    value: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: StoreOptions
  ): Promise<boolean> {
    await this.init()
    const tmpFile = path.resolve(this.tmp, key)
    const file = path.resolve(this.base, key)
    try {
      await fs.writeFile(tmpFile, value)
      await fs.rename(tmpFile, file)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
  async get(key: string): Promise<string | undefined> {
    await this.init()
    try {
      const content = await fs.readFile(path.resolve(this.base, key))
      return content.toString()
    } catch (e: any) {
      if (e.code == "ENOENT") return undefined
      return Promise.reject(e)
    }
  }
  private initialized = false
  private async init() {
    if (this.initialized) return
    this.initialized = true
    await fs.mkdir(this.base, { recursive: true })
    this.tmp = await fs.mkdtemp(this.base + path.sep)
    const cleanup = () => {
      rimrafSync(this.tmp)
    }
    process
      .on("exit", cleanup)
      .on("SIGINT", () => {
        process.exit()
      })
      .on("SIGTERM", () => {
        process.exit()
      })
  }
}

const backend = new FSBackend(
  path.resolve(os.homedir(), ".cache", "genko-markdown-cache")
)
function getBackend(): Backend {
  return backend
}

export default getBackend()
