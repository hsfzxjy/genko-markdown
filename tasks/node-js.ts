import gulp from "gulp"
import { createGulpEsbuild } from "gulp-esbuild"

import { BuildAndWatchTasks, namedTask, Options, resolveOptions } from "./util"

function esbuildTask(options: Options, watchMode: boolean): gulp.TaskFunction {
  return () =>
    gulp
      .src(options.entryPoints)
      .pipe(
        createGulpEsbuild({ incremental: watchMode })({
          sourcemap: true,
          bundle: true,
          platform: "node",
        })
      )
      .pipe(gulp.dest(options.outDir))
}

export default function (options: Options): BuildAndWatchTasks {
  options = resolveOptions(options)
  return [
    namedTask("build:node", esbuildTask(options, false)),
    namedTask("watch:node", () =>
      gulp.watch(
        options.watchGlob,
        { ignoreInitial: false },
        namedTask("watch:node:once", esbuildTask(options, true))
      )
    ),
  ]
}
