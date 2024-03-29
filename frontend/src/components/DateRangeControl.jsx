import React, { useState, useEffect } from 'react';
import Moment from 'moment';
import { makeStyles } from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Popover from '@material-ui/core/Popover';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { connect } from 'react-redux';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';

import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import { List, ListItem, Snackbar } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import {
  allFalse,
  allTrue,
  getDaysOfTheWeekLabel,
  renderDateString,
} from '../helpers/dateTime';

import {
  DATE_RANGES,
  MAX_DATE_RANGE,
  WEEKDAYS,
  WEEKENDS,
} from '../UIConstants';
import { initialGraphParams } from '../reducers';
import { fullQueryFromParams } from '../routesMap';
import { updateQuery } from '../actions';

const useStyles = makeStyles(theme => ({
  button: {
    textTransform: 'none',
    borderRadius: '0px',
    borderColor: 'rgba(0, 0, 0, 0.42);',
    borderWidth: '0px 0px 1px 0px',
    padding: '3px 4px 3px 4px',
    justifyContent: 'flex-start',
    marginTop: '2px',
  },
  checkboxLabel: {
    fontSize: theme.typography.pxToRem(14),
  },
  heading: {
    fontSize: theme.typography.pxToRem(16),
    color: '#333',
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(12),
    color: theme.palette.text.secondary,
    // color: theme.palette.text.secondary,
    textAlign: 'left',
  },
  column: {
    flexGrow: '1',
  },
  dateTime: {
    whiteSpace: 'nowrap',
    display: 'flex',
  },
  root: {
    whiteSpace: 'nowrap',
  },
  formControl: {
    leftMargin: theme.spacing(1),
    rightMargin: theme.spacing(1),
    minWidth: 240,
  },
  closeButton: {
    position: 'absolute',
    zIndex: 100000,
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  popover: {
    padding: theme.spacing(2),
    maxWidth: 400,
  },
}));

/**
 * Displays alert when an invalid date range is set.
 *
 * @param {any} props A flag saying to show the alert
 * @returns A snackbar
 */
function NoDaysSelectedAlert(props) {
  return (
    <Snackbar
      message="Please select at least one day of week overlapping with the date range."
      open={props.showAlert}
    />
  );
}

/**
 * Returns an array of dates between the two dates.
 */
function enumerateDaysBetweenDates(startDate, endDate) {
  const dates = [];
  let enumDate = Moment(startDate).format();
  while (Moment(enumDate) <= Moment(endDate)) {
    dates.push(enumDate);
    enumDate = Moment(enumDate)
      .add(1, 'days')
      .format();
  }
  return dates;
}

/*
 * Renders a control that allows the user to select a date range,
 * and updates the query string.
 *
 * It appears like a Material UI dropdown/select control, but clicking
 * it opens a panel with custom UI for selecting a date range.
 *
 * If the targetRange prop is 'secondDateRange', updates the
 * second date range used for comparison.
 *
 * This control preserves the time ranges selected via the TimeRangeControl.
 */
function DateRangeControl(props) {
  const { graphParams } = props;

  const targetRange = props.targetRange || 'firstDateRange';

  const dateRangeParams = graphParams[targetRange];

  // Add graphParams as state.
  const [localDateRangeParams, setLocalDateRangeParams] = useState(
    dateRangeParams,
  );

  // The dates between start date and end date, 24 hours apart.
  const dates = enumerateDaysBetweenDates(
    Moment(localDateRangeParams.startDate, 'YYYY-MM-DD'),
    Moment(localDateRangeParams.date, 'YYYY-MM-DD'),
  );

  // The selected days of the week (which checkboxes are checked).
  const dowsUsed = [false, false, false, false, false, false, false];
  for (let j = 0; j < dates.length; j++) {
    dowsUsed[Moment(dates[j]).day()] = true;
  }

  // If the combination of the daterange and the days of the week result in
  // at least one day being selected, atLeastOneDaySelected = true
  let atLeastOneDaySelected = false;
  for (let j = 0; j < dowsUsed.length; j++) {
    if (
      localDateRangeParams.daysOfTheWeek[j] === true &&
      dowsUsed[j] === true
    ) {
      atLeastOneDaySelected = true;
    }
  }

  /**
   * Syncs our control w/the native date picker.
   */
  function resetLocalDateRangeParams() {
    setLocalDateRangeParams(dateRangeParams);
  }

  useEffect(() => {
    setLocalDateRangeParams(dateRangeParams);
  }, [dateRangeParams]);

  const classes = useStyles();

  const [anchorEl, setAnchorEl] = useState(null);

  // Today's date.
  const maxDate = Moment(Date.now()).format('YYYY-MM-DD');

  /**
   * Handles clicks on the button that expands the date picker.
   *
   * @param {any} event The click event.
   */
  function handleClick(event) {
    setAnchorEl(event.currentTarget);
  }

  /**
   * Sets the query params in the URL.
   * Called from various handlers.
   *
   * @param {any} newDateRangeParams
   * @returns
   */
  function setDateRangeParams(newDateRangeParams) {
    if (
      JSON.stringify(newDateRangeParams) ===
      JSON.stringify(graphParams[targetRange])
    ) {
      return;
    }

    const newGraphParams = { ...graphParams };

    newGraphParams[targetRange] = newDateRangeParams;
    props.updateQuery(fullQueryFromParams(newGraphParams));
  }

  /**
   * Sets the date range params from the localDateRangeParams (values
   *  in the component UI).
   */
  function handleApply() {
    setDateRangeParams(localDateRangeParams);
    setAnchorEl(null);
  }

  /**
   * Updates the date range in the local state.
   * Called from the handlers for form changes.
   *
   * @param {any} datePayload
   */
  function updateLocalDateRangeParams(datePayload) {
    const newLocalDateRangeParams = { ...localDateRangeParams, ...datePayload };
    setLocalDateRangeParams(newLocalDateRangeParams);
  }

  /**
   * Updates the query params in the URL when the form is reset.
   *
   * @param {any} datePayload
   */
  function updateDateRangeParams(datePayload) {
    const newDateRangeParams = { ...dateRangeParams, ...datePayload };
    setDateRangeParams(newDateRangeParams);
  }

  /**
   * Resets the form.
   * Called when the "reset" button is clicked.
   */
  function handleReset() {
    const initialDateRangeParams = initialGraphParams[targetRange];

    if (initialDateRangeParams) {
      updateDateRangeParams({
        date: initialDateRangeParams.date,
        daysBack: initialDateRangeParams.daysBack,
        startDate: initialDateRangeParams.date,
        daysOfTheWeek: initialDateRangeParams.daysOfTheWeek,
      });
    } else {
      setDateRangeParams(null);
    }

    // this forces the native date picker to reset, otherwise it doesn't stay in sync
    resetLocalDateRangeParams();
    setAnchorEl(null);
  }

  /**
   * convert yyyy/mm/dd to m/d/yyyy
   */
  // these are the read-only representations of the date and time range
  let dateLabel = renderDateString(dateRangeParams.date);
  let smallLabel = '';

  //
  // If a date range is set, either update the date label to the full
  // range if we support it, or else show an info icon that explains
  // that we are only showing one day's data.
  //

  if (dateRangeParams.startDate !== dateRangeParams.date) {
    dateLabel = `${renderDateString(dateRangeParams.startDate)} - ${dateLabel}`;
    smallLabel = `${getDaysOfTheWeekLabel(dateRangeParams.daysOfTheWeek)}`;
  }

  /**
   * Handler that updates the (end) date string in the state.
   * Also keeps startDate no later than date.
   * Called when "End Date" (maxDate) changes.
   *
   * @param {any} myDate ChangeEvent
   */
  const setEndDate = myDate => {
    const newDate = myDate.target.value;
    if (!newDate) {
      // ignore empty date and leave at current value
    } else {
      const newMoment = Moment(newDate);
      const startMoment = Moment(dateRangeParams.startDate);

      const payload = {
        date: newDate,
      };

      if (newMoment.isBefore(dateRangeParams.startDate)) {
        payload.startDate = newDate;
      } else if (newMoment.diff(startMoment, 'days') > MAX_DATE_RANGE) {
        payload.startDate = newMoment
          .subtract(MAX_DATE_RANGE, 'days')
          .format('YYYY-MM-DD');
      }
      updateLocalDateRangeParams(payload);
    }
  };

  /**
   * Handler that updates the start date string in the state.
   * Called when "Start Date" (startDate) changes.
   *
   * @param {any} myDate ChangeEvent
   */
  const setStartDate = myDate => {
    if (!myDate.target.value) {
      // ignore empty date and leave at current value
    } else {
      updateLocalDateRangeParams({
        startDate: myDate.target.value,
      });
    }
  };

  /**
   * Handler that updates the date range in the state.
   * Called when an element in DATE_RANGES is clicked.
   *
   * @param {any} daysBack Number of days back from today
   */
  const setDateRange = daysBack => {
    // End date.
    const date = initialGraphParams[targetRange].date;

    // Start date as Moment.
    const startMoment = Moment(date).subtract(daysBack - 1, 'days');

    updateLocalDateRangeParams({
      date,
      startDate: startMoment.format('YYYY-MM-DD'),
    });

    // The GraphQL api takes a list of dates, which are generated just before
    // calling the API.
  };

  /**
   * Handler that updates the selected days in the state.
   *
   * @param {any} event
   */
  const handleDayChange = event => {
    const day = event.target.value;
    const newDaysOfTheWeek = { ...localDateRangeParams.daysOfTheWeek };
    newDaysOfTheWeek[day] = event.target.checked;
    updateLocalDateRangeParams({
      daysOfTheWeek: newDaysOfTheWeek,
    });
  };

  /**
   * Bulk toggle.
   */
  const toggleDays = event => {
    const what = event.target.value === 'weekdays' ? WEEKDAYS : WEEKENDS;

    const newDaysOfTheWeek = { ...localDateRangeParams.daysOfTheWeek };

    // If all false -> set all to true; some false/true -> set all true; all true -> set all false;
    // That is, if all true, set to all false, otherwise set to all true.

    const newValue = !allTrue(newDaysOfTheWeek, what);

    for (let i = 0; i < what.length; i++) {
      newDaysOfTheWeek[what[i].value] = newValue;
    }

    updateLocalDateRangeParams({
      daysOfTheWeek: newDaysOfTheWeek,
    });
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        className={`${classes.button} MuiInput-formControl`}
        onClick={handleClick}
      >
        <div className={classes.dateTime}>
          <span>
            <Typography className={classes.heading} display="inline">
              {dateLabel}&nbsp;
            </Typography>
            <Typography className={classes.secondaryHeading} display="inline">
              {smallLabel}
            </Typography>
          </span>
          <ArrowDropDownIcon />
        </div>
      </Button>
      <NoDaysSelectedAlert showAlert={!atLeastOneDaySelected} />

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleApply}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <IconButton
          size="small"
          aria-label="close"
          className={classes.closeButton}
          onClick={handleApply}
        >
          <CloseIcon />
        </IconButton>

        <List style={{ color: 'black' }}>
          <ListItem>
            <FormControl className={classes.formControl}>
              <TextField
                id="startDate"
                label="Start Date"
                type="date"
                value={localDateRangeParams.startDate}
                InputProps={{
                  inputProps: {
                    max: localDateRangeParams.date,
                    min: Moment(localDateRangeParams.date)
                      .subtract(MAX_DATE_RANGE, 'days')
                      .format('YYYY-MM-DD'),
                  },
                }}
                className={classes.textField}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={setStartDate}
              />
            </FormControl>
          </ListItem>

          <ListItem>
            <FormControl className={classes.formControl}>
              <TextField
                id="date"
                label="End Date"
                type="date"
                value={localDateRangeParams.date}
                InputProps={{
                  inputProps: {
                    max: maxDate,
                  },
                }}
                className={classes.textField}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={setEndDate}
              />
            </FormControl>
          </ListItem>

          <ListItem dense>
            <Grid container style={{ maxWidth: 250 }}>
              {DATE_RANGES.map(range => (
                <Grid item xs={6} key={range.value}>
                  <Button
                    size="small"
                    key={range.value}
                    onClick={() => {
                      setDateRange(range.value);
                    }}
                  >
                    {range.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </ListItem>
          <ListItem>
            <FormControl component="fieldset" className={classes.formControl}>
              <Grid container>
                <Grid item>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          value="weekdays"
                          checked={
                            !allFalse(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKDAYS,
                            )
                          }
                          indeterminate={
                            !allFalse(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKDAYS,
                            ) &&
                            !allTrue(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKDAYS,
                            )
                          }
                          onChange={toggleDays}
                        />
                      }
                      label="Weekdays"
                    />

                    <Divider
                      variant="middle"
                      style={
                        { marginLeft: 0 } /* divider with a right margin */
                      }
                    />

                    {WEEKDAYS.map(day => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={
                              localDateRangeParams.daysOfTheWeek[day.value]
                            }
                            onChange={handleDayChange}
                            value={day.value}
                          />
                        }
                        key={day.value}
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </Grid>
                <Grid item>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          value="weekends"
                          checked={
                            !allFalse(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKENDS,
                            )
                          }
                          indeterminate={
                            !allFalse(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKENDS,
                            ) &&
                            !allTrue(
                              localDateRangeParams.daysOfTheWeek,
                              WEEKENDS,
                            )
                          }
                          onChange={toggleDays}
                        />
                      }
                      label="Weekends"
                    />

                    <Divider
                      variant="middle"
                      style={
                        { marginLeft: 0 } /* divider with a right margin */
                      }
                    />

                    {WEEKENDS.map(day => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={
                              localDateRangeParams.daysOfTheWeek[day.value]
                            }
                            onChange={handleDayChange}
                            value={day.value}
                          />
                        }
                        key={day.value}
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </Grid>
              </Grid>
            </FormControl>
          </ListItem>

          <ListItem dense>
            <Grid
              container
              alignItems="flex-start"
              justify="space-between"
              direction="row"
            >
              <Button
                onClick={handleApply}
                color="primary"
                variant="contained"
                disabled={!atLeastOneDaySelected}
              >
                Apply
              </Button>
              <Button onClick={handleReset}>Reset</Button>
            </Grid>
          </ListItem>
        </List>
      </Popover>
    </>
  );
}

const mapStateToProps = state => ({
  graphParams: state.graphParams,
});

const mapDispatchToProps = dispatch => {
  return {
    updateQuery: params => dispatch(updateQuery(params)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DateRangeControl);
