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
import aiohttp
import asyncio
import functools

# Properties of each vehicle as stored by opentransit-collector,
# used for writing and reading chunk states to and from CSV files
vehicle_keys = ['timestamp','vehicleId', 'latitude', 'longitude']

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
                },
                float_precision='high', # keep precision for rounding lat/lon
            ) \
            .rename(columns={
                'latitude': 'LAT',
                'longitude': 'LON',
                'vehicleId': 'VID',
                'timestamp': 'TIME'
            }) \
            .reindex(['TIME', 'VID', 'LAT', 'LON'], axis='columns')

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

async def fetch_state_object(session, s3_key, timestamp, route_csv_lines):

    s3_url = f"http://{config.s3_bucket}.s3.amazonaws.com/{s3_key}"

    async with session.get(s3_url) as r:
        print(s3_url)

        if r.status == 404:
            raise FileNotFoundError(f"{s3_url} not found")
        if r.status == 403:
            raise FileNotFoundError(f"{s3_url} not found or access denied")

        text = await r.text()

        if r.status != 200:
            raise Exception(f"Error fetching {s3_url}: HTTP {r.status}: {text}")

        vehicles = json.loads(text)

        append_vehicles_to_csv(vehicles, timestamp, route_csv_lines)

def append_vehicles_to_csv(vehicles, timestamp, route_csv_lines):
    for vehicle in vehicles:
        route_id = vehicle['routeId']

        if route_id not in route_csv_lines:
            route_csv_lines[route_id] = []

        # adjust each observation time for the number of seconds old the GPS location was when the observation was recorded
        vehicle['timestamp'] = timestamp - vehicle.get('secsSinceReport', 0)

        route_csv_lines[route_id].append(','.join([
            str(vehicle.get(vehicle_key, ''))
            for vehicle_key in vehicle_keys
        ]) + '\n')

async def fetch_state_objects(s3_keys_and_timestamps, route_csv_lines):
    conn = aiohttp.TCPConnector(limit=8)
    async with aiohttp.ClientSession(connector=conn) as session:
        tasks = []
        for s3_key, timestamp in s3_keys_and_timestamps:
            task = asyncio.create_task(fetch_state_object(session, s3_key, timestamp, route_csv_lines))
            tasks.append(task)

        return await asyncio.gather(*tasks)

def get_s3_keys_and_timestamps_with_prefix(bucket, key_prefix, start_time, end_time):
    res = []
    for obj in bucket.objects.filter(Prefix=key_prefix):
        timestamp = get_key_timestamp(obj.key)
        if timestamp >= start_time and timestamp < end_time:
            res.append((obj.key, timestamp))
    return res

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

    remove_route_temp_cache(agency_id)
    route_temp_files = {}

    try:
        # cache state per route since that's how we need to access it to compute arrival times
        for route_id in route_ids:
            temp_cache_path = get_route_temp_cache_path(agency_id, route_id)

            route_temp_file = open(temp_cache_path, 'w+')

            route_temp_files[route_id] = route_temp_file

            # write CSV header
            route_temp_file.write(','.join(vehicle_keys) + '\n')

        s3_bucket = config.s3_bucket

        s3 = boto3.resource("s3")
        bucket = s3.Bucket(s3_bucket)

        for hour_prefix in hour_prefixes:
            print(hour_prefix)

            route_csv_lines = {}
            s3_keys_and_timestamps = get_s3_keys_and_timestamps_with_prefix(bucket, hour_prefix, start_time, end_time)

            loop = asyncio.get_event_loop()
            loop.run_until_complete(fetch_state_objects(s3_keys_and_timestamps, route_csv_lines))

            append_csv_lines_to_temp_files(route_csv_lines, route_temp_files)

        created_cache_dir = False

        for route_id in route_ids:
            cache_path = get_cache_path(agency_id, d, start_time, end_time, route_id)

            if not created_cache_dir:
                cache_dir = Path(cache_path).parent
                if not cache_dir.exists():
                    cache_dir.mkdir(parents = True, exist_ok = True)
                created_cache_dir = True

            route_temp_file = route_temp_files[route_id]

            temp_cache_path = route_temp_file.name

            route_temp_file.close()
            del route_temp_files[route_id]

            os.rename(temp_cache_path, cache_path)

            state.add(route_id, cache_path)
    finally:
        for route_id, f in route_temp_files.items():
            f.close()

    return state

def append_csv_lines_to_temp_files(route_csv_lines, route_temp_files):
    # the CSV lines are likely not in chronological order since state files are fetched
    # asynchronously, but it doesn't matter because they are sorted by CachedState.get_for_route
    # after adjusting for secsSinceReport
    for route_id, csv_lines in route_csv_lines.items():
        route_temp_file = route_temp_files.get(route_id, None)

        if route_temp_file is not None:
            route_temp_file.writelines(csv_lines)

def validate_agency_id(agency_id: str):
    if re.match('^[\w\-]+$', agency_id) is None:
        raise Exception(f"Invalid agency: {agency_id}")

def validate_agency_route_path_attributes(agency_id: str, route_id: str):
    validate_agency_id(agency_id)

    if re.match('^[\w\-]+$', route_id) is None:
        raise Exception(f"Invalid route id: {route_id}")

@functools.lru_cache()
def get_state_cache_dir(agency_id):
    validate_agency_id(agency_id)
    source_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    return os.path.join(
        source_dir,
        'data',
        f"state_v4_{agency_id}",
    )

def get_route_temp_cache_path(agency_id: str, route_id: str) -> str:
    validate_agency_route_path_attributes(agency_id, route_id)
    return os.path.join(
        get_state_cache_dir(agency_id),
        f"state_{agency_id}_{route_id}_temp_cache.csv",
    )

def remove_route_temp_cache(agency_id: str):
    """Removes all files with the ending temp_cache.csv in the
    source data directory"""
    dir = get_state_cache_dir(agency_id)
    for path in os.listdir(dir):
        if path.endswith('_temp_cache.csv'):
            os.remove(os.path.join(dir, path))

def get_cache_path(agency_id: str, d: date, start_time, end_time, route_id) -> str:
    validate_agency_route_path_attributes(agency_id, route_id)
    return os.path.join(
        get_state_cache_dir(agency_id),
        f"{str(d)}/state_{agency_id}_{route_id}_{int(start_time)}_{int(end_time)}.csv",
    )
