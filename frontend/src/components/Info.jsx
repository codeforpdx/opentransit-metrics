import React from 'react';
import {
  XYPlot,
  HorizontalGridLines,
  XAxis,
  YAxis,
  VerticalRectSeries,
  ChartLabel,
  LineMarkSeries,
  Crosshair,
} from 'react-vis';
import Moment from 'moment';
import { AppBar, Box, Tab, Tabs, Typography } from '@material-ui/core';
import InfoByDay from './InfoByDay';
import InfoIntervalsOfDay from './InfoIntervalsOfDay';
import InfoTripSummary from './InfoTripSummary';
import { CHART_COLORS, REACT_VIS_CROSSHAIR_NO_LINE } from '../UIConstants';

function Info(props) {
  const [crosshairValues, setCrosshairValues] = React.useState({});
  const [tabValue, setTabValue] = React.useState(0);

  const {
    tripMetrics,
    tripMetricsError,
    tripMetricsLoading,
    graphParams,
    routes,
  } = props;

  const headways = tripMetrics ? tripMetrics.interval.headways : null;
  const waitTimes = tripMetrics ? tripMetrics.interval.waitTimes : null;
  const tripTimes = tripMetrics ? tripMetrics.interval.tripTimes : null;
  const byDayData = tripMetrics ? tripMetrics.byDay : null;

  const headwayData =
    headways && headways.histogram
      ? headways.histogram.map(bin => ({
          x0: bin.binStart,
          x: bin.binEnd,
          y: bin.count,
        }))
      : null;

  const waitData =
    waitTimes && waitTimes.histogram
      ? waitTimes.histogram.map(bin => ({
          x0: bin.binStart,
          x: bin.binEnd,
          y: bin.count,
        }))
      : null;

  const tripData =
    tripTimes && tripTimes.histogram
      ? tripTimes.histogram.map(bin => ({
          x0: bin.binStart,
          x: bin.binEnd,
          y: bin.count,
        }))
      : null;

  /**
   * Event handler for onMouseLeave.
   * @private
   */
  function onMouseLeave() {
    setCrosshairValues({});
  }

  /**
   * Event handler for onNearestX.
   * @param {Object} value Selected value.
   * @param {index} index Index of the value in the data array.
   * @private
   */
  function onNearestXHeadway(value, { index }) {
    setCrosshairValues({ headway: [headwayData[index]] });
  }

  function onNearestXWaitTimes(value, { index }) {
    setCrosshairValues({ wait: [waitData[index]] });
  }

  function onNearestXTripTimes(value, { index }) {
    setCrosshairValues({ trip: [tripData[index]] });
  }

  function handleTabChange(event, newValue) {
    setTabValue(newValue);
  }

  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const SUMMARY = 0;
  const TRIP_TIMES = 1;
  const HEADWAYS = 2;
  const ON_TIME_PERFORMANCE = 3;
  const TRIP_CHART = 4;

  const onTimeRateData =
    byDayData &&
    byDayData.map(dayData => {
      const scheduleAdherence = dayData.departureScheduleAdherence;
      return {
        x: Moment(dayData.dates[0]).format('dd MM/DD'),
        y:
          scheduleAdherence && scheduleAdherence.scheduledCount > 0
            ? (100 * scheduleAdherence.onTimeCount) /
              scheduleAdherence.scheduledCount
            : null,
      };
    });

  return (
    <div>
      <br />
      <AppBar position="static" color="default">
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="tab bar"
          variant="scrollable"
          scrollButtons="on"
        >
          <Tab
            style={{ minWidth: 72 }}
            label="Summary"
            {...a11yProps(SUMMARY)}
          />
          <Tab
            style={{ minWidth: 72 }}
            label="Trip Times"
            {...a11yProps(TRIP_TIMES)}
          />
          <Tab
            style={{ minWidth: 72 }}
            label="Service Frequency"
            {...a11yProps(HEADWAYS)}
          />
          <Tab
            style={{ minWidth: 72 }}
            label="On-Time Performance"
            {...a11yProps(ON_TIME_PERFORMANCE)}
          />
          <Tab
            style={{ minWidth: 72 }}
            label="Trip Chart"
            {...a11yProps(TRIP_CHART)}
          />
        </Tabs>
      </AppBar>

      {headways && routes ? (
        <div>
          {tabValue === SUMMARY ? (
            <Box p={2}>
              <InfoTripSummary
                tripMetrics={tripMetrics}
                graphParams={graphParams}
                routes={routes}
              />
            </Box>
          ) : null}
          {tabValue === TRIP_TIMES ? (
            <Box p={2}>
              {tripMetrics ? (
                <div>
                  <Typography variant="h5">
                    Trip Times by Time of Day
                  </Typography>
                  <InfoIntervalsOfDay tripMetrics={tripMetrics} />
                </div>
              ) : null}
              {tripMetrics && graphParams.date !== graphParams.startDate ? (
                <div>
                  <Typography variant="h5">Trip Times by Day</Typography>
                  <InfoByDay
                    byDayData={byDayData}
                    graphParams={graphParams}
                    routes={routes}
                  />
                </div>
              ) : null}
              {waitTimes ? (
                <div>
                  <Typography variant="h5">
                    Distribution of Wait Times
                  </Typography>
                  <div>
                    median wait time {Math.round(waitTimes.median)} minutes, max
                    wait time {Math.round(waitTimes.max)} minutes
                  </div>
                  <XYPlot
                    xDomain={[0, Math.max(60, Math.round(waitTimes.max) + 5)]}
                    height={200}
                    width={400}
                    onMouseLeave={onMouseLeave}
                  >
                    <HorizontalGridLines />
                    <XAxis />
                    <YAxis hideLine tickFormat={v => `${v}%`} />

                    <VerticalRectSeries
                      data={waitData}
                      onNearestX={onNearestXWaitTimes}
                      stroke="white"
                      fill={CHART_COLORS[0]}
                      style={{ strokeWidth: 2 }}
                    />

                    <ChartLabel
                      text="chance"
                      className="alt-y-label"
                      includeMargin={false}
                      xPercent={0.06}
                      yPercent={0.06}
                      style={{
                        transform: 'rotate(-90)',
                        textAnchor: 'end',
                      }}
                    />

                    <ChartLabel
                      text="minutes"
                      className="alt-x-label"
                      includeMargin={false}
                      xPercent={0.9}
                      yPercent={0.94}
                    />

                    {crosshairValues.wait && (
                      <Crosshair
                        values={crosshairValues.wait}
                        style={REACT_VIS_CROSSHAIR_NO_LINE}
                      >
                        <div className="rv-crosshair__inner__content">
                          Chance: {Math.round(crosshairValues.wait[0].y)}%
                        </div>
                      </Crosshair>
                    )}
                  </XYPlot>
                  TODO - show scheduled distribution of wait times
                  <br />
                  <br />
                </div>
              ) : null}
              {tripTimes ? (
                <div>
                  <Typography variant="h5">
                    Distribution of Travel Times
                  </Typography>
                  <div>
                    {tripTimes.count} trips, median{' '}
                    {Math.round(tripTimes.median)} minutes, max{' '}
                    {Math.round(tripTimes.max)} minutes
                  </div>
                  <XYPlot
                    xDomain={[0, Math.max(60, Math.round(tripTimes.max) + 5)]}
                    height={200}
                    width={400}
                    onMouseLeave={onMouseLeave}
                  >
                    <HorizontalGridLines />
                    <XAxis />
                    <YAxis hideLine />

                    <VerticalRectSeries
                      data={tripData}
                      onNearestX={onNearestXTripTimes}
                      stroke="white"
                      fill={CHART_COLORS[1]}
                      style={{ strokeWidth: 2 }}
                    />

                    <ChartLabel
                      text="trips"
                      className="alt-y-label"
                      includeMargin={false}
                      xPercent={0.06}
                      yPercent={0.06}
                      style={{
                        transform: 'rotate(-90)',
                        textAnchor: 'end',
                      }}
                    />

                    <ChartLabel
                      text="minutes"
                      className="alt-x-label"
                      includeMargin={false}
                      xPercent={0.9}
                      yPercent={0.94}
                    />

                    {crosshairValues.trip && (
                      <Crosshair
                        values={crosshairValues.trip}
                        style={REACT_VIS_CROSSHAIR_NO_LINE}
                      >
                        <div className="rv-crosshair__inner__content">
                          Trips: {Math.round(crosshairValues.trip[0].y)}
                        </div>
                      </Crosshair>
                    )}
                  </XYPlot>
                  TODO - show scheduled distribution of travel times
                </div>
              ) : null}
            </Box>
          ) : null}
          {tabValue === HEADWAYS ? (
            <Box p={2}>
              <Typography variant="h5">
                Service Frequency by Time of Day
              </Typography>
              TODO - bar chart with actual/scheduled headways
              <br />
              <br />
              <Typography variant="h5">
                Distribution of Headways (Time Between Vehicles)
              </Typography>
              <div>
                {headways.count} arrivals, median headway{' '}
                {Math.round(headways.median)} minutes, max headway{' '}
                {Math.round(headways.max)} minutes
              </div>
              <XYPlot
                xDomain={[0, Math.max(60, Math.round(headways.max) + 5)]}
                height={200}
                width={400}
                onMouseLeave={onMouseLeave}
              >
                <HorizontalGridLines />
                <XAxis />
                <YAxis hideLine />

                <VerticalRectSeries
                  data={headwayData}
                  onNearestX={onNearestXHeadway}
                  stroke="white"
                  fill={CHART_COLORS[0]}
                  style={{ strokeWidth: 2 }}
                />

                <ChartLabel
                  text="arrivals"
                  className="alt-y-label"
                  includeMargin={false}
                  xPercent={0.06}
                  yPercent={0.06}
                  style={{
                    transform: 'rotate(-90)',
                    textAnchor: 'end',
                  }}
                />

                <ChartLabel
                  text="minutes"
                  className="alt-x-label"
                  includeMargin={false}
                  xPercent={0.9}
                  yPercent={0.94}
                />

                {crosshairValues.headway && (
                  <Crosshair
                    values={crosshairValues.headway}
                    style={REACT_VIS_CROSSHAIR_NO_LINE}
                  >
                    <div className="rv-crosshair__inner__content">
                      Arrivals: {Math.round(crosshairValues.headway[0].y)}
                    </div>
                  </Crosshair>
                )}
              </XYPlot>
              TODO - show scheduled distribution of headways
              <br />
              <br />
              <Typography variant="h5">Headway Adherence</Typography>
              TODO - distribution of differences between actual headways and
              scheduled headways
            </Box>
          ) : null}
          {tabValue === ON_TIME_PERFORMANCE ? (
            <Box p={2}>
              <Typography variant="h5">
                On-Time Performance by Time of Day
              </Typography>
              TODO - bar chart with departure/arrival on-time %
              <br />
              <br />
              {graphParams.date !== graphParams.startDate ? (
                <div>
                  <Typography variant="h5">
                    On-Time Performance By Day
                  </Typography>
                  <XYPlot
                    xType="ordinal"
                    height={300}
                    width={400}
                    margin={{ left: 40, right: 10, top: 10, bottom: 60 }}
                    yDomain={[0, 100]}
                  >
                    <HorizontalGridLines />
                    <XAxis tickLabelAngle={-90} />
                    <YAxis hideLine />
                    <LineMarkSeries
                      data={onTimeRateData}
                      getNull={d => d.y !== null}
                      color={CHART_COLORS[0]}
                      stack
                    />
                    <ChartLabel
                      text="%"
                      className="alt-y-label"
                      includeMargin={false}
                      xPercent={0.06}
                      yPercent={0.06}
                      style={{
                        transform: 'rotate(-90)',
                        textAnchor: 'end',
                      }}
                    />
                  </XYPlot>
                  TODO - show arrival schedule adherence
                </div>
              ) : null}
              <br />
              <Typography variant="h5">Schedule Adherence</Typography>
              TODO - distribution of differences between actual arrival time and
              scheduled arrival time
            </Box>
          ) : null}
        </div>
      ) : null}
      {tabValue === TRIP_CHART ? (
        <Box p={2}>TODO: Marey chart between from/to stops</Box>
      ) : null}

      {tripMetricsError ? (
        <Box p={2}>
          <code>Error: {tripMetricsError}</code>
        </Box>
      ) : null}
      {tripMetricsLoading ? <Box p={2}>Loading...</Box> : null}
    </div>
  );
}

export default Info;
