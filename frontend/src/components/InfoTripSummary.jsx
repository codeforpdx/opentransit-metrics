/**
 * Stop to stop trip summary component.
 */

import React, { Fragment, useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Typography,
} from '@material-ui/core';

import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Popover from '@material-ui/core/Popover';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import InfoIcon from '@material-ui/icons/InfoOutlined';
import StartStopIcon from '@material-ui/icons/DirectionsTransit';
import WatchLaterOutlinedIcon from '@material-ui/icons/WatchLaterOutlined';
import {
  computeScores,
  HighestPossibleScore,
} from '../helpers/routeCalculations';
import { getDistanceInMiles } from '../helpers/mapGeometry';
import { PLANNING_PERCENTILE, TENTH_PERCENTILE } from '../UIConstants';
import { getPercentileValue } from '../helpers/graphData';
import InfoScoreCard from './InfoScoreCard';
import InfoScoreLegend from './InfoScoreLegend';
import SummaryRow from './SummaryRow';

/**
 * Renders an "nyc bus stats" style summary of a route and direction.
 *
 * @param {any} props
 */
export default function InfoTripSummary(props) {
  const [typicalAnchorEl, setTypicalAnchorEl] = useState(null);
  const [planningAnchorEl, setPlanningAnchorEl] = useState(null);

  function handleTypicalClick(event) {
    setTypicalAnchorEl(event.currentTarget);
  }

  function handleTypicalClose() {
    setTypicalAnchorEl(null);
  }

  function handlePlanningClick(event) {
    setPlanningAnchorEl(event.currentTarget);
  }

  function handlePlanningClose() {
    setPlanningAnchorEl(null);
  }

  const { tripMetrics, graphParams, routes } = props;

  const intervalMetrics = tripMetrics ? tripMetrics.interval : null;

  const waitTimes = intervalMetrics ? intervalMetrics.waitTimes : null;
  const scheduledWaitTimes = intervalMetrics
    ? intervalMetrics.scheduledWaitTimes
    : null;
  const tripTimes = intervalMetrics ? intervalMetrics.tripTimes : null;
  const scheduledTripTimes = intervalMetrics
    ? intervalMetrics.scheduledTripTimes
    : null;
  const headways = intervalMetrics ? intervalMetrics.headways : null;
  const scheduledHeadways = intervalMetrics
    ? intervalMetrics.scheduledHeadways
    : null;

  const departureScheduleAdherence = intervalMetrics
    ? intervalMetrics.departureScheduleAdherence
    : null;
  const arrivalScheduleAdherence = intervalMetrics
    ? intervalMetrics.arrivalScheduleAdherence
    : null;

  const computeDistance = (myGraphParams, myRoutes) => {
    if (myGraphParams && myGraphParams.endStopId) {
      const directionId = myGraphParams.directionId;
      const routeId = myGraphParams.routeId;
      const route = myRoutes.find(thisRoute => thisRoute.id === routeId);
      const directionInfo = route.directions.find(
        dir => dir.id === directionId,
      );
      return getDistanceInMiles(
        route,
        directionInfo,
        myGraphParams.startStopId,
        myGraphParams.endStopId,
      );
    }
    return 0;
  };

  const distance = routes ? computeDistance(graphParams, routes) : null;

  const getAverageSpeed = tripTimeMetrics => {
    return tripTimeMetrics && tripTimeMetrics.count > 0 && distance
      ? distance / (tripTimeMetrics.median / 60.0)
      : null; // convert avg trip time to hours for mph
  };

  const averageSpeed = getAverageSpeed(tripTimes);
  const scheduledAverageSpeed = getAverageSpeed(scheduledTripTimes);

  const getOnTimePercent = scheduleAdherence => {
    return scheduleAdherence && scheduleAdherence.scheduledCount > 0
      ? (100 * scheduleAdherence.onTimeCount) / scheduleAdherence.scheduledCount
      : null;
  };

  const planningTravel = Math.round(
    getPercentileValue(tripTimes, PLANNING_PERCENTILE),
  );

  const useStyles = makeStyles(theme => ({
    uncolored: {
      margin: theme.spacing(1),
    },
    popover: {
      padding: theme.spacing(2),
      maxWidth: 500,
    },
  }));

  const classes = useStyles();

  const planningWait = Math.round(
    getPercentileValue(waitTimes, PLANNING_PERCENTILE),
  );

  const headerCellStyle = { padding: 6, fontSize: 16 };

  return (
    <Fragment>
      <div>
        <Table aria-labelledby="tableTitle">
          <TableHead>
            <TableRow>
              <TableCell align="right" padding="default"></TableCell>
              <TableCell align="right" padding="default"></TableCell>
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
              actual={headways ? headways.median : null}
              scheduled={scheduledHeadways ? scheduledHeadways.median : null}
              units="min"
              precision={1}
              positiveDiffDesc="longer"
              negativeDiffDesc="shorter"
              goodDiffDirection={-1}
              infoContent={
                <Fragment>
                  This is the median (50th percentile) time between vehicles
                  during the service period.
                </Fragment>
              }
            />
            <SummaryRow
              label="Median Wait Time"
              actual={waitTimes ? waitTimes.median : null}
              scheduled={scheduledWaitTimes ? scheduledWaitTimes.median : null}
              units="min"
              precision={1}
              positiveDiffDesc="longer"
              negativeDiffDesc="shorter"
              goodDiffDirection={-1}
              infoContent={
                <Fragment>
                  This is the median time you would expect to wait at the origin
                  stop for the next vehicle to depart, assuming you arrived at a
                  random time during the service period without using timetables
                  or predictions.
                </Fragment>
              }
            />
            <SummaryRow
              label="Median Travel Time"
              actual={tripTimes ? tripTimes.median : null}
              scheduled={scheduledTripTimes ? scheduledTripTimes.median : null}
              units="min"
              precision={1}
              positiveDiffDesc="longer"
              negativeDiffDesc="shorter"
              goodDiffDirection={-1}
              infoContent={
                <Fragment>
                  This is the median (50th percentile) travel time between the
                  origin stop and the destination stop.
                </Fragment>
              }
            />
            <SummaryRow
              label="Average Speed"
              actual={averageSpeed}
              scheduled={scheduledAverageSpeed}
              units="mph"
              precision={1}
              positiveDiffDesc="faster"
              negativeDiffDesc="slower"
              goodDiffDirection={1}
              infoContent={
                <Fragment>
                  This is the average speed corresponding to the median travel
                  time (not counting wait time).
                </Fragment>
              }
            />
            <SummaryRow
              label="Completed Trips"
              actual={tripTimes ? tripTimes.count : null}
              scheduled={scheduledTripTimes ? scheduledTripTimes.count : null}
              positiveDiffDesc="more"
              negativeDiffDesc="fewer"
              goodDiffDirection={1}
            />
            <SummaryRow
              label="Total Departures"
              actual={intervalMetrics ? intervalMetrics.departures : null}
              scheduled={
                intervalMetrics ? intervalMetrics.scheduledDepartures : null
              }
              positiveDiffDesc="more"
              negativeDiffDesc="fewer"
              goodDiffDirection={1}
            />
            <SummaryRow
              label="Total Arrivals"
              actual={intervalMetrics ? intervalMetrics.arrivals : null}
              scheduled={
                intervalMetrics ? intervalMetrics.scheduledArrivals : null
              }
              positiveDiffDesc="more"
              negativeDiffDesc="fewer"
              goodDiffDirection={1}
            />
            <SummaryRow
              label="On-Time Departure %"
              actual={getOnTimePercent(departureScheduleAdherence)}
              units="%"
              precision={0}
              infoContent={
                  <Fragment>
                    This is the percentage of scheduled departure times where a
                    vehicle departed less than 5 minutes after the scheduled
                    departure time or less than 1 minute before the scheduled
                    departure time.
                  </Fragment>
                }
            />
            <SummaryRow
              label="On-Time Arrival %"
              actual={getOnTimePercent(arrivalScheduleAdherence)}
              units="%"
              precision={0}
            />
            <SummaryRow
              label="Travel Distance"
              scheduled={distance}
              units="mi"
              precision={1}
            />
            <SummaryRow label="Stops" scheduled="TODO" />
          </TableBody>
        </Table>
      </div>
    </Fragment>
  );

  /*

        <Fragment>
          <Grid container spacing={4}>
            <InfoScoreCard
              score={scores.speedScore}
              title="Median Travel Time"
              largeValue={typicalTravel}
              smallValue="&nbsp;min"
              bottomContent={
                <div>
                  Scheduled:
                  <br />
                  XXX min
                </div>
              }
              popoverContent={
                <Fragment>
                  This is the median (50th percentile) travel time between the
                  origin stop and the destination stop.
                </Fragment>
              }
            />

            <InfoScoreCard
              score={scores.speedScore}
              title="Average Speed"
              largeValue={speed.toFixed(0)}
              smallValue="&nbsp;mph"
              bottomContent={
                <div>
                  Scheduled:
                  <br />
                  XXX mph
                </div>
              }
              popoverContent={
                <Fragment>
                  This is the average speed corresponding to the median travel
                  time (not counting wait time).
                </Fragment>
              }
            />

            <InfoScoreCard
              title="Median Headway"
              largeValue="##"
              smallValue="&nbsp;min"
              bottomContent={
                <div>
                  Scheduled:
                  <br />
                  XXX min
                </div>
              }
              popoverContent={
                <Fragment>
                  This is the median (50th percentile) time between vehicles
                  during the service period. The median headway for the entire
                  route is the median of the median headway for each stop along
                  the route.
                </Fragment>
              }
            />

            <InfoScoreCard
              score={scores.medianWaitScore}
              title="Median Wait"
              largeValue={Math.round(waitTimes.median)}
              smallValue="&nbsp;min"
              bottomContent={
                <div>
                  Scheduled:
                  <br />
                  XXX min
                </div>
              }
              popoverContent={
                <Fragment>
                  This is the median time you would expect to wait at the origin
                  stop for the next vehicle to depart, assuming you arrived at a
                  random time during the service period without using timetables
                  or predictions.
                </Fragment>
              }
            />

            <InfoScoreCard
              score={scores.onTimeRateScore}
              title="On-Time Departure %"
              largeValue={Math.round(onTimeRate * 100)}
              smallValue="%"
              bottomContent={
                scheduleAdherence
                  ? `${scheduleAdherence.onTimeCount} times out of ${scheduleAdherence.scheduledCount}`
                  : null
              }
              popoverContent={
                <Fragment>
                  This is the percentage of scheduled departure times where a
                  vehicle departed less than 5 minutes after the scheduled
                  departure time or less than 1 minute before the scheduled
                  departure time.
                </Fragment>
              }
            />
            <InfoScoreCard
              title="On-Time Arrival %"
              largeValue="##"
              smallValue="%"
              bottomContent={scheduleAdherence ? `## times out of ##` : null}
            />

            <InfoScoreCard
              title="Travel Distance"
              largeValue={distance != null ? distance.toFixed(1) : '--'}
              smallValue="&nbsp;mi"
              popoverContent={
                <Fragment>
                  This is the distance along the route between the start and end
                  stops, which is used to calculate average speed.
                </Fragment>
              }
            />

            <Grid item xs component={Paper} className={classes.uncolored}>
              <Typography variant="overline">
                Suggested planning time
              </Typography>
              <br />

              <Typography variant="h3" display="inline">
                {planningWait + planningTravel}
              </Typography>
              <Typography variant="h5" display="inline">
                &nbsp;min
              </Typography>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-end"
                pt={2}
              >
                <Typography variant="body1">
                  <WatchLaterOutlinedIcon
                    fontSize="small"
                    style={{ verticalAlign: 'sub' }}
                  />
                  &nbsp;
                  {planningWait} min
                  <br />
                  <StartStopIcon
                    fontSize="small"
                    style={{ verticalAlign: 'sub' }}
                  />
                  &nbsp;
                  {planningTravel} min
                </Typography>
                <IconButton size="small" onClick={handlePlanningClick}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Box>
            </Grid>

            <Popover
              open={Boolean(typicalAnchorEl)}
              anchorEl={typicalAnchorEl}
              onClose={handleTypicalClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <div className={classes.popover}>
                This is the median wait time when a rider arrives randomly at a
                stop or a rider starts checking predictions. This is combined
                with the median trip time.
              </div>
            </Popover>

            <Popover
              open={Boolean(planningAnchorEl)}
              anchorEl={planningAnchorEl}
              onClose={handlePlanningClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <div className={classes.popover}>
                When planning to arrive by a specific time, the 90th percentile
                wait time and 90th percentile travel time suggest how far in
                advance to start checking predictions. Walking time should also
                be added.
              </div>
            </Popover>
          </Grid>
        </Fragment>
        ) : ( `No trip summary (${whyNoData})` )} */
}
