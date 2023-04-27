import gulp from "gulp"
import * as p from "path"

export type Options = {
  entryPoints: string[]
  outDir: string
  watchGlob: gulp.Globs
}

export type BuildAndWatchTasks = [
  buildTask: gulp.TaskFunction,
  watchTask: gulp.TaskFunction
]

const ROOT_DIR = p.resolve(__dirname, "..")

export function resolve(path: string): string {
  if (p.isAbsolute(path)) return path
  return p.resolve(ROOT_DIR, path)
}

export function resolveOptions(options: Options): Options {
  return {
    entryPoints: options.entryPoints.map(resolve),
    outDir: resolve(options.outDir),
    watchGlob:
      typeof options.watchGlob === "string"
        ? resolve(options.watchGlob)
        : options.watchGlob.map(resolve),
  }
}

export function namedTask<T>(name: string, task: T & { displayName?: string }) {
  task.displayName = name
  return task
}
