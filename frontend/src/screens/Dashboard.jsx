import React, { useEffect } from 'react';
import Grid from '@material-ui/core/Grid';

import { connect } from 'react-redux';
import MapSpider from '../components/MapSpider';
import RouteTable from '../components/RouteTable';

import { fetchRoutes, handleGraphParams, fetchDataRange } from '../actions';

function Dashboard(props) {
  const { routes } = props;
  const myFetchRoutes = props.fetchRoutes;
  const myHandleGraphParams = props.handleGraphParams;
  const dataRange = props.dataRange;
  const myFetchDataRange = props.fetchDataRange;

  // Like componentDidMount, this runs only on first render.
  useEffect(() => {
    if (!routes) {
      myFetchRoutes();
    }

    if (!dataRange) {
      myFetchDataRange();
    }

    // trigger action to fetch precomputed stats for initial graphParams
    myHandleGraphParams({});
  }, [routes, myFetchRoutes, myHandleGraphParams, dataRange, myFetchDataRange]);

  return (
    <Grid container spacing={0}>
      {/* Using spacing causes horizontal scrolling, see https://material-ui.com/components/grid/#negative-margin */}
      <Grid item xs={12} md={6} style={{ padding: 12 }}>
        {/* Doing the spacing between Grid items ourselves.  See previous comment. */}
        <RouteTable routes={routes} />
      </Grid>
      <Grid item xs={12} md={6}>
        {/* map and table are both full width for 1050px windows or smaller, else half width */}
        <MapSpider />
      </Grid>
    </Grid>
  );
}

const mapStateToProps = state => {
  return {
    routes: state.routes.data,
    dataRange: state.dataRange.data,
  };
};

const mapDispatchToProps = dispatch => ({
  fetchRoutes: params => dispatch(fetchRoutes(params)),
  handleGraphParams: params => dispatch(handleGraphParams(params)),
  fetchDataRange: params => dispatch(fetchDataRange(params)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
