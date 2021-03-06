/* eslint strict: off, node/no-unsupported-features: ["error", { version: 6 }] */
"use strict"

const JSON6 = require("json-6")

const fs = require("fs-extra")
const path = require("path")
const webpack = require("webpack")

const readJSON = (filename) => JSON6.parse(fs.readFileSync(filename))

const {
  BannerPlugin,
  EnvironmentPlugin,
  NormalModuleReplacementPlugin
} = webpack

const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
const { ModuleConcatenationPlugin } = webpack.optimize
const OptimizeJsPlugin = require("optimize-js-plugin")
const ShakePlugin = require("webpack-common-shake").Plugin
const UglifyJSPlugin = require("uglifyjs-webpack-plugin")

const ESM_VERSION = readJSON("./package.json").version
const { NODE_ENV } = process.env

const isProd = /production/.test(NODE_ENV)
const isTest = /test/.test(NODE_ENV)

const externals = [
  "Array", "Buffer", "Error", "EvalError", "Function", "JSON", "Object",
  "Promise", "RangeError", "ReferenceError", "SyntaxError", "TypeError",
  "URIError", "eval"
]

const hosted = [
  "console", "process", "setImmediate"
]

const uglifyOptions = readJSON("./.uglifyrc")

/* eslint-disable sort-keys */
const config = {
  target: "node",
  entry: {
    esm: "./src/index.js"
  },
  output: {
    filename: "[name].js",
    libraryExport: "default",
    libraryTarget: "commonjs2",
    path: path.resolve("build")
  },
  module: {
    rules: [
      {
        loader: "babel-loader",
        test: /\.js$/
      }
    ]
  },
  plugins: [
    new BannerPlugin({
      banner: [
        '"use strict";\n',
        "var __shared__;",
        "const __non_webpack_module__ = module;",
        "const __external__ = { " +
          externals
            .map((name) => name + ": global." + name)
            .join(", ") +
        " };",
        "const " +
          hosted
            .map((name) => name + " = global." + name)
            .join(", ") +
        ";\n"
      ].join("\n"),
      entryOnly: true,
      raw: true
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      defaultSizes: "gzip",
      logLevel: "silent",
      openAnalyzer: false,
      reportFilename: "report.html"
    }),
    new NormalModuleReplacementPlugin(
      /acorn\/src\/regexp\.js/,
      path.resolve("src/acorn/replacement/regexp.js")
    ),
    new EnvironmentPlugin({ ESM_VERSION })
  ]
}
/* eslint-enable sort-keys */

if (isProd) {
  config.plugins.push(
    new OptimizeJsPlugin,
    new ShakePlugin,
    new ModuleConcatenationPlugin,
    new EnvironmentPlugin({ NODE_DEBUG: false }),
    new UglifyJSPlugin({ uglifyOptions })
  )
}

if (isTest) {
  config.entry.compiler = "./src/compiler.js"
  config.entry.entry = "./src/entry.js"
  config.entry.runtime = "./src/runtime.js"
  config.entry["get-file-path-from-url"] = "./src/util/get-file-path-from-url.js"
}

module.exports = config
