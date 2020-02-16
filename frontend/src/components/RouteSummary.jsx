import React, { Fragment } from 'react';

import { connect } from 'react-redux';

import Grid from '@material-ui/core/Grid';

import {
  AppBar,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from '@material-ui/core';

import InfoScoreCard from './InfoScoreCard';
import InfoScoreLegend from './InfoScoreLegend';
import TravelTimeChart from './TravelTimeChart';
import MareyChart from './MareyChart';
import SummaryRow from './SummaryRow';
import {
  HighestPossibleScore,
  metersToMiles,
} from '../helpers/routeCalculations';

/**
 * Renders an "nyc bus stats" style summary of a route and direction.
 *
 * @param {any} props
 */
function RouteSummary(props) {
  const { graphParams, statsByRouteId, routeMetrics, routes } = props;
  const [tabValue, setTabValue] = React.useState(0);

  const routeIntervalMetrics = routeMetrics ? routeMetrics.interval : null;

  const { routeId, directionId } = graphParams;
  const routeStats = statsByRouteId[routeId] || { directions: [] };

  const route = routes
    ? routes.find(thisRoute => thisRoute.id === routeId)
    : null;

  let stats = null;
  let dirInfo = null;
  if (directionId) {
    stats =
      routeStats.directions.find(
        dirStats => dirStats.directionId === directionId,
      ) || {};
    dirInfo = route
      ? route.directions.find(dir => dir.id === directionId)
      : null;
  } else {
    stats = routeStats;
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
  const TRAVEL_TIME = 1;
  const MAREY_CHART = 2;

  const headerCellStyle = { padding: 6, fontSize: 16 };

  return (
    <Fragment>
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
            label="Travel Time"
            {...a11yProps(TRAVEL_TIME)}
          />
          <Tab
            style={{ minWidth: 72 }}
            label="Trip Chart"
            {...a11yProps(MAREY_CHART)}
          />
        </Tabs>
      </AppBar>

      {tabValue === SUMMARY ? (
        <Box p={2}>
          <div>
            <Table aria-labelledby="tableTitle">
              <TableHead>
                <TableRow>
                  <TableCell align="right" padding="none"></TableCell>
                  <TableCell align="right" padding="none"></TableCell>
                  <TableCell
                    align="right"
                    padding="none"
                    style={headerCellStyle}
                  >
                    Observed
                  </TableCell>
                  <TableCell
                    align="right"
                    padding="none"
                    style={headerCellStyle}
                  >
                    Scheduled
                  </TableCell>
                  <TableCell align="right" padding="none"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <SummaryRow
                  label="Median Service Frequency"
                  actual={stats.medianHeadway}
                  scheduled={
                    routeIntervalMetrics
                      ? routeIntervalMetrics.scheduledMedianHeadway
                      : null
                  }
                  positiveDiffDesc="longer"
                  negativeDiffDesc="shorter"
                  goodDiffDirection={-1}
                  precision={1}
                  units="min"
                  infoContent={
                    <Fragment>
                      This is the median (50th percentile) time between vehicles
                      during the service period. The median service frequency
                      for the entire route is the median of the median service
                      frequency for each stop along the route.
                    </Fragment>
                  }
                />
                <SummaryRow
                  label="Median Wait Time"
                  actual={stats.medianWaitTime}
                  scheduled={
                    routeIntervalMetrics
                      ? routeIntervalMetrics.scheduledMedianWaitTime
                      : null
                  }
                  units="min"
                  precision={1}
                  positiveDiffDesc="longer"
                  negativeDiffDesc="shorter"
                  goodDiffDirection={-1}
                  infoContent={
                    <Fragment>
                      This is the median (50th percentile) time you would expect
                      to wait for the next vehicle to depart, assuming you
                      arrived at a random time during the service period without
                      using timetables or predictions. The median wait time for
                      the entire route is the median of the median wait times
                      for each stop along the route.
                    </Fragment>
                  }
                />
                <SummaryRow
                  label="Average Speed"
                  actual={stats.averageSpeed}
                  scheduled={
                    routeIntervalMetrics
                      ? routeIntervalMetrics.scheduledAverageSpeed
                      : null
                  }
                  units="mph"
                  precision={1}
                  positiveDiffDesc="faster"
                  negativeDiffDesc="slower"
                  goodDiffDirection={1}
                  infoContent={
                    <Fragment>
                      This is the average speed from end to end for the median
                      completed trip (50th percentile travel time)
                      {directionId ? '' : ', averaged over all directions'}.
                    </Fragment>
                  }
                />
                <SummaryRow
                  label="On-Time %"
                  actual={
                    stats.onTimeRate != null ? stats.onTimeRate * 100 : null
                  }
                  scheduled=""
                  units="%"
                  precision={0}
                  infoContent={
                    <Fragment>
                      This is the percentage of scheduled departure times where
                      a vehicle departed less than 5 minutes after the scheduled
                      departure time or less than 1 minute before the scheduled
                      departure time. The on-time percentage for the entire
                      route is the median of the on-time percentage for each
                      stop along the route.
                    </Fragment>
                  }
                />
                {directionId ? (
                  <Fragment>
                    <SummaryRow
                      label="Completed Trips"
                      actual={
                        routeIntervalMetrics
                          ? routeIntervalMetrics.completedTrips
                          : null
                      }
                      scheduled={
                        routeIntervalMetrics
                          ? routeIntervalMetrics.scheduledCompletedTrips
                          : null
                      }
                      positiveDiffDesc="more"
                      negativeDiffDesc="fewer"
                      goodDiffDirection={1}
                    />
                    <SummaryRow
                      label="Travel Distance"
                      scheduled={
                        dirInfo ? metersToMiles(dirInfo.distance) : null
                      }
                      units="mi"
                      precision={1}
                    />
                    <SummaryRow
                      label="Stops"
                      scheduled={dirInfo ? dirInfo.stops.length : null}
                    />
                  </Fragment>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Box>
      ) : null}
      {tabValue === TRAVEL_TIME ? (
        <Box p={2} style={{ overflowX: 'auto' }}>
          <TravelTimeChart />
        </Box>
      ) : null}
      {tabValue === MAREY_CHART ? (
        <Box p={2} style={{ overflowX: 'auto' }}>
          <MareyChart />
        </Box>
      ) : null}
    </Fragment>
  );

  /*
              <Grid container spacing={4}>
              <InfoScoreCard
                title="Median Service Frequency"
                largeValue="##"
                smallValue="&nbsp;min"
                bottomContent={
                  <Fragment>
                    <div>
                      Scheduled:
                      <br />
                      ## min
                    </div>
                  </Fragment>
                }
                popoverContent={
                  <Fragment>
                    This is the median (50th percentile) time between vehicles
                    during the service period. The median headway for the entire
                    route is the median of the median headway for each stop
                    along the route.
                  </Fragment>
                }
              />
              <InfoScoreCard
                title="Median Wait"
                largeValue={
                  stats.medianWaitTime != null
                    ? stats.medianWaitTime.toFixed(0)
                    : '--'
                }
                smallValue="&nbsp;min"
                bottomContent={
                  <Fragment>
                    Scheduled:
                    <br />
                    ## min
                  </Fragment>
                }
                popoverContent={
                  <Fragment>
                    This is the median (50th percentile) time you would expect
                    to wait for the next vehicle to depart, assuming you arrived
                    at a random time during the service period without using
                    timetables or predictions. The median wait time for the
                    entire route is the median of the median wait times for each
                    stop along the route.
                  </Fragment>
                }
              />

              <InfoScoreCard
                title="On-Time %"
                largeValue={
                  stats.onTimeRate != null
                    ? (stats.onTimeRate * 100).toFixed(0)
                    : '--'
                }
                smallValue="%"
                popoverContent={
                  <Fragment>
                    This is the percentage of scheduled departure times where a
                    vehicle departed less than 5 minutes after the scheduled
                    departure time or less than 1 minute before the scheduled
                    departure time. The on-time percentage for the entire route
                    is the median of the on-time percentage for each stop along
                    the route.
                  </Fragment>
                }
                bottomContent=""
              />

              <InfoScoreCard
                title="Average Speed"
                largeValue={
                  stats.averageSpeed != null
                    ? stats.averageSpeed.toFixed(0)
                    : '--'
                }
                smallValue="&nbsp;mph"
                bottomContent={
                  <Fragment>
                    Scheduled:
                    <br />
                    ## mph
                  </Fragment>
                }
                popoverContent={
                  <Fragment>
                    This is the average speed from end to end for the median
                    completed trip (50th percentile travel time)
                    {directionId ? '' : ', averaged over all directions'}.
                  </Fragment>
                }
              />
            </Grid>
            */
}

const mapStateToProps = state => ({
  routes: state.routes.data,
  graphParams: state.graphParams,
  statsByRouteId: state.agencyMetrics.statsByRouteId,
  routeMetrics: state.routeMetrics.data,
});

export default connect(mapStateToProps)(RouteSummary);
