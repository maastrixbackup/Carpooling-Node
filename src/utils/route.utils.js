const axios = require("axios");

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
      index: points.length,
    });
  }

  return points;
}

async function getDrivingRoutes({ sourceLat, sourceLng, destinationLat, destinationLng }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  const url = "https://maps.googleapis.com/maps/api/directions/json";

  const { data } = await axios.get(url, {
    params: {
      origin: `${sourceLat},${sourceLng}`,
      destination: `${destinationLat},${destinationLng}`,
      mode: "driving",
      alternatives: true,
      key: apiKey,
    },
  });

  if (data.status !== "OK") {
    throw new Error(data.error_message || data.status || "Unable to fetch route");
  }

  return data.routes.map((route, index) => {
    const leg = route.legs?.[0];
    const polyline = route.overview_polyline?.points;

    return {
      route_index: index,
      summary: route.summary || `Route ${index + 1}`,
      polyline,
      // route_points: decodePolyline(polyline),
      route_points: "",
      distance_meters: leg?.distance?.value || 0,
      duration_seconds: leg?.duration?.value || 0,
      distance_text: leg?.distance?.text || "",
      duration_text: leg?.duration?.text || "",
    };
  });
}

module.exports = {
  decodePolyline,
  getDrivingRoutes,
};