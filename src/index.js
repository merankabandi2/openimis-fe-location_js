import LocationsPage from "./pages/LocationsPage";
import HealthFacilitiesPage from "./pages/HealthFacilitiesPage";
import HealthFacilityEditPage from "./pages/HealthFacilityEditPage";
import UserHealthFacilityLoader from "./components/UserHealthFacilityLoader";
import UserDistrictsLoader from "./components/UserDistrictsLoader";
import HealthFacilityFullPath from "./components/HealthFacilityFullPath";
import HealthFacilityPicker from "./pickers/HealthFacilityPicker";
import HealthFacilityReferPicker from "./pickers/HealthFacilityReferPicker";
import HealthFacilityLevelPicker from "./pickers/HealthFacilityLevelPicker";
import HealthFacilityStatusPicker from "./pickers/HealthFacilityStatusPicker";
import HealthFacilitySubLevelPicker from "./pickers/HealthFacilitySubLevelPicker";
import HealthFacilityLegalFormPicker from "./pickers/HealthFacilityLegalFormPicker";
import HealthFacilityPriceListsPanel from "./components/HealthFacilityPriceListsPanel";
import CoarseLocationFilter from "./filters/CoarseLocationFilter";
import DetailedLocationFilter from "./filters/DetailedLocationFilter";
import CoarseLocation from "./components/CoarseLocation";
import FSPCoarseLocation from "./components/FSPCoarseLocation";
import DetailedLocation from "./components/DetailedLocation";
import DetailedHealthFacility from "./components/DetailedHealthFacility";
import RegionPicker from "./pickers/RegionPicker";
import DistrictPicker from "./pickers/DistrictPicker";
import LocationPicker from "./pickers/LocationPicker";
import LocationCascader from "./pickers/LocationCascader";
import FSPLocationPicker from "./pickers/FSPLocationPicker";
import LocationTypePicker from "./pickers/LocationTypePicker";
import messages_en from "./translations/en.json";
import reducer from "./reducer";

import {
  DEFAULT_LOCATION_MAX_LEVELS,
  LOCATION_MAX_LEVELS_KEY,
  locationFlatProjection,
  parseLocationMaxLevels,
} from "./utils";
import { HEALTH_FACILITY_PICKER_PROJECTION, HEALTH_FACILITY_REFER_PICKER_PROJECTION } from "./actions";

export {
  DEFAULT_LOCATION_MAX_LEVELS,
  LOCATION_MAX_LEVELS_KEY,
  getLocationMaxLevels,
  parseLocationMaxLevels,
} from "./utils";

const ROUTE_LOCATIONS = "location/locations";
const ROUTE_HEALTH_FACILITIES = "location/healthFacilities";
const ROUTE_HEALTH_FACILITY_EDIT = "location/healthFacility";

const DEFAULT_CONFIG = {
  "translations": [{ key: "en", messages: messages_en }],
  "reducers": [{ key: "loc", reducer: reducer }], // location is the default used by syncHistoryWithStore...
  "refs": [
    { key: "location.route.healthFacilities", ref: ROUTE_HEALTH_FACILITIES },
    { key: "location.route.healthFacilityEdit", ref: ROUTE_HEALTH_FACILITY_EDIT },
    { key: "location.HealthFacilityFullPath", ref: HealthFacilityFullPath },
    { key: "location.HealthFacilityPicker", ref: HealthFacilityPicker },
    { key: "location.HealthFacilityPicker.projection", ref: HEALTH_FACILITY_PICKER_PROJECTION },
    { key: "location.HealthFacilityReferPicker", ref: HealthFacilityReferPicker },
    { key: "location.HealthFacilityReferPicker.projection", ref: HEALTH_FACILITY_REFER_PICKER_PROJECTION },
    { key: "location.HealthFacilityPicker.sort", ref: "healthFacility__code" },
    { key: "location.HealthFacilityLevelPicker", ref: HealthFacilityLevelPicker },
    { key: "location.HealthFacilityLevelPicker.projection", ref: null },
    { key: "location.HealthFacilitySubLevelPicker", ref: HealthFacilitySubLevelPicker },
    { key: "location.HealthFacilityStatusPicker", ref: HealthFacilityStatusPicker },
    { key: "location.HealthFacilitySubLevelPicker.projection", ref: null },
    { key: "location.HealthFacilityLegalFormPicker", ref: HealthFacilityLegalFormPicker },
    { key: "location.HealthFacilityLegalFormPicker.projection", ref: ["code", "legalForm"] },
    { key: "location.RegionPicker", ref: RegionPicker },
    { key: "location.DistrictPicker", ref: DistrictPicker },
    { key: "location.LocationPicker", ref: LocationPicker },
    { key: "location.LocationCascader", ref: LocationCascader },
    { key: "location.FSPLocationPicker", ref: FSPLocationPicker },
    { key: "location.HealthFacilityGQLType", ref: "HealthFacilityGQLType" },
    { key: "location.HealthFacilityPriceListsPanel", ref: HealthFacilityPriceListsPanel },
    { key: "location.LocationTypePicker", ref: LocationTypePicker },
    { key: "location.LocationGQLType", ref: "LocationGQLType" },
    { key: LOCATION_MAX_LEVELS_KEY, ref: String(DEFAULT_LOCATION_MAX_LEVELS) },
    { key: "location.LocationsPage", ref: LocationsPage },
    { key: "location.HealthFacilitiesPage", ref: HealthFacilitiesPage },
    { key: "location.CoarseLocationFilter", ref: CoarseLocationFilter },
    { key: "location.DetailedLocationFilter", ref: DetailedLocationFilter },
    { key: "location.CoarseLocation", ref: CoarseLocation },
    { key: "location.FSPCoarseLocation", ref: FSPCoarseLocation },
    { key: "location.DetailedLocation", ref: DetailedLocation },
    { key: "location.DetailedHealthFacility", ref: DetailedHealthFacility },
    
    { key: "location.route.healthFacility", ref: ROUTE_HEALTH_FACILITY_EDIT },
  ],
  "core.Router": [
    { path: ROUTE_LOCATIONS, component: LocationsPage },
    { path: ROUTE_HEALTH_FACILITIES, component: HealthFacilitiesPage },
    { path: ROUTE_HEALTH_FACILITY_EDIT, component: HealthFacilityEditPage },
    { path: ROUTE_HEALTH_FACILITY_EDIT + "/:healthFacility_uuid?", component: HealthFacilityEditPage },
  ],
  "core.Boot": [UserHealthFacilityLoader, UserDistrictsLoader],
  "invoice.SubjectAndThirdpartyPicker": [
    {
      type: "health facility",
      picker: HealthFacilityPicker,
      pickerProjection: HEALTH_FACILITY_PICKER_PROJECTION,
    },
  ],
};

const FLAT_PROJECTION_KEY = "location.Location.FlatProjection";

// The level count comes from the module configuration key `location.Location.MaxLevels`,
// else from that ref in `refs`, else 4. The ref is rewritten to the resolved value so that
// getRef and getConf agree, and the flat projection fetches that many levels.
export const LocationModule = (cfg) => {
  const config = { ...DEFAULT_CONFIG, ...cfg };
  const levelsRef = config.refs.find((r) => r.key === LOCATION_MAX_LEVELS_KEY);
  const levels =
    parseLocationMaxLevels(config[LOCATION_MAX_LEVELS_KEY]) ??
    parseLocationMaxLevels(levelsRef?.ref) ??
    DEFAULT_LOCATION_MAX_LEVELS;
  config.refs = [
    ...config.refs.filter((r) => r.key !== LOCATION_MAX_LEVELS_KEY && r.key !== FLAT_PROJECTION_KEY),
    { key: LOCATION_MAX_LEVELS_KEY, ref: String(levels) },
    { key: FLAT_PROJECTION_KEY, ref: locationFlatProjection(levels) },
  ];
  return config;
};
