from models import vehicle_positions, util, config
import argparse

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Download raw vehicle state data from S3')
    parser.add_argument('--agency', required=False)
    parser.add_argument('--date', required=True, help='date')
    parser.add_argument('--start-time', required=False, help='start time (hh:mm)')
    parser.add_argument('--end-time', required=False, help='end time (hh:mm)')

    args = parser.parse_args()

    agencies = [config.get_agency(args.agency)] if args.agency is not None else config.agencies

    date_str = args.date

    d = util.parse_date(date_str)

    # todo use default_day_start_hour
    start_time_str = args.start_time
    if start_time_str is None:
        start_time_str = '03:00'

    end_time_str = args.end_time
    if end_time_str is None:
        end_time_str = '03:00+1'

    for agency in agencies:
        tz = agency.tz
        local_start = util.get_localized_datetime(d, start_time_str, tz)
        local_end = util.get_localized_datetime(d, end_time_str, tz)

        route_ids = [route.id for route in agency.get_route_list()]

        print(f"agency = {agency.id}")
        print(f"start = {local_start}")
        print(f"end = {local_end}")

        state = vehicle_positions.get_state(agency.id, d, local_start.timestamp(), local_end.timestamp(), route_ids)
