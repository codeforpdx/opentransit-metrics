import os
from urllib import response
from flask import Flask, send_from_directory, Response, send_file, make_response, request
from flask_cors import CORS
import json
from models import schema, config, util, routeconfig, arrival_history, precomputed_stats
from flask_graphql import GraphQLView
import datetime
import pytz
import pandas as pd
#import cProfile

"""
This is the app's main file!
"""

# configuration
DEBUG = os.environ.get('FLASK_DEBUG') == '1'

# Create the app
app = Flask(__name__, static_folder='../frontend/build')
CORS(app)

# Test endpoint
@app.route('/api/ping', methods=['GET'])
def ping():
    return "pong"

app.add_url_rule('/api/graphiql', view_func = GraphQLView.as_view('graphiql', schema = schema.metrics_api, graphiql = True))

graphql_view = GraphQLView.as_view('metrics_api', schema = schema.metrics_api, graphiql = False)

def graphql_wrapper():
    #pr = cProfile.Profile()
    #pr.enable()
    res = graphql_view()
    #pr.disable()
    #pr.dump_stats('graphql.pstats')
    return res

app.add_url_rule('/api/graphql', view_func = graphql_wrapper)

def make_error_response(params, error, status):
    data = {
        'params': params,
        'error': error,
    }
    return Response(json.dumps(data, indent=2), status=status, mimetype='application/json')

@app.route('/api/arrival_download', methods=['GET'])
def download_arrival_data():
    '''
    first step in letting users download arrival data
    based on the filters they have selected in the frontend
    '''

    args = request.args

    print(f"args.get('variables'): {args.get('variables')}")
    variables_dict = json.loads(args.get('variables'))

    agency_id = variables_dict.get('agencyId')
    agency_config = config.get_agency(agency_id)
    route_id =variables_dict.get('routeId')
    direction_id = variables_dict.get('directionId', None)
    start_time = variables_dict.get('startTime', None)
    end_time = variables_dict.get('endTime', None)

    arrival_df = pd.DataFrame()

    for date_str in variables_dict.get('dates'):

        date_of_interest = datetime.datetime.strptime(date_str,'%Y-%m-%d').date()

        if (start_time is not None and end_time is not None):
            start_time_param = util.get_timestamp_or_none(date_of_interest, start_time, agency_config.tz)
            end_time_param = util.get_timestamp_or_none(date_of_interest, end_time, agency_config.tz)
        else:
            start_time_param = None
            end_time_param = None
        try:
            history = arrival_history.get_by_date(agency_id=agency_id,
                                                route_id=route_id,
                                                d=date_of_interest,
                                                version=arrival_history.DefaultVersion)
            
            raw_arrival_df = history.get_data_frame(direction_id=direction_id,
                                                    start_time=start_time_param,
                                                    end_time=end_time_param
                                                    )

            #raw_arrival_df field names:("VID", "TIME", "DEPARTURE_TIME", "SID", "DID", "DIST", "TRIP")
            rename_dict = {'TIME':'arrival_time_unix',
                            'SID':'stop_id',
                            'DEPARTURE_TIME':'departure_time_unix',
                            'DIST':'calc_gps_distance_to_stop',
                            'TRIP':'trip_id',
                            'DID':'direction_id', 
                            'VID':'vehicle_id'}

            partial_arrival_df = raw_arrival_df.rename(columns=rename_dict).copy()
            partial_arrival_df['date'] = date_of_interest.strftime('%Y-%m-%d')
        
        except:
            partial_arrival_df = pd.DataFrame()

        if arrival_df.empty:
            arrival_df = partial_arrival_df
        else:
            arrival_df = arrival_df.append(partial_arrival_df)

    # add fields for user context
    arrival_df['route_id'] = route_id
    arrival_df['agency'] = agency_id
        

    ## convert unix timestamp to datetime then convert to agency timezone then format as string
    arrival_df['arrival_time'] = arrival_df['arrival_time_unix'].apply(lambda x: util.parse_unix_timestamp_to_datetime(x, agency_config.tz))
    arrival_df['departure_time'] = arrival_df['departure_time_unix'].apply(lambda x: util.parse_unix_timestamp_to_datetime(x, agency_config.tz))

    # rearrange columns and sort for user convenience
    arrival_df = arrival_df[['agency','date','route_id'
                            ,'direction_id','trip_id','vehicle_id'
                            ,'arrival_time','departure_time','stop_id'
                            ,'calc_gps_distance_to_stop', 'arrival_time_unix'
                            ,'departure_time_unix']]

    # I think it would be helpful to sort for users convenience
    # we can pick other columns to sort by if we want
    arrival_df_sorted = arrival_df.sort_values(
                        by=['agency','date','route_id'
                        ,'direction_id','trip_id','vehicle_id'
                        ,'arrival_time']).reset_index(drop=True)

    # convert to csv
    csv_buffer = arrival_df_sorted.to_csv(index=False)

    # create a response
    # TODO - can we zip this?
    response = make_response(csv_buffer)
    response.headers["Content-Disposition"] = "attachment; filename=arrival_data.csv"
    response.headers["Content-Type"] = "text/csv"

    return response

@app.route('/api/js_config', methods=['GET'])
def js_config():

    if DEBUG:
        config.load_agencies() # agency config may have changed on disk

    data = {
        'S3Bucket': config.s3_bucket,
        'ArrivalsVersion': arrival_history.DefaultVersion,
        'PrecomputedStatsVersion': precomputed_stats.DefaultVersion,
        'RoutesVersion': routeconfig.DefaultVersion,
        'Agencies': [
            {
                'id': agency.id,
                'timezoneId': agency.timezone_id,
                **agency.js_properties,
            } for agency in config.agencies
        ]
    }

    res = Response(f'var OpentransitConfig = {json.dumps(data)};', mimetype='text/javascript')
    if not DEBUG:
        res.headers['Cache-Control'] = 'max-age=10'
    return res

if os.environ.get('METRICS_ALL_IN_ONE') == '1':
    @app.route('/frontend/build/<path:path>')
    def frontend_build(path):
        return send_from_directory('../frontend/build', path)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def wildcard(path):
        return send_from_directory('../frontend/build', 'index.html')
else:
    @app.route('/')
    def root():
        return """<h2>Hello!</h2><p>This is the API server.<br /><br />Go to port 3000 to see the real app.</p>"""

if __name__ == '__main__':
    # Bind to PORT if defined, otherwise default to 5000.
    port = int(os.environ.get('PORT', 5000))
    app.run(use_reloader=True, threaded=True, host='0.0.0.0', port=port)
