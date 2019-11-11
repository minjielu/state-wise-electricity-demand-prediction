queue()
    .defer(d3.json, "/donorschoose/electricity_prediction")
    .defer(d3.json, "static/geojson/merged_states.json")
    .await(makeGraphs);

function temperatures(group, keys) {
  return {
    all: function() {
      return [{
        key: keys[0],
        value: group.value().temps_yesterday
      },
      {
        key: keys[1],
        value: group.value().temps_today
      }];
    }
  };
};

function totalIncrease(demand, pred, last10pm, cur10pm, next10pm) {
  return {
    value: function() {
      var last_peak = 0,
          next_peak = 0,
          i,
          d = demand.all(), // All the hourly demands
          mean_demand = 0,
          sst = 0,
          ssr = 0;

      // Calculate the mean_demand within the time range.
      for(i = 0; i < d.length; i++) {
        mean_demand += d[i].value;
      }
      mean_demand /= d.length;
      for(i = 0; i < d.length; i++) {
        if(d[i].key >= last10pm && d[i].key < cur10pm) {
          last_peak = Math.max(last_peak, d[i].value);
        }
        if(d[i].key < cur10pm) {
          // The total sum of squares.
          sst += Math.pow(d[i].value-mean_demand, 2);
        }
      }
      var p = pred.all(); // All the hourly predictions
      for(i = 0; i < p.length; i++) {
        if(p[i].key >= cur10pm && p[i].key < next10pm) {
          next_peak = Math.max(next_peak, p[i].value);
        }
        if(p[i].key < cur10pm) {
          // The total residual sum of squares.
          ssr += Math.pow(p[i].value-d[i].value, 2);
        }
      }
      var r2_score = 1-ssr/sst;
      console.log(r2_score)
      return {last_peak: last_peak, next_peak: next_peak, r2_score: r2_score};
    }
  };
};

function makeGraphs(error, elecJson, statesJson) {
	//Clean projectsJson data
	var elecPredProjects = elecJson;

	var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	elecPredProjects.forEach(function(d) {
		d["datetime"] = dateFormat.parse(d["datetime"]);
		d["usage"] = +d["usage"];
    d["prediction"] = +d["prediction"];
    d["net_gen"] = +d["net_gen"];
	});


	//Create a Crossfilter instance
	var ndx = crossfilter(elecPredProjects);

	//Define Dimensions
	var datetimeDim = ndx.dimension(function(d) { return d["datetime"]; });
	var regionDim = ndx.dimension(function(d) { return d["region"]; });

  //Create three line charts for the true demand, prediction and net generation.
  //True demand.

  //Predictions.
  var hourlyPred = datetimeDim.group().reduceSum(function(d) {
    return d["prediction"];
  });

  //Net generations.
  var hourlyGen = datetimeDim.group().reduceSum(function(d) {
    return d["net_gen"];
  });

  //Demands.
  var hourlyDemand = datetimeDim.group().reduceSum(function(d) {
    return d["usage"];
  });

	//Define values (to be used in charts)
	var minDatetime = datetimeDim.bottom(1)[0]["datetime"];
  //var lastDate = dateDim.top(2)[1]["date_posted"];
	var maxDatetime = datetimeDim.top(1)[0]["datetime"];
  var curDatetime = new Date(2019,9,28,0,0,0);
  //Determine the last 10pm that is earlier than the current time.
  var cur10pm = new Date(curDatetime.getTime());
  console.log(curDatetime);
  cur10pm.setHours(22);
  if(cur10pm > curDatetime) {
    cur10pm.setDate(cur10pm.getDate()-1);
  }

  //The range after last10pm before cur10pm will be used to decide the last peak.
  var last10pm = new Date(cur10pm.getTime());
  last10pm.setDate(last10pm.getDate()-1);

  //The range after cur10pm before next10pm will be used to decide the next peak.
  var next10pm = new Date(cur10pm.getTime());
  next10pm.setDate(next10pm.getDate()+1);


  var increaseByRegion = regionDim.group().reduce(
    function(p,v) {
      if(v.datetime >= last10pm && v.datetime < cur10pm) {
        p.last_peak = Math.max(p.last_peak, v.usage);
      }
      if(v.datetime >= cur10pm && v.datetime < next10pm) {
        p.next_peak = Math.max(p.next_peak, v.prediction);
      }
      return p;
    },
    function(p,v) {
      p.last_peak = 0;
      p.next_peak = 0;
      return p;
    },
    function() {
      return {
        last_peak: 0,
        next_peak: 0
      };
    }
	);

  //var all = ndx.groupAll();
  var all = ndx.groupAll().reduce(
    function (p,v) {
      if(v.datetime >= last10pm && v.datetime <= cur10pm) {
        var temps = v.temperatures.split(",,");
        //Insert temperatures into the boxplot for yesterday.
        temps.forEach(temp => p.temps_yesterday.splice(d3.bisectLeft(p.temps_yesterday, parseFloat(temp)),0,parseFloat(temp)));
      }
      if(v.datetime >= cur10pm && v.datetime <= next10pm) {
        var temps = v.temperatures.split(",,");
        //Insert temperatures into the boxplot for yesterday.
        temps.forEach(temp => p.temps_today.splice(d3.bisectLeft(p.temps_today, parseFloat(temp)),0,parseFloat(temp)));
      }
      return p;
    },
    function (p,v) {
      if(v.datetime >= last10pm && v.datetime <= cur10pm) {
        var temps = v.temperatures.split(",,");
        //Insert temperatures into the boxplot for yesterday.
        temps.forEach(temp => p.temps_yesterday.splice(d3.bisectLeft(p.temps_yesterday, parseFloat(temp)),1));
      }
      if(v.datetime >= cur10pm && v.datetime <= next10pm) {
        var temps = v.temperatures.split(",,");
        //Insert temperatures into the boxplot for yesterday.
        temps.forEach(temp => p.temps_today.splice(d3.bisectLeft(p.temps_today, parseFloat(temp)),1));
      }
      return p;
    },
    function () {
      return {
        temps_yesterday: [],
        temps_today: [],
      };
    }
  );

  //Charts

  var timeChart = dc.compositeChart("#time-chart");
	var usChart = dc.geoChoroplethChart("#us-chart");
	var numberProjectsND = dc.numberDisplay("#number-projects-nd");
  var tempsChart = dc.boxPlot("#temps-box-chart");
	var totalDonationsND = dc.numberDisplay("#total-donations-nd");
  var increaseND = dc.numberDisplay("#percentage-increase-nd");


  tempsChart
    .width(300)
    .height(138)
    .dimension(ndx)
    .margins({top: 10, right: 50, bottom: 30, left: 40})
    .group(temperatures(all, ["Today", "Tomorrow"]))
    .boxWidth(20)
    .elasticY(true)
    .elasticX(true)
    .yAxisLabel("Fahrenheit");

  tempsChart.yAxis().ticks(5);

	numberProjectsND
    .valueAccessor(function(d){return d.r2_score; })
		.group(totalIncrease(hourlyDemand, hourlyPred, last10pm, cur10pm, next10pm))
    .formatNumber(d3.format(".3f"));

	totalDonationsND
		.valueAccessor(function(d){return d.next_peak; })
		.group(totalIncrease(hourlyDemand, hourlyPred, last10pm, cur10pm, next10pm))
		.formatNumber(d3.format(".3s"));

  increaseND
		.valueAccessor(function(d){return (d.next_peak-d.last_peak)/d.last_peak; })
		.group(totalIncrease(hourlyDemand, hourlyPred, last10pm, cur10pm, next10pm))
		.formatNumber(d3.format("+.1%"));

  var demandChart = dc.lineChart(timeChart)
    .dimension(datetimeDim)
    .group(hourlyDemand, "Demand")
    .colors("#1E90FF")
    .defined(function(d,i) {
      if(d.x > curDatetime) {
        return false;
      }
      else {
        return true;
      }
    });

  var genChart = dc.lineChart(timeChart)
    .dimension(datetimeDim)
    .group(hourlyGen, "Net generation")
    .colors("#7CFC00")
    .defined(function(d,i) {
      if(d.x > curDatetime) {
        return false;
      }
      else {
        return true;
      }
    });

  var predChart = dc.lineChart(timeChart)
    .dimension(datetimeDim)
    .colors("#FF0000")
    .group(hourlyPred, "Prediction")
    .dashStyle([1,2]);

  timeChart
    .width(860)
    .height(300)
    .margins({top: 10, right: 50, bottom: 30, left: 50})
    .x(d3.time.scale().domain([minDatetime, maxDatetime]))
    .transitionDuration(500)
    .elasticY(true)
    .legend(dc.legend().x(300).y(230).itemWidth(100).gap(5).horizontal(true))
    .xAxisLabel("Date")
    .yAxisLabel("Megawatthours")
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .compose([demandChart,genChart,predChart])
    .brushOn(false);

  timeChart.yAxis().ticks(5);
  timeChart.xAxis().ticks(d3.time.days,1).tickFormat(d3.time.format("%b %d"));
  /*
  timeChart.on('postRender', function() {
    var tmp = d3.select("#_0").select("line");
    alert(tmp);
  });
  */




  /*
	timeChart
		.width(600)
		.height(160)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.dimension(datetimeDim)
		.group(hourlyDemand)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDatetime, maxDatetime]))
		.elasticY(true)
		.xAxisLabel("Year")
		.yAxis().ticks(4);
  */

  //var max_state = 1;
	usChart.width(1000)
		.height(330)
		.dimension(regionDim)
		.group(increaseByRegion)
    .valueAccessor(function(d,i) {
      var v = d.value;
      return v.last_peak != 0? (v.next_peak-v.last_peak)/v.last_peak : 0;
    })
		.colors(["#1E90FF", "#FF0000", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#B22222"]) // "#C4E4FF", "#B22222", "#FF0000" Four and five replaced from "#6BBAFF", "#51AEFF"
    .colorAccessor(function(d,i) {
      return d*20;
    })
		//.colorDomain([0, max_state])
		.overlayGeoJson(statesJson["features"], "state", function (d) { // The layer name is kept state so other javascript can still find the element.
			return d.properties.name;
		})
		.projection(d3.geo.albersUsa()
    				.scale(600)
    				.translate([340, 150]))
		.title(function (p) {
			return "State: " + p["key"]
					+ "\n"
					+ "Total Donations: " + Math.round(p["value"]) + " $";
		});

  dc.renderAll();

};
