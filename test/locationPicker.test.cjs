const { test } = require("node:test");
const assert = require("node:assert/strict");

const { src, mock } = require("./harness.cjs");

// Minimal hook runtime: the function component is called directly, effects run
// after each render when their dependencies change, and a state change renders
// again. Elements are plain objects, so the Autocomplete props can be read.
let hooks = null;
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useState: (initial) => hooks.useState(initial),
  useEffect: (effect, deps) => hooks.useEffect(effect, deps),
};
const identity = (component) => component;
const store = { loc: {} };
let dispatched = [];

mock("react", { __esModule: true, default: React, ...React });
mock("react-redux", {
  useSelector: (selector) => selector(store),
  useDispatch: () => (action) => dispatched.push(action),
});
mock("@material-ui/lab", { Autocomplete: "Autocomplete" });
mock("@material-ui/core", { TextField: "TextField" });
mock("@material-ui/core/styles", { withTheme: identity, withStyles: () => identity });
mock("@openimis/fe-core", {
  combine: () => identity,
  withModulesManager: identity,
  useTranslations: () => ({ formatMessage: (key) => key }),
  useDebounceCb: (callback) => callback,
  graphqlWithVariables: (query, variables, type) => ({ type, query }),
  graphql: (query, type) => ({ type, query }),
  formatPageQuery: (entity, filters) => `${entity}(${filters.join(", ")})`,
});

const LocationPicker = src("pickers/LocationPicker.js").default;

const modulesManager = {
  getConf: (module, key, defaultValue = null) => (key === "Location.types" ? ["D", "W", "V"] : defaultValue),
};

const kayanza = { id: "108", uuid: "u-08", code: "08", name: "Kayanza", type: "D" };
const butaganzwa = { id: "168", uuid: "u-0801", code: "0801", name: "Butaganzwa K", type: "W" };

const mount = (props) => {
  const slots = [];
  let cursor = 0;
  let dirty = false;
  let pending = [];
  let element = null;
  const runtime = {
    useState(initial) {
      const slot = slots[cursor] || (slots[cursor] = { value: initial });
      cursor += 1;
      const setState = (next) => {
        if (!Object.is(next, slot.value)) {
          slot.value = next;
          dirty = true;
        }
      };
      return [slot.value, setState];
    },
    useEffect(effect, deps) {
      const previous = slots[cursor];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) pending.push(effect);
      slots[cursor] = { deps };
      cursor += 1;
    },
  };
  const render = () => {
    do {
      dirty = false;
      hooks = runtime;
      cursor = 0;
      pending = [];
      element = LocationPicker({ modulesManager, onChange: () => {}, ...props });
      hooks = null;
      pending.forEach((effect) => effect());
    } while (dirty);
  };
  dispatched = [];
  render();
  assert.equal(element.type, "Autocomplete");
  // Calls an Autocomplete callback the way the component receives it, then renders.
  return (callback, ...args) => {
    element.props[callback](...args);
    render();
  };
};

// `str` argument of each locationsStr query sent so far.
const searches = () => dispatched.map((action) => /str: "([^"]*)"/.exec(action.query)[1]);

test("opening a picker that holds a location searches with an empty string, not its label", () => {
  const act = mount({ locationLevel: 0, value: kayanza });

  // The Autocomplete fills its input with the label of the value.
  act("onInputChange", null, "08 Kayanza", "reset");
  act("onOpen");

  assert.deepEqual(searches(), [""]);
});

test("a picker with parent locations searches with an empty string after its input is reset", () => {
  const act = mount({ locationLevel: 1, value: butaganzwa, parentLocations: ["u-08"] });

  act("onInputChange", null, "0801 Butaganzwa K", "reset");
  act("onOpen");

  assert.equal(dispatched.length, 1);
  assert.match(dispatched[0].query, /parent_Uuid_In: \["u-08"\]/);
  assert.deepEqual(searches(), [""]);
});

test("typed text is the search string", () => {
  const act = mount({ locationLevel: 1, parentLocation: kayanza });

  act("onOpen");
  act("onInputChange", { target: { value: "Buta" } }, "Buta", "input");

  assert.deepEqual(searches(), ["", "Buta"]);
  assert.match(dispatched[1].query, /parent_Uuid: "u-08"/);
});

test("clearing the input searches with an empty string on the next opening", () => {
  const act = mount({ locationLevel: 0, value: kayanza });

  act("onInputChange", null, "08 Kayanza", "reset");
  act("onInputChange", {}, "", "clear");
  act("onOpen");

  assert.deepEqual(searches(), [""]);
});
