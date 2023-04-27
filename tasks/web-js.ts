import gulp from "gulp"
import { createGulpEsbuild } from "gulp-esbuild"

import { BuildAndWatchTasks, namedTask, Options, resolveOptions } from "./util"

function esbuildTask(options: Options, watchMode: boolean): gulp.TaskFunction {
  return () =>
    gulp
      .src(options.entryPoints)
      .pipe(
        createGulpEsbuild({ incremental: watchMode })({
          bundle: true,
          sourcemap: true,
          minify: true,
          minifyIdentifiers: true,
        })
      )
      .pipe(gulp.dest(options.outDir))
}

export default function (options: Options): BuildAndWatchTasks {
  options = resolveOptions(options)
  return [
    namedTask("build:js", esbuildTask(options, false)),
    namedTask("watch:js", () =>
      gulp.watch(
        options.watchGlob,
        { ignoreInitial: false },
        namedTask("watch:js:once", esbuildTask(options, true))
      )
    ),
  ]
}
