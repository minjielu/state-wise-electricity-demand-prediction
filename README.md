# Electricity Demand Prediction
**Minjie Lu**

## 1. Objective
The prediction can be used by the electricity authorities to make better resource schedule, for example, to decide whether to turn on a large plant. Better schedule can avoid the waste caused by long range transmission, more importantly, avoid large scale power outage when the demand becomes much higher than the supply.

## 2. Data
The hourly electricity operation data are obtained through the API provided by the Energy Information Administration (EIA) website.

```
http://api.eia.gov/series/?api_key={}&series_id={}&start={}&end={}
```
By specifying the API key, series id, start date and end date, the desired time series within the time range can be downloaded. Series id "EBA.TEX-ALL.NG.HL" stands for net generations of Texas. "TEX" can be replaced by the names of other regions. "NG" can be replaced by "D" for demands.

Historic weather data are obtained through the [National Centers for Environmental Information (NOAA) website](https://www.ncdc.noaa.gov/cdo-web/datatools/lcd). To get historic data for a weather station, a request needs to be submitted.

Weather forecast data are scraped either from the [NOAA website](https://forecast.weather.gov/MapClick.php?lat=29.77&lon=-95.39#.XcnsepJKhTY) or [weather.com](https://weather.com/weather/hourbyhour/l/110a124808308e4fc03ee2b75754a7e06e9334b6d23d6fa317f1bb84b5f8a65e)

## 3. Methods

### a. XGBoost
**Features:**

Time features: 24 hours, Weekday, Month. These features can decide whether lights are on, factories are running.

Exponentially smoothed temperatures: This is motivated from the fact that electricity demands are smooth but temperatures can fluctuate suddenly.

**Hyperparameters:**

**Post-hoc correction:**
