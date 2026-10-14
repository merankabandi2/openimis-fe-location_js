// Loader for the node test runner (`npm test`). The ES sources under src/ are
// compiled on the fly with the babel presets the build already depends on.
//
// Build externals that are not installed here (react, @material-ui/*,
// @openimis/fe-core, ...) resolve to an inert stub: every property is a
// function returning the stub, which covers module-load-time calls such as
// withStyles()(), connect()() or JSX. `mock(request, exports)` replaces an
// external with the given exports for the modules required after the call.
const path = require("node:path");
const Module = require("node:module");
const babel = require("@babel/core");

const SRC_DIR = path.join(__dirname, "..", "src") + path.sep;
const STUB_PATH = path.join(__dirname, "stubs", "external.cjs");
const MOCK_PREFIX = "mock:";
const resolveFilename = Module._resolveFilename;
const loadJs = require.extensions[".js"];

const EXTERNALS = [
  /^@babel\//,
  /^@date-io\//,
  /^@emotion\//,
  /^@material-ui\//,
  /^@mui\//,
  /^@openimis\//,
  /^classnames$/,
  /^clsx$/,
  /^history$/,
  /^lodash/,
  /^moment/,
  /^prop-types$/,
  /^rc-/,
  /^react/,
  /^redux/,
];

const mock = (request, exports) => {
  const id = MOCK_PREFIX + request;
  const mocked = new Module(id);
  mocked.filename = id;
  mocked.loaded = true;
  mocked.exports = exports;
  Module._cache[id] = mocked;
};

Module._resolveFilename = function resolve(request, ...rest) {
  if (Module._cache[MOCK_PREFIX + request]) return MOCK_PREFIX + request;
  if (EXTERNALS.some((pattern) => pattern.test(request))) {
    try {
      return resolveFilename.call(this, request, ...rest);
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
      return STUB_PATH;
    }
  }
  return resolveFilename.call(this, request, ...rest);
};

const compile = (fallback) => (module, filename) => {
  if (!filename.startsWith(SRC_DIR)) return fallback(module, filename);
  const { code } = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    presets: [
      ["@babel/preset-env", { targets: { node: "current" } }],
      ["@babel/preset-react", { runtime: "classic" }],
    ],
    plugins: ["@babel/plugin-proposal-class-properties"],
  });
  return module._compile(code, filename);
};

require.extensions[".js"] = compile(loadJs);
require.extensions[".jsx"] = compile(loadJs);

const src = (relative) => require(path.join(SRC_DIR, relative));

module.exports = { src, mock };
