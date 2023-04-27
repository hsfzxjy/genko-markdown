import gulp from "gulp"
import { rimraf } from "rimraf"

import { dependencies } from "./package.json"
import { devServer } from "./tasks/dev-server"
import createNodeJs from "./tasks/node-js"
import { namedTask, resolve } from "./tasks/util"
import createWebCss from "./tasks/web-css"
import createWebJs from "./tasks/web-js"

export { devServer } from "./tasks/dev-server"

export const [buildJs, watchJs] = createWebJs({
  entryPoints: ["web/js/main.ts"],
  outDir: "dist/web/js",
  watchGlob: "web/js/**/*.ts",
})

export const [buildCss, watchCss] = createWebCss({
  entryPoints: ["web/css/main.scss"],
  outDir: "dist/web/css",
  watchGlob: "web/css/**/*.scss",
})

export const [buildNode, watchNode] = createNodeJs({
  entryPoints: ["lib/index.ts"],
  outDir: "dist/node",
  watchGlob: "lib/**/*.ts",
  extra: {
    external: Object.keys(dependencies),
  },
})

const watchHtml = namedTask("watch:html", () =>
  gulp.watch(
    "web/**/*.html",
    { ignoreInitial: false },
    namedTask("copy:html", () =>
      gulp.src("web/**/*.html").pipe(gulp.dest("dist/web/"))
    )
  )
)

export const build = gulp.parallel(buildJs, buildCss, buildNode)
export const watch = gulp.parallel(
  devServer,
  watchJs,
  watchCss,
  watchNode,
  watchHtml
)
export const clean = () => rimraf(resolve("dist"))
