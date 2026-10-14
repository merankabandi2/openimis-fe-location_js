export function healthFacilityLabel(hf) {
  return !!hf ? `${hf.code} ${hf.name}` : "";
}

export function locationLabel(l) {
  return !!l ? `${l.code} ${l.name}` : "";
}

export const LOCATION_SUMMARY_PROJECTION = ["id", "uuid", "code", "name", "type"];

export const nestParentsProjections = (i) => {
  return `parent{${LOCATION_SUMMARY_PROJECTION}${i === 0 ? "" : "," + nestParentsProjections(i - 1)}}`;
};

export const LOCATION_MAX_LEVELS_KEY = "location.Location.MaxLevels";
export const DEFAULT_LOCATION_MAX_LEVELS = 4;

// Accepts a positive integer, as a number or a numeric string; anything else is null.
export const parseLocationMaxLevels = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const levels = Number(value);
  return Number.isInteger(levels) && levels > 0 ? levels : null;
};

// Number of location levels: the fe-location module configuration key, then the ref, then 4.
export const getLocationMaxLevels = (modulesManager) =>
  parseLocationMaxLevels(modulesManager.getConf("fe-location", LOCATION_MAX_LEVELS_KEY)) ??
  parseLocationMaxLevels(modulesManager.getRef(LOCATION_MAX_LEVELS_KEY)) ??
  DEFAULT_LOCATION_MAX_LEVELS;

export const locationFlatProjection = (levels) =>
  levels > 1
    ? [...LOCATION_SUMMARY_PROJECTION, nestParentsProjections(levels - 2)]
    : [...LOCATION_SUMMARY_PROJECTION];

// Pickers of location.DetailedLocation when the level count is not 4: one location picker per
// configured level, labelled location.locationType.<level>. With 4 levels the component shows
// its region and district pickers followed by location pickers, and this returns null.
export const locationLevelSlots = (maxLevels, locationTypes) => {
  if (maxLevels === DEFAULT_LOCATION_MAX_LEVELS) return null;
  return Array.from({ length: Math.min(maxLevels, locationTypes.length) }, (_, level) => ({
    level,
    type: locationTypes[level],
    labelKey: `locationType.${level}`,
  }));
};

// A location and its parents, each at its level: the index of its type in locationTypes.
// Parents of other types are left out. When no location of the chain has a configured type,
// the location takes the last level and its parents the levels above.
export const locationsByLevel = (location, locationTypes, count) => {
  const levels = Array(count).fill(null);
  const lineage = [];
  for (let current = location; current; current = current.parent) lineage.push(current);
  let placed = false;
  lineage.forEach((current) => {
    const level = locationTypes.indexOf(current.type);
    if (level >= 0 && level < count && !levels[level]) {
      levels[level] = current;
      placed = true;
    }
  });
  if (!placed) {
    lineage.slice(0, count).forEach((current, i) => {
      levels[count - 1 - i] = current;
    });
  }
  return levels;
};
