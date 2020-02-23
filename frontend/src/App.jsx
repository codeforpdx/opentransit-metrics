import React from 'react';
import { connect } from 'react-redux';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';

import './App.css';

import Toolbar from '@material-ui/core/Toolbar';
import AppBar from '@material-ui/core/AppBar';
import DateTimePanel from './components/DateTimePanel';
import SidebarButton from './components/SidebarButton';
import AppBarLogo from './components/AppBarLogo';
import Isochrone from './screens/Isochrone';
import DataDiagnostic from './screens/DataDiagnostic';
import RouteScreen from './screens/RouteScreen';
import Dashboard from './screens/Dashboard';
import NotFound from './components/NotFound';
import Landing from './components/Landing';
import About from './components/About';
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

const App = ({ page }) => {
  const Component = Components[page];

  const agency = Agencies[0];

  return (
    <ThemeProvider theme={theme}>
      <div>
        <AppBar position="fixed">
          <Toolbar variant="dense">
            <SidebarButton />
            <AppBarLogo />
            <div className="page-title">{agency.title}</div>
            <DateTimePanel dateRangeSupported />
          </Toolbar>
        </AppBar>
        <div style={{ height: 52 }}>&nbsp;</div>
        <Component />
      </div>
    </ThemeProvider>
  );
};

const mapStateToProps = ({ page }) => ({ page });

export default connect(mapStateToProps)(App);
