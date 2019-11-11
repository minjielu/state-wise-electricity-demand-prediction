import json
import geojson
from functools import partial
import shapely.geometry
from shapely.geometry import Polygon
import shapely.ops

# reading into two geojson objects, in a GCS (WGS84)
with open('us-states.json') as geojson:
    poly_geojson = json.load(geojson)

elec_regios = {'NW':{'WA','OR','NV','MT','ID','WY','UT','CO'},
               'CAL':{'CA'},
               'SW':{'AZ','NM'},
               'CENT':{'ND','SD','NE','KS','OK'},
               'CAR':{'NC','SC'},
               'FLA':{'FL'},
               'MIDA':{'OH','PA','WV','VA','MD','DE','NJ'},
               'MIDW':{'MN','IA','MO','AR','LA','WI','IL','MI','IN'},
               'NE':{'VT','NH','MA','CT','RI','ME'},
               'NY':{'NY'},
               'SE':{'MS','AL','GA'},
               'TEN':{'KY','TN'}:,
               'TEX':{'TX'}}



# pulling out the polygons
for state in poly_geojson['features']:
    if state['properties']['name'] == 'AL':
        poly1 = shapely.geometry.asShape(state['geometry'])
    elif state['properties']['name'] == 'AK':
        poly2 = shapely.geometry.asShape(state['geometry'])

# checking to make sure they registered as polygons
print(poly1.geom_type)
print(poly2.geom_type)

# merging the polygons - they are feature collections, containing a point, a polyline, and a polygon - I extract the polygon
# for my purposes, they overlap, so merging produces a single polygon rather than a list of polygons
mergedPolygon = poly1.union(poly2)

# using geojson module to convert from WKT back into GeoJSON format
print(shapely.geometry.mapping(mergedPolygon))

# outputting the updated geojson file - for mapping/storage in its GCS format
with open('merged_states.json', 'w') as outfile:
   json.dump(mergedPolygon, outfile)
outfile.close()
