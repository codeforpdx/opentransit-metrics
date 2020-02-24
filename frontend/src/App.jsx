import React from 'react';
import { connect } from 'react-redux';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';

import './App.css';

import Toolbar from '@material-ui/core/Toolbar';
import AppBar from '@material-ui/core/AppBar';
import { Tab, Tabs } from '@material-ui/core';
import PollIcon from '@material-ui/icons/Poll';
import PersonPinCircleIcon from '@material-ui/icons/PersonPinCircle';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import DateTimePanel from './components/DateTimePanel';
import AppBarLogo from './components/AppBarLogo';
import Isochrone from './screens/Isochrone';
import DataDiagnostic from './screens/DataDiagnostic';
import RouteScreen from './screens/RouteScreen';
import Dashboard from './screens/Dashboard';
import NotFound from './components/NotFound';
import Landing from './components/Landing';
import About from './components/About';
import LoadingIndicator from './components/LoadingIndicator';
import { Agencies } from './config';

const Components = {
  About,
  Isochrone,
  Landing,
  Dashboard,
  RouteScreen,
  DataDiagnostic,
  NotFound,
};

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#0177BF',
    },
    secondary: {
      main: '#D02143',
    },
  },
});

const App = props => {
  const { page, dispatch } = props;
  const Component = Components[page];

  const agency = Agencies[0];

  let tabValue = null;
  if (page === 'RouteScreen' || page === 'Dashboard') {
    tabValue = 'DASHBOARD';
  } else if (page === 'Isochrone') {
    tabValue = 'ISOCHRONE';
  } else if (page === 'About') {
    tabValue = 'ABOUT';
  }

  const handleTabChange = (event, newValue) => {
    dispatch({
      type: newValue,
      query: props.query,
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <div>
        <AppBar position="fixed">
          <Toolbar variant="dense" disableGutters>
            <AppBarLogo />
            <div className="page-title">{agency.title}</div>
            <DateTimePanel dateRangeSupported />
            <LoadingIndicator />
            <div className="flex-spacing"></div>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                label={
                  <div>
                    <PollIcon style={{ verticalAlign: '-6px' }} />
                    <span className="app-tab-text"> Metrics</span>
                  </div>
                }
                value="DASHBOARD"
              />
              <Tab
                label={
                  <div>
                    <PersonPinCircleIcon style={{ verticalAlign: '-6px' }} />
                    <span className="app-tab-text"> Isochrone</span>
                  </div>
                }
                value="ISOCHRONE"
              />
              <Tab
                label={
                  <div>
                    <InfoRoundedIcon style={{ verticalAlign: '-6px' }} />
                    <span className="app-tab-text"> About</span>
                  </div>
                }
                value="ABOUT"
              />
            </Tabs>
          </Toolbar>
        </AppBar>
        <div style={{ height: 48 }}>&nbsp;</div>
        <Component />
      </div>
    </ThemeProvider>
  );
};

const mapStateToProps = state => ({
  page: state.page,
  query: state.location.query,
});

const mapDispatchToProps = dispatch => {
  return {
    dispatch,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);
