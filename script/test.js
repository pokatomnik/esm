"use strict"

const execa = require("execa")
const fs = require("fs-extra")
const ignorePaths = require("./ignore-paths.js")
const path = require("path")
const trash = require("./trash.js")
const uglify = require("uglify-es").minify

const argv = require("yargs")
  .boolean("prod")
  .argv

const isWin = process.platform === "win32"

const rootPath = path.resolve(__dirname, "..")
const testPath = path.resolve(rootPath, "test")
const buildPath = path.resolve(rootPath, "build")
const envPath = path.resolve(testPath, "env")
const esmPath = path.resolve(rootPath, "esm.js")
const indexPath = path.resolve(rootPath, "index.js")
const loaderDirPath = path.resolve(rootPath, "esm")
const mochaPath = path.resolve(rootPath, "node_modules/mocha/bin/_mocha")
const nodePath = path.resolve(envPath, "prefix", isWin ? "node.exe" : "bin/node")
const nodeModulesPath = path.resolve(rootPath, "node_modules")
const vendorPath = path.resolve(rootPath, "src/vendor")

const uglifyOptions = JSON.parse(fs.readFileSync(path.resolve(rootPath, ".uglifyrc")))

const jsPaths = [
  esmPath,
  indexPath
]

const trashPaths = ignorePaths
  .filter((thePath) =>
    thePath !== loaderDirPath &&
    thePath !== nodeModulesPath &&
    ! thePath.startsWith(buildPath) &&
    ! thePath.startsWith(vendorPath)
  )

const HOME = path.resolve(envPath, "home")

const NODE_ENV =
  (argv.prod ? "production" : "development") +
  "-test"

const NODE_PATH = [
  path.resolve(envPath, "node_path"),
  path.resolve(envPath, "node_path/relative")
].join(path.delimiter)

const nodeArgs = []

if (process.env.HARMONY) {
  nodeArgs.push("--harmony")
}

nodeArgs.push(
  mochaPath,
  "--full-trace",
  "--require", "../index.js",
  "tests.mjs"
)

function cleanJS() {
  return jsPaths
    .reduce((promise, filePath) =>
      promise
        .then(() => fs.readFile(filePath, "utf8"))
        .then((content) => {
          process.once("exit", () => fs.outputFileSync(filePath, content))
          return fs.outputFile(filePath, minifyJS(content))
        })
    , Promise.resolve())
}

function cleanRepo() {
  return Promise.all(trashPaths.map(trash))
}

function minifyJS(content) {
  return uglify(content, uglifyOptions).code
}

function runTests(cached) {
  return execa(nodePath, nodeArgs, {
    cwd: testPath,
    env: {
      ESM_OPTIONS: "{cjs:false,mode:'strict'}",
      HOME,
      NODE_ENV: NODE_ENV + (cached ? "-cached" : ""),
      NODE_OPTIONS: "--trace-warnings",
      NODE_PATH,
      NODE_PENDING_DEPRECATION: 1,
      USERPROFILE: HOME
    },
    stdio: "inherit"
  })
  .catch((e) => {
    console.error(e)
    process.exit(e.code)
  })
}

function setupNode() {
  const basePath = path.resolve(nodePath, isWin ? "" : "..")
  return trash(basePath)
    .then(() => fs.ensureLink(process.execPath, nodePath))
}

Promise
  .all([
    argv.prod && cleanJS(),
    cleanRepo(),
    setupNode()
  ])
  .then(() => runTests())
  .then(() => runTests(true))
