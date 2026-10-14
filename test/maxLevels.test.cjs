const { test } = require("node:test");
const assert = require("node:assert/strict");

const { src } = require("./harness.cjs");

const { LocationModule, getLocationMaxLevels } = src("index.js");

const MAX_LEVELS = "location.Location.MaxLevels";
const FLAT_PROJECTION = "location.Location.FlatProjection";

const FOUR_LEVEL_PROJECTION = [
  "id",
  "uuid",
  "code",
  "name",
  "type",
  "parent{id,uuid,code,name,type,parent{id,uuid,code,name,type,parent{id,uuid,code,name,type}}}",
];

const refsOf = (config) => config.refs.filter((r) => r.key === MAX_LEVELS || r.key === FLAT_PROJECTION);
const refValue = (config, key) => {
  const matches = config.refs.filter((r) => r.key === key);
  assert.equal(matches.length, 1, `exactly one ${key} ref`);
  return matches[0].ref;
};

const modulesManager = ({ conf = {}, refs = {} } = {}) => ({
  getConf: (module, key, defaultValue = null) => {
    const moduleCfg = conf[module] || {};
    return moduleCfg[key] !== undefined ? moduleCfg[key] : defaultValue;
  },
  getRef: (key) => refs[key],
});

test("without configuration the module keeps 4 levels and the 4-level projection", () => {
  const config = LocationModule({});
  assert.equal(refValue(config, MAX_LEVELS), "4");
  assert.deepEqual(refValue(config, FLAT_PROJECTION), FOUR_LEVEL_PROJECTION);
});

test("the module configuration key sets the ref and the projection depth", () => {
  const config = LocationModule({ [MAX_LEVELS]: 3 });
  assert.equal(refValue(config, MAX_LEVELS), "3");
  assert.deepEqual(refValue(config, FLAT_PROJECTION), [
    "id",
    "uuid",
    "code",
    "name",
    "type",
    "parent{id,uuid,code,name,type,parent{id,uuid,code,name,type}}",
  ]);
});

test("a string value from the configuration is accepted", () => {
  assert.equal(refValue(LocationModule({ [MAX_LEVELS]: "5" }), MAX_LEVELS), "5");
});

test("setting the key keeps every default ref", () => {
  const defaults = LocationModule({}).refs.map((r) => r.key).sort();
  const configured = LocationModule({ [MAX_LEVELS]: 3 }).refs.map((r) => r.key).sort();
  assert.deepEqual(configured, defaults);
});

test("building the module twice does not duplicate the computed refs", () => {
  LocationModule({});
  const config = LocationModule({ [MAX_LEVELS]: 2 });
  assert.equal(refsOf(config).length, 2);
  assert.deepEqual(refValue(config, FLAT_PROJECTION), [
    "id",
    "uuid",
    "code",
    "name",
    "type",
    "parent{id,uuid,code,name,type}",
  ]);
  assert.deepEqual(refValue(LocationModule({}), FLAT_PROJECTION), FOUR_LEVEL_PROJECTION);
});

test("one level fetches no parent", () => {
  assert.deepEqual(refValue(LocationModule({ [MAX_LEVELS]: 1 }), FLAT_PROJECTION), ["id", "uuid", "code", "name", "type"]);
});

test("invalid values fall back to 4 levels", () => {
  for (const value of [0, -2, 2.5, "abc", "", null, true, {}]) {
    const config = LocationModule({ [MAX_LEVELS]: value });
    assert.equal(refValue(config, MAX_LEVELS), "4", `value ${JSON.stringify(value)}`);
    assert.deepEqual(refValue(config, FLAT_PROJECTION), FOUR_LEVEL_PROJECTION);
  }
});

test("a refs list passed in the configuration still provides the level count", () => {
  const config = LocationModule({ refs: [{ key: MAX_LEVELS, ref: "3" }] });
  assert.equal(refValue(config, MAX_LEVELS), "3");
  assert.equal(refValue(config, FLAT_PROJECTION).length, 6);
});

test("getLocationMaxLevels reads the fe-location configuration first", () => {
  const mm = modulesManager({ conf: { "fe-location": { [MAX_LEVELS]: 3 } }, refs: { [MAX_LEVELS]: "5" } });
  assert.equal(getLocationMaxLevels(mm), 3);
});

test("getLocationMaxLevels falls back to the ref, then to 4", () => {
  assert.equal(getLocationMaxLevels(modulesManager({ refs: { [MAX_LEVELS]: "3" } })), 3);
  assert.equal(getLocationMaxLevels(modulesManager()), 4);
  assert.equal(getLocationMaxLevels(modulesManager({ conf: { "fe-location": { [MAX_LEVELS]: "x" } } })), 4);
});
