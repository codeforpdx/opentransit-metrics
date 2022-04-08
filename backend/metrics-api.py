import os
from urllib import response
from flask import Flask, send_from_directory, Response, send_file, make_response
from flask_cors import CORS
import json
from models import schema, config, util, routeconfig, arrival_history, precomputed_stats
from flask_graphql import GraphQLView
import datetime
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
    for a particular route on a date (or a range of dates)
    -----
    next step is to create a frontend interface to capture the
    route and date and feed that information into the arrival_history.save_date_for_user_download()
    function below
    '''
    agency = config.get_agency('trimet')
    date_of_interest = datetime.datetime.strptime('2022-03-10','%Y-%m-%d').date()

    start_time_str = '00:00:00'
    end_time_str = '15:00:00'
    route_id = '4'
    direction_id = '1'

    history = arrival_history.get_by_date(agency_id=agency.id, route_id=route_id, d=date_of_interest, version=arrival_history.DefaultVersion)
    
    raw_arrival_df = history.get_data_frame(direction_id=direction_id
                                            ,start_time=util.get_timestamp_or_none(date_of_interest, start_time_str, agency.tz)
                                            ,end_time=util.get_timestamp_or_none(date_of_interest, end_time_str, agency.tz)
                                            )
    # ("VID", "TIME", "DEPARTURE_TIME", "SID", "DID", "DIST", "TRIP")
    rename_dict = {'TIME':'arrival_time_unix','SID':'stop_id'
                    ,'DEPARTURE_TIME':'departure_time_unix'
                    ,'DIST':'distance','TRIP':'trip_id'
                    ,'DID':'direction_id', 'VID':'vehicle_id'}

    arrival_df = raw_arrival_df.rename(columns=rename_dict).copy()

    arrival_df['route_id'] = route_id
    arrival_df['agency'] = agency.id
    arrival_df['date'] = date_of_interest.strftime('%Y-%m-%d')

    ## convert unix timestamp to datetime string
    arrival_df['arrival_time'] = arrival_df['arrival_time_unix'].apply(lambda x: datetime.datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M:%S'))
    arrival_df['departure_time'] = arrival_df['departure_time_unix'].apply(lambda x: datetime.datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M:%S'))

    arrival_csv_object = arrival_df.to_csv(index=False)

    response = make_response(arrival_csv_object)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', 'attachment', filename=f"arrivals_{route_id}_{direction_id}_{date_of_interest.strftime('%Y%m%d')}.csv")

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
