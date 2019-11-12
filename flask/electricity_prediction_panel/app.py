from flask import Flask
from flask import render_template
from pymongo import MongoClient
import json
import sys
from bson import json_util
from bson.json_util import dumps
from datetime import datetime, timedelta, date

app = Flask(__name__)

# Time range of the data we need.
now = datetime.now()
day = now.date()
day = datetime(2019,10,28)
start = day-timedelta(days=7)
end = day+timedelta(days=1)

MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017
DBS_NAME = 'donorschoose'
COLLECTION_NAME = 'electricity_prediction'
FIELDS = {'datetime': {'$lt': end, '$gte': start}}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/donorschoose/electricity_prediction")
def donorschoose_projects():
    connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
    collection = connection[DBS_NAME][COLLECTION_NAME]
    elec_data = collection.find(FIELDS, limit=10000)
    #projects = collection.find(projection=FIELDS)
    elec_json = []
    for d in elec_data:
        d['datetime'] = d['datetime'].strftime('%Y-%m-%d %H:%M:%S')
        elec_json.append(d)
    elec_json = json.dumps(elec_json, default=json_util.default)
    connection.close()
    return elec_json

if __name__ == "__main__":
    app.run(port=33507)
