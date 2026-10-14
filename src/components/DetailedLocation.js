import React, { Component } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { injectIntl } from "react-intl";
import _debounce from "lodash/debounce";
import { withTheme, withStyles } from "@material-ui/core/styles";
import _ from "lodash";
import { Grid } from "@material-ui/core";
import { withModulesManager, ControlledField, PublishedComponent, formatMessage } from "@openimis/fe-core";
import { selectLocation } from "../actions";
import { DEFAULT_LOCATION_TYPES } from "../constants";
import { getLocationMaxLevels, locationLevelSlots, locationsByLevel } from "../utils";
import CoarseLocation from "./CoarseLocation";

const styles = (theme) => ({
  dialogTitle: theme.dialog.title,
  dialogContent: theme.dialog.content,
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
  paperDivider: theme.paper.divider,
});

class DetailedLocation extends Component {
  state = {};

  constructor(props) {
    super(props);
    this.locationTypes = props.modulesManager.getConf("fe-location", "Location.types", DEFAULT_LOCATION_TYPES);
    // One location picker per level, or null for the region/district layout of 4 levels.
    this.levelSlots = locationLevelSlots(getLocationMaxLevels(props.modulesManager), this.locationTypes);
  }

  computeState = () => {
    const { value } = this.props;
    if (this.levelSlots) {
      this.setState({ levels: locationsByLevel(value, this.locationTypes, this.levelSlots.length) });
      return;
    }
    let region = !!value ? value.parent : null;
    let district = value;
    while (!!region && !!region.parent) {
      district = region;
      region = region.parent;
    }
    let state = {
      "location_-2": region,
      "location_-1": district,
    };
    let v = !!value ? { ...value } : null;
    _.times(this.locationTypes.length - 2, (i) => {
      state[`location_${this.locationTypes.length - 3 - i}`] = v;
      v = !!v ? v.parent : null;
    });
    this.setState({ ...state });
  };

  componentDidMount() {
    this.computeState();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!_.isEqual(prevProps.value, this.props.value)) {
      this.computeState();
    }
  }

  onDistrictChange = (d) => {
    let state = { ...this.state };
    if (!state[`location_-2`] && !!d) {
      state[`location_-2`] = d.parent;
    }
    state[`location_-1`] = d;
    for (let i = 0; i < this.locationTypes.length - 2; i++) {
      state[`location_${i}`] = null;
    }
    this.setState({ ...state }, (e) => {
      this.props.selectLocation(d, 1, this.locationTypes.length);
    });
  };

  onLocationChange = (l, v) => {
    let state = { ...this.state };
    let current = v;
    for (let i = l; i >= -2 && !!current; i--) {
      state[`location_${i}`] = current;
      current = current.parent;
    }
    state[`location_${l}`] = v;
    for (let i = l + 1; i < this.locationTypes.length - 2; i++) {
      state[`location_${i}`] = null;
    }
    this.setState({ ...state }, (e) => {
      if (l === this.locationTypes.length - 3) {
        this.props.onChange(v);
      }
      this.props.selectLocation(v, l, this.locationTypes.length);
    });
  };

  onLevelChange = (level, v) => {
    const count = this.levelSlots.length;
    const parents = locationsByLevel(v, this.locationTypes, count);
    const current = this.state.levels || [];
    const levels = Array.from({ length: count }, (_, l) => (l < level ? parents[l] || current[l] || null : null));
    levels[level] = v;
    this.setState({ levels }, () => {
      if (level === count - 1) {
        this.props.onChange(v);
      }
      this.props.selectLocation(v, level, count);
    });
  };

  renderLevels() {
    const { classes, intl, split = false, readOnly, required = false, filterLabels = true, title = "" } = this.props;
    const levels = this.state.levels || [];
    const grid = split ? 12 : Math.max(1, Math.floor(12 / this.levelSlots.length));
    return (
      <Grid container className={classes.form}>
        {this.levelSlots.map(({ level, labelKey }) => (
          <ControlledField
            module="location"
            id={`DetailedLocation.location_${level}`}
            key={`location_${level}`}
            field={
              <Grid item xs={grid} className={classes.item}>
                <PublishedComponent
                  pubRef="location.LocationPicker"
                  value={levels[level] || null}
                  parentLocation={level > 0 ? levels[level - 1] || null : null}
                  readOnly={readOnly}
                  required={required}
                  withNull={true}
                  filterLabels={filterLabels}
                  label={formatMessage(intl, "location", labelKey)}
                  locationLevel={level}
                  onChange={(v) => this.onLevelChange(level, v)}
                  title={title}
                />
              </Grid>
            }
          />
        ))}
      </Grid>
    );
  }

  render() {
    if (this.levelSlots) return this.renderLevels();
    const {
      classes,
      split = false,
      readOnly,
      required = false,
      filterLabels = true,
      title = '',
    } = this.props;
    let grid = split ? 12 : 6;
    return (
      <Grid container className={classes.form}>
        <Grid item xs={grid}>
          <CoarseLocation
            region={this.state[`location_-2`]}
            district={this.state[`location_-1`]}
            readOnly={readOnly}
            required={required}
            onChange={this.onDistrictChange}
            filterLabels={filterLabels}
            title={title}
          />
        </Grid>
        {_.times(this.locationTypes.length - 2, (i) => (
          <ControlledField
            module="location"
            id={`DetailedLocation.location_${this.locationTypes.length - 2 + i}`}
            key={`location_${this.locationTypes.length - 2 + i}`}
            field={
              <Grid item xs={Math.floor(grid / (this.locationTypes.length - 2))} className={classes.item}>
                <PublishedComponent
                  pubRef="location.LocationPicker"
                  value={this.state[`location_${i}`]}
                  parentLocation={this.state[`location_${i - 1}`]}
                  readOnly={readOnly}
                  required={required}
                  withNull={true}
                  filterLabels={filterLabels}
                  locationLevel={this.locationTypes.length - 2 + i}
                  onChange={(v) => this.onLocationChange(i, v)}
                  title={title}
                />
              </Grid>
            }
          />
        ))}
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectLocation }, dispatch);
};

export default withModulesManager(
  injectIntl(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(DetailedLocation)))),
);
