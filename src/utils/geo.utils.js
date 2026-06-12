const polyline = require("@mapbox/polyline");

function decodePolylineToLineString(encodedPolyline) {
  if (!encodedPolyline) return null;

  const points = polyline.decode(encodedPolyline);

  if (!points || points.length < 2) return null;

  const coordinates = points
    .map(([lat, lng]) => `${lng} ${lat}`)
    .join(",");

  return `LINESTRING(${coordinates})`;
}

module.exports = {
  decodePolylineToLineString,
};