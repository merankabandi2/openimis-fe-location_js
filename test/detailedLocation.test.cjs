const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isDeepStrictEqual } = require("node:util");

const { src, mock } = require("./harness.cjs");

// Minimal React: elements are plain objects and setState applies synchronously,
// so a class component can be mounted and its render() output inspected.
class Component {
  constructor(props) {
    this.props = props;
  }

  setState(update, callback) {
    const next = typeof update === "function" ? update(this.state, this.props) : update;
    this.state = { ...this.state, ...next };
    if (callback) callback();
  }
}
const createElement = (type, props, ...children) => ({ type, props: { ...props, children } });
const React = { Component, createElement };
const identity = (component) => component;

mock("react", { __esModule: true, default: React, ...React });
mock("react-redux", { connect: () => identity });
mock("redux", { bindActionCreators: (actions) => actions });
mock("react-intl", { injectIntl: identity });
mock("@material-ui/core", { Grid: "Grid" });
mock("@material-ui/core/styles", { withTheme: identity, withStyles: () => identity });
mock("lodash", {
  __esModule: true,
  default: {
    isEqual: isDeepStrictEqual,
    times: (n, fn) => Array.from({ length: Math.max(0, n) }, (_, i) => fn(i)),
  },
});
mock("lodash/debounce", { __esModule: true, default: identity });
mock("@openimis/fe-core", {
  withModulesManager: identity,
  ControlledField: "ControlledField",
  PublishedComponent: "PublishedComponent",
  formatMessage: (intl, module, key) => intl.messages[`${module}.${key}`] ?? `${module}.${key}`,
});

const DetailedLocation = src("components/DetailedLocation.js").default;
const CoarseLocation = src("components/CoarseLocation.js").default;

const MAX_LEVELS = "location.Location.MaxLevels";

// Labels of the Burundi deployment: types D/W/V are Province/Commune/Colline.
const intl = {
  messages: {
    "location.locationType.0": "Province",
    "location.locationType.1": "Commune",
    "location.locationType.2": "Colline",
  },
};

const burundi = { id: "3500", uuid: "u-bur", code: "BUR", name: "Burundi", type: "R" };
const kayanza = { id: "108", uuid: "u-08", code: "08", name: "Kayanza", type: "D" };
const butaganzwa = { id: "168", uuid: "u-0801", code: "0801", name: "Butaganzwa K", type: "W" };
const bumba = { id: "1238", uuid: "u-080101", code: "080101", name: "Bumba", type: "V" };

const chain = (...locations) =>
  locations.reduceRight((parent, location) => ({ ...location, parent }), null);

const modulesManager = ({ maxLevels, types }) => ({
  getConf: (module, key, defaultValue = null) => {
    if (module !== "fe-location") return defaultValue;
    if (key === MAX_LEVELS && maxLevels !== undefined) return maxLevels;
    if (key === "Location.types" && types !== undefined) return types;
    return defaultValue;
  },
  getRef: (key) => (key === MAX_LEVELS ? "4" : undefined),
});

const mount = ({ maxLevels, types, value, onChange = () => {}, selectLocation = () => {} }) => {
  const props = {
    modulesManager: modulesManager({ maxLevels, types }),
    classes: {},
    intl,
    value,
    onChange,
    selectLocation,
  };
  const component = new DetailedLocation(props);
  component.state = component.state || {};
  component.componentDidMount();
  return component;
};

// Region/district block and location pickers of a render, in display order.
const fields = (element) => {
  if (Array.isArray(element)) return element.flatMap(fields);
  if (!element || typeof element !== "object" || !element.props) return [];
  if (element.type === CoarseLocation) return [{ coarse: true, ...element.props }];
  if (element.type === "PublishedComponent") return [element.props];
  return [...fields(element.props.field), ...fields(element.props.children)];
};

const name = (location) => (location ? location.name : null);

test("with 3 levels the panel shows one picker per level, labelled by level", () => {
  const rendered = fields(mount({ maxLevels: 3, types: ["D", "W", "V"], value: chain(bumba, butaganzwa, kayanza) }).render());

  assert.deepEqual(
    rendered.map((f) => [f.pubRef, f.locationLevel, f.label, name(f.value), name(f.parentLocation)]),
    [
      ["location.LocationPicker", 0, "Province", "Kayanza", null],
      ["location.LocationPicker", 1, "Commune", "Butaganzwa K", "Kayanza"],
      ["location.LocationPicker", 2, "Colline", "Bumba", "Butaganzwa K"],
    ],
  );
});

test("with 3 levels a parent of an unconfigured type is left out", () => {
  const rendered = fields(
    mount({ maxLevels: 3, types: ["D", "W", "V"], value: chain(bumba, butaganzwa, kayanza, burundi) }).render(),
  );

  assert.deepEqual(rendered.map((f) => name(f.value)), ["Kayanza", "Butaganzwa K", "Bumba"]);
});

test("with 3 levels a location of an upper level leaves the lower pickers empty", () => {
  const rendered = fields(mount({ maxLevels: 3, types: ["D", "W", "V"], value: chain(butaganzwa, kayanza) }).render());

  assert.deepEqual(rendered.map((f) => name(f.value)), ["Kayanza", "Butaganzwa K", null]);
});

test("with 3 levels choosing the last level sets the value, an upper level clears the levels below", () => {
  const changes = [];
  const selections = [];
  const component = mount({
    maxLevels: 3,
    types: ["D", "W", "V"],
    value: chain(bumba, butaganzwa, kayanza),
    onChange: (v) => changes.push(name(v)),
    selectLocation: (v, level, count) => selections.push([name(v), level, count]),
  });
  const picker = (level) => fields(component.render()).find((f) => f.locationLevel === level);

  const gatwe = chain({ id: "9", uuid: "u-080102", code: "080102", name: "Gatwe", type: "V" }, butaganzwa, kayanza);
  picker(2).onChange(gatwe);
  assert.deepEqual(changes, ["Gatwe"]);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Kayanza", "Butaganzwa K", "Gatwe"]);

  const ngozi = { id: "200", uuid: "u-09", code: "09", name: "Ngozi", type: "D" };
  picker(0).onChange(ngozi);
  assert.deepEqual(changes, ["Gatwe", null]);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Ngozi", null, null]);
  assert.deepEqual(selections, [
    ["Gatwe", 2, 3],
    ["Ngozi", 0, 3],
  ]);
});

test("without MaxLevels the panel keeps the region and district pickers and their labels", () => {
  const rendered = fields(mount({ value: chain(bumba, butaganzwa, kayanza, burundi) }).render());

  assert.equal(rendered.length, 3);
  assert.equal(rendered[0].coarse, true);
  assert.deepEqual([name(rendered[0].region), name(rendered[0].district)], ["Burundi", "Kayanza"]);
  assert.deepEqual(
    rendered.slice(1).map((f) => [f.pubRef, f.locationLevel, f.label, name(f.value)]),
    [
      ["location.LocationPicker", 2, undefined, "Butaganzwa K"],
      ["location.LocationPicker", 3, undefined, "Bumba"],
    ],
  );
});

test("without MaxLevels a 3-type configuration renders as before", () => {
  const rendered = fields(mount({ types: ["D", "W", "V"], value: chain(bumba, butaganzwa, kayanza, burundi) }).render());

  assert.equal(rendered[0].coarse, true);
  assert.deepEqual([name(rendered[0].region), name(rendered[0].district)], ["Burundi", "Kayanza"]);
  assert.deepEqual(
    rendered.slice(1).map((f) => [f.locationLevel, f.label, name(f.value)]),
    [[1, undefined, "Bumba"]],
  );
});

// Mounts the panel inside a form that stores each onChange value and passes
// it back as the next value, as a FormPanel does.
const mountInForm = (options) => {
  const changes = [];
  const component = mount({
    ...options,
    onChange: (v) => {
      changes.push(name(v));
      const prevProps = component.props;
      component.props = { ...prevProps, value: v };
      component.componentDidUpdate(prevProps);
    },
  });
  return { component, changes };
};

const ngozi = { id: "200", uuid: "u-09", code: "09", name: "Ngozi", type: "D" };
const kiremba = { id: "201", uuid: "u-0901", code: "0901", name: "Kiremba", type: "W" };
const gisha = { id: "202", uuid: "u-090101", code: "090101", name: "Gisha", type: "V" };

test("with 3 levels changing the province or the commune clears the colline of the form", () => {
  const { component, changes } = mountInForm({
    maxLevels: 3, types: ["D", "W", "V"], value: chain(bumba, butaganzwa, kayanza),
  });
  const picker = (level) => fields(component.render()).find((f) => f.locationLevel === level);

  picker(0).onChange(ngozi);
  assert.deepEqual(changes, [null]);
  assert.equal(component.props.value, null);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Ngozi", null, null]);

  picker(1).onChange(chain(kiremba, ngozi));
  assert.deepEqual(changes, [null]);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Ngozi", "Kiremba", null]);

  picker(2).onChange(chain(gisha, kiremba, ngozi));
  assert.deepEqual(changes, [null, "Gisha"]);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Ngozi", "Kiremba", "Gisha"]);

  picker(1).onChange(chain(butaganzwa, kayanza));
  assert.deepEqual(changes, [null, "Gisha", null]);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Kayanza", "Butaganzwa K", null]);
});

test("with 3 levels a value the form sets itself is shown", () => {
  const { component } = mountInForm({ maxLevels: 3, types: ["D", "W", "V"], value: chain(bumba, butaganzwa, kayanza) });
  fields(component.render()).find((f) => f.locationLevel === 0).onChange(ngozi);

  const prevProps = component.props;
  component.props = { ...prevProps, value: chain(bumba, butaganzwa, kayanza) };
  component.componentDidUpdate(prevProps);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), ["Kayanza", "Butaganzwa K", "Bumba"]);

  const before = component.props;
  component.props = { ...before, value: null };
  component.componentDidUpdate(before);
  assert.deepEqual(fields(component.render()).map((f) => name(f.value)), [null, null, null]);
});

test("without MaxLevels changing an upper level clears the location of the form", () => {
  const { component, changes } = mountInForm({ value: chain(bumba, butaganzwa, kayanza, burundi) });
  const commune = () => fields(component.render())[1];

  commune().onChange(chain({ id: "169", uuid: "u-0802", code: "0802", name: "Gahombo", type: "W" }, kayanza, burundi));
  assert.deepEqual(changes, [null]);
  assert.deepEqual(fields(component.render()).slice(1).map((f) => name(f.value)), ["Gahombo", null]);

  fields(component.render())[2].onChange(chain(bumba, butaganzwa, kayanza, burundi));
  assert.deepEqual(changes, [null, "Bumba"]);

  fields(component.render())[0].onChange(chain(kayanza, burundi));
  assert.deepEqual(changes, [null, "Bumba", null]);
  assert.deepEqual(fields(component.render()).slice(1).map((f) => name(f.value)), [null, null]);
});
