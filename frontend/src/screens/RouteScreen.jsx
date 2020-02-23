import React, { useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';

import { connect } from 'react-redux';
import Info from '../components/Info';
import MapStops from '../components/MapStops';

import ControlPanel from '../components/ControlPanel';
import RouteSummary from '../components/RouteSummary';

import { fetchRoutes } from '../actions';

const useStyles = makeStyles(theme => ({
  darkLinks: {
    color: theme.palette.primary.dark,
  },
  breadCrumbsWrapper: {
    padding: '0',
  },
}));

function RouteScreen(props) {
  const {
    tripMetrics,
    tripMetricsLoading,
    tripMetricsError,
    graphParams,
    routes,
  } = props;

  const myFetchRoutes = props.fetchRoutes;
  const agencyId = graphParams ? graphParams.agencyId : null;

  useEffect(() => {
    if (!routes && agencyId) {
      myFetchRoutes({ agencyId });
    }
  }, [agencyId, routes, myFetchRoutes]); // like componentDidMount, this runs only on first render

  const classes = useStyles();
  const { breadCrumbsWrapper } = classes;
  return (
    <>
      <Paper className={breadCrumbsWrapper}>
        <ControlPanel routes={routes} />
      </Paper>
      <Grid container spacing={0}>
        <Grid item xs={12} sm={6}>
          <MapStops routes={routes} />
        </Grid>
        <Grid item xs={12} sm={6}>
          {/* control panel and map are full width for 640px windows or smaller, else half width */}
          {tripMetrics ||
          tripMetricsError ||
          tripMetricsLoading /* if we have trip metrics or an error, then show the info component */ ? (
            <Info
              tripMetrics={tripMetrics}
              tripMetricsError={tripMetricsError}
              tripMetricsLoading={tripMetricsLoading}
              graphParams={graphParams}
              routes={routes}
            />
          ) : (
            /* if no graph data, show the info summary component */
            <RouteSummary />
          )}
        </Grid>
      </Grid>
    </>
  );
}

const mapStateToProps = state => ({
  tripMetrics: state.tripMetrics.data,
  tripMetricsError: state.tripMetrics.error,
  tripMetricsLoading: state.loading.TRIP_METRICS,
  routes: state.routes.data,
  graphParams: state.graphParams,
  query: state.location.query,
});

const mapDispatchToProps = dispatch => ({
  fetchRoutes: params => dispatch(fetchRoutes(params)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RouteScreen);
