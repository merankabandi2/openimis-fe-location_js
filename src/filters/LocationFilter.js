import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import _debounce from "lodash/debounce";
import { withTheme, withStyles } from "@material-ui/core/styles";
import _ from "lodash";
import { Grid } from "@material-ui/core";
import { withModulesManager, ControlledField, PublishedComponent } from "@openimis/fe-core";
import { selectLocation } from "../actions";

import { DEFAULT_LOCATION_TYPES } from "../constants";

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

class LocationFilter extends Component {
  state = {
    reset: 0,
  };

  constructor(props) {
    super(props);
    this.locationTypes = props.modulesManager.getConf("fe-location", "Location.types", DEFAULT_LOCATION_TYPES);
  }

  _filterValue = (k) => {
    const { filters } = this.props;
    return !!filters && !!filters[k] ? filters[k].value : null;
  };

  _parentFilter = (v, l) => {
    if (!!v) {
      return {
        id: this.props.anchor,
        value: v,
        filter: `${this.props.anchor}: "${v.uuid}", ${this.props.anchor}Level: ${l}`,
      };
    } else {
      return { id: this.props.anchor, value: null, filter: null };
    }
  };

  _levelFilter = (l, v) => {
    if (!!v) {
      return {
        id: `${this.props.anchor}_${l}`,
        value: v,
        filter: null,
      };
    } else {
      return { id: `${this.props.anchor}_${l}`, value: null, filter: null };
    }
  };

  onChange = (l, v, s) => {
    let parentFilterValue = this._filterValue(`${this.props.anchor}_${l - 1}`);
    let filters = [!!v ? this._parentFilter(v, l) : this._parentFilter(parentFilterValue, l - 1)];
    let value = !!v ? v.parent : null;
    for (var i = l - 1; i >= 0; i--) {
      filters.push(this._levelFilter(i, !!value ? value : this._filterValue(`${this.props.anchor}_${i}`)));
      value = !!value ? value.parent : null;
    }
    filters.push(this._levelFilter(l, v));
    for (var i = this.locationTypes.length; i > l; i--) {
      filters.push(this._levelFilter(i, null));
    }
    this.props.onChangeFilters(filters);
    this.setState((state) => ({
      reset: state.reset + 1,
    }));
    this.props.selectLocation(v, l, this.locationTypes.length);
  };

  render() {
    const { classes, split = false } = this.props;
    let grid = split ? 12 : 6;
    return (
      <Grid container className={classes.form}>
        {_.times(this.locationTypes.length, (i) => ( 
          <ControlledField
            module="location"
            id={`LocationFilter.location_${this.locationTypes.length - 3 + i}`}
            key={`location_${this.locationTypes.length - 3 + i}`}
            field={
              <Grid item xs={Math.floor(grid / (this.locationTypes.length - 1))} className={classes.item}>
                <PublishedComponent
                  pubRef="location.LocationPicker"
                  value={this._filterValue(`${this.props.anchor}_${this.locationTypes.length - 3 + i}`)}
                  withNull={true}
                  reset={this.state.reset}
                  onChange={(v, s) => this.onChange(this.locationTypes.length - 3 + i, v, s)}
                  parentLocation={this._filterValue(`${this.props.anchor}_${this.locationTypes.length - 4 + i}`)}
                  locationLevel={this.locationTypes.length - 3 + i}
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
  connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(LocationFilter))),
);
