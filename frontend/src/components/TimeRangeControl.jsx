import React from 'react';
import { connect } from 'react-redux';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import { TIME_RANGES, TIME_RANGE_ALL_DAY } from '../UIConstants';
import { queryFromParams } from '../routesMap';

function TimeRangeControl(props) {
  const { graphParams, currentLocation } = props;

  function applyGraphParams(payload) {
    props.dispatch({
      type: currentLocation.type,
      payload: currentLocation.payload,
      query: queryFromParams(Object.assign({}, graphParams, payload)),
    });
  }

  // convert the state's current time range to a string or the sentinel value
  const timeRange =
    graphParams.startTime && graphParams.endTime
      ? `${graphParams.startTime}-${graphParams.endTime}`
      : TIME_RANGE_ALL_DAY;

  /**
   * Handler that takes the time range as a string and sets
   * the start and end time state.
   *
   * @param {any} myTimeRange
   */
  const setTimeRange = myTimeRange => {
    if (myTimeRange.target.value === TIME_RANGE_ALL_DAY) {
      applyGraphParams({ startTime: null, endTime: null });
    } else {
      const timeRangeParts = myTimeRange.target.value.split('-');
      applyGraphParams({
        startTime: timeRangeParts[0],
        endTime: timeRangeParts[1],
      });
    }
  };

  return (
    <FormControl className="inline-form-control">
      <InputLabel id="timeRangeLabel">Time of Day</InputLabel>
      <Select
        value={timeRange}
        labelId="timeRangeLabel"
        onChange={setTimeRange}
        id="time_range"
      >
        {TIME_RANGES.map(range => (
          <MenuItem value={range.value} key={range.value}>
            {range.shortLabel}
            {range.restOfLabel}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const mapStateToProps = state => ({
  graphParams: state.graphParams,
  currentLocation: state.location,
});

const mapDispatchToProps = dispatch => {
  return {
    dispatch,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TimeRangeControl);
