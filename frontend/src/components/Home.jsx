import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { css } from 'emotion';
import { NavLink } from 'redux-first-router-link';

import ControlPanel from './ControlPanel';
import Info from './Info';
import Intro from './Intro';
import RouteSummary from './RouteSummary';
import {
  fetchGraphData,
  fetchRoutes,
  fetchRouteConfig,
  resetGraphData,
  fetchTazs,
  fetchTrips,
  fetchRouteCSVs,
  fetchAllTheThings,
} from '../actions';

class Home extends Component {
  componentDidMount() {
    if (!this.props.routes) {
      this.props.fetchAllTheThings();
    }
    /*    if (!this.props.tazs) {
    this.props.fetchTazs();
  }*/
    /*if (!this.props.trips) {
      this.props.fetchTrips();
    }*/
  }

  render() {
    const { graphData, graphError, graphParams, routes, routeCSVs, trips, shapes, tripTimes, waitTimes } = this.props;
    return (
      <Fragment>
        <button>
          <NavLink
            to={{ type: 'HOME' }}
            activeStyle={{ fontWeight: "bold", color: 'purple' }}
            exact={true}
            strict={true}
          >
            Home
          </NavLink>
        </button>
        <button>
          <NavLink
            to={{ type: 'ABOUT' }}
            activeStyle={{ fontWeight: "bold", color: 'purple' }}
            exact={true}
            strict={true}
          >
            About
          </NavLink>
        </button>
        <button>
          <NavLink
            to={{ type: 'LANDING' }}
            activeStyle={{ fontWeight: "bold", color: 'purple' }}
            exact={true}
            strict={true}
          >
            Landing
          </NavLink>
        </button>
        <div className={css`
          display: grid;
          grid-gap: 4px;
          grid-template-columns: [col1-start] 200px [col2-start] 500px  [col3-start] auto [col3-end];
          grid-template-rows: [row1-start] 80px [row2-start] 400px [row2-end];
          background-color: #fff;
          color: #444;
          padding: 2%;
          font-family: 'Roboto', sans-serif;
          `
        }
        >
          <Intro />
          <ControlPanel routes={routes}
            fetchRouteConfig={this.props.fetchRouteConfig}
            resetGraphData={this.props.resetGraphData}
            fetchGraphData={this.props.fetchGraphData}
            tripTimes={tripTimes}/>
          <div className="center metricsWidth">
          </div>
          <div
          className={css`
           grid-column: col3-start ;
           grid-row: row1-start / row2-end;
          `
          }
          >
            <RouteSummary graphData={graphData} graphParams={graphParams} trips={trips} routeCSVs={routeCSVs} shapes={shapes} routes={routes} tripTimes={tripTimes} waitTimes={waitTimes} />
            <Info graphData={graphData} graphError={graphError} graphParams={graphParams} routes={routes} />
          </div>
        </div>
      </Fragment>
    );
  }
}

const mapStateToProps = state => ({
  graphData: state.fetchGraph.graphData,
  routes: state.routes.routes,
  graphError: state.fetchGraph.err,
  graphParams: state.fetchGraph.graphParams,
  tazs: state.tazs.tazs,
  trips: state.trips.trips,
  routeCSVs: state.routeCSVs.routeCSVs,
  shapes: state.shapes.shapes,
  tripTimes: state.tripTimes.tripTimes,
  waitTimes: state.waitTimes.waitTimes,
});

const mapDispatchToProps = dispatch => ({
  resetGraphData: params => dispatch(resetGraphData()),
  fetchGraphData: params => dispatch(fetchGraphData(params)),
  fetchRoutes: () => dispatch(fetchRoutes()),
  fetchRouteConfig: routeId => dispatch(fetchRouteConfig(routeId)),
  fetchTazs: () => dispatch(fetchTazs()),
  fetchTrips: () => dispatch(fetchTrips()),
  fetchAllTheThings: () => dispatch(fetchAllTheThings()),
});

Home.propTypes = {
  graphData: PropTypes.instanceOf(Object),
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
