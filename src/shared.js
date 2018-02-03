
import FastObject from "./fast-object.js"
import SafeWeakMap from "./safe-weak-map.js"

import assign from "./util/assign.js"

const shared = assign(new FastObject, __shared__)

if (! __shared__) {
  shared.entry = new SafeWeakMap
  shared.env = new FastObject
  shared.findPath = new FastObject
  shared.global = global
  shared.inited = false
  shared.maxSatisfying = new FastObject
  shared.package = new FastObject
  shared.packageCache = new FastObject
  shared.parseURL = new FastObject
  shared.pendingMetas = new FastObject
  shared.pendingWrites = new FastObject
  shared.resolveFilename = new FastObject
}

export default shared
