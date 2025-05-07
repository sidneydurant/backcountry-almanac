# Backcountry Almanac

This is a (Vite/React) web app that uses Mapbox GL JS to create an interactive map of an area with custom layers for visualization. It uses DEM data of a small area around Lassen National Park downloaded from [the USGS](https://apps.nationalmap.gov/downloader/). This raw elevation data is parsed using [geotiff.js](https://github.com/geotiffjs/geotiff.js/), and then piped into custom WebGL shaders that form the basis of each layer.

NOTE: before this project, I had very little experience with Mapbox or React, and no experience with DEM data or WebGL. At the end of the day, this is a for-fun personal project.

Here is the map showing the elevation layer:

![A map of Lassen National Park, with a custom elevation layer rendered on top.](./img/elevation-screenshot.png)

Here is the map showing the aspect layer:

![A map of Lassen National Park, with a custom aspect layer rendered on top.](./img/aspect-screenshot.png)

Here is the map showing the slope angle layer:

![A map of Lassen National Park, with a custom slope angle layer rendered on top.](./img/slopeangle-screenshot.png)

The eventual goal is to show information about current conditions by creating layers that display Solar Exposure (boolean), Solar Irradiance (W/m<sup>2</sup>), and Insolation (Wh/m<sup>2</sup>) for a user-specified time. Solar Exposure is tricky because one needs to take into account shadows cast by surrounding terrain. Solar Irradiance and Insolation are dependent on this as well. These layers could be used to estimate when a refrozen slope may soften and offer good skiing, or when a slope covered in powder can be expected to warm up and start avalanching.

Longer term, integrating weather data could be interesting as well, to help account for the wind, cloud cover & temperature's impact on the snowpack.
