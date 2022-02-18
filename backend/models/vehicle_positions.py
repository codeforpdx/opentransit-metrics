import requests
import os
import re
import json
import math
from . import config
import time
from pathlib import Path
from datetime import datetime, date
import pandas as pd
import gzip
import boto3

class CachedState:
    def __init__(self):
        self.cache_paths = {}

    def add(self, route_id, cache_path):
        self.cache_paths[route_id] = cache_path

    def get_for_route(self, route_id) -> pd.DataFrame:
        if route_id not in self.cache_paths:
            return None

        cache_path = self.cache_paths[route_id]
        print(f'loading state for route {route_id} from cache: {cache_path}')
        buses = pd.read_csv(
                cache_path,
                dtype={
                    'vehicleId': str,
                    'directionId': str,
                },
                float_precision='high', # keep precision for rounding lat/lon
            ) \
            .rename(columns={
                'latitude': 'LAT',
                'longitude': 'LON',
                'vehicleId': 'VID',
                'directionId': 'DID',
                'secsSinceReport': 'AGE',
                'timestamp': 'RAW_TIME'
            }) \
            .reindex(['RAW_TIME', 'VID', 'LAT', 'LON', 'DID', 'AGE'], axis='columns')

        # adjust each observation time for the number of seconds old the GPS location was when the observation was recorded
        buses['TIME'] = (buses['RAW_TIME'] - buses['AGE'].fillna(0)) #.astype(np.int64)

        buses = buses.drop(['RAW_TIME','AGE'], axis=1)
        buses = buses.sort_values('TIME', axis=0)

        return buses

def get_key_timestamp(key: str):
    key_parts = key.split('_')
    timestamp_str = key_parts[-1].split('.json')[0]
    return math.floor(int(timestamp_str)/1000) # convert from ms to sec

def get_bucket_hour_prefix(agency_id: str, timestamp) -> str:
    dt = datetime.utcfromtimestamp(timestamp)
    dt_path_segment = dt.strftime('%Y/%m/%d/%H')
    return f'state/v1/{agency_id}/{dt_path_segment}/'

def get_state(agency_id: str, d: date, start_time, end_time, route_ids) -> CachedState:
    # don't try to fetch historical vehicle data from the future
    now = int(time.time())
    if end_time > now:
        end_time = now
        print(f'end_time set to current time ({end_time})')

    # saves state to local file system, since keeping the state for all routes in memory
    # while computing arrival times causes causes Python to spend more time doing GC
    state = CachedState()

    uncached_route_ids = []
    for route_id in route_ids:
        cache_path = get_cache_path(agency_id, d, start_time, end_time, route_id)
        if Path(cache_path).exists():
            state.add(route_id, cache_path)
        else:
            uncached_route_ids.append(route_id)

    if len(uncached_route_ids) == 0:
        print('state already cached')
        return state

    state_cache_dir = Path(get_state_cache_dir(agency_id))
    if not state_cache_dir.exists():
        state_cache_dir.mkdir(parents = True, exist_ok = True)

    cur_time = start_time

    # UTC hours always start with a timestamp at multiples of 3600 seconds
    start_hour = start_time - (start_time % 3600)

    hour_prefixes = [
        get_bucket_hour_prefix(agency_id, timestamp)
        for timestamp in range(int(start_hour), int(end_time), 3600)
    ]

    seen_timestamps = {}

    remove_route_temp_cache(agency_id)

    s3_bucket = config.s3_bucket

    s3 = boto3.resource("s3")
    bucket = s3.Bucket(s3_bucket)

    for hour_prefix in hour_prefixes:
        print(hour_prefix)

        route_csv_lines = {}
        for obj in bucket.objects.filter(Prefix=hour_prefix):
            timestamp = get_key_timestamp(obj.key)
            if timestamp >= start_time and timestamp < end_time and timestamp not in seen_timestamps:
                print(obj.key)
                seen_timestamps[timestamp] = True

                data = obj.get()
                state_json = gzip.decompress(data['Body'].read())
                vehicles = json.loads(state_json)

                for vehicle in vehicles:
                    route_id = vehicle['routeId']
                    vehicle['timestamp'] = timestamp

                    csv_line = ','.join([
                        str(vehicle.get(vehicle_key, ''))
                        for vehicle_key in vehicle_keys
                    ])

                    if route_id not in route_csv_lines:
                        route_csv_lines[route_id] = []
                    route_csv_lines[route_id].append(csv_line)

        for route_id, csv_lines in route_csv_lines.items():
            append_route_csv_lines_to_temp_cache(agency_id, route_id, csv_lines)

    # cache state per route since that's how we need to access it to compute arrival times
    for route_id in route_ids:
        cache_path = get_cache_path(agency_id, d, start_time, end_time, route_id)

        cache_dir = Path(cache_path).parent
        if not cache_dir.exists():
            cache_dir.mkdir(parents = True, exist_ok = True)

        temp_cache_path = get_route_temp_cache_path(agency_id, route_id)
        if not os.path.exists(temp_cache_path):
            # create empty cache file so that get_state doesn't need to request routes with no data again
            # if it is called again later
            write_csv_header(temp_cache_path)

        os.rename(temp_cache_path, cache_path)

        state.add(route_id, cache_path)

    return state

def validate_agency_id(agency_id: str):
    if re.match('^[\w\-]+$', agency_id) is None:
        raise Exception(f"Invalid agency: {agency_id}")

def validate_agency_route_path_attributes(agency_id: str, route_id: str):
    validate_agency_id(agency_id)

    if re.match('^[\w\-]+$', route_id) is None:
        raise Exception(f"Invalid route id: {route_id}")

def get_state_cache_dir(agency_id):
    validate_agency_id(agency_id)
    source_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    return os.path.join(
        source_dir,
        'data',
        f"state_v3_{agency_id}",
    )

def get_route_temp_cache_path(agency_id: str, route_id: str) -> str:
    validate_agency_route_path_attributes(agency_id, route_id)
    source_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    return os.path.join(
        get_state_cache_dir(agency_id),
        f"state_{agency_id}_{route_id}_temp_cache.csv",
    )

def remove_route_temp_cache(agency_id: str):
    """Removes all files with the ending temp_cache.csv in the
    source data directory"""
    source_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    dir = os.path.join(
        source_dir,
        'data',
        f"state_v3_{agency_id}"
    )
    for path in os.listdir(dir):
        if path.endswith('_temp_cache.csv'):
            os.remove(os.path.join(dir, path))

def get_cache_path(agency_id: str, d: date, start_time, end_time, route_id) -> str:
    validate_agency_route_path_attributes(agency_id, route_id)
    return os.path.join(
        get_state_cache_dir(agency_id),
        f"{str(d)}/state_{agency_id}_{route_id}_{int(start_time)}_{int(end_time)}.csv",
    )

# Properties of each vehicle as stored by opentransit-collector,
# used for writing and reading chunk states to and from CSV files
vehicle_keys = ['timestamp', 'vehicleId', 'latitude', 'longitude', 'directionId', 'secsSinceReport']

def write_csv_header(path):
    with open(path, 'w+') as chunk_out:
        chunk_out.writelines([','.join(vehicle_keys) + '\n'])

def append_route_csv_lines_to_temp_cache(agency_id, route_id, csv_lines):
    """Appends vehicle location information to a CSV for the given route in the given agency.
    Creates a new file if one does not exist."""
    if len(csv_lines) == 0:
        return

    path = get_route_temp_cache_path(agency_id, route_id)

    if not os.path.exists(path):
        write_csv_header(path)

    with open(path, 'a') as chunk_out:
        chunk_out.writelines(csv_lines)
