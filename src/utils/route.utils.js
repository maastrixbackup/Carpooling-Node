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

// async function getDrivingRoutes({ sourceLat, sourceLng, destinationLat, destinationLng }) {
//   const apiKey = process.env.GOOGLE_MAPS_API_KEY;

//   if (!apiKey) {
//     throw new Error("GOOGLE_MAPS_API_KEY is missing");
//   }

//   const url = "https://maps.googleapis.com/maps/api/directions/json";

//   const { data } = await axios.get(url, {
//     params: {
//       origin: `${sourceLat},${sourceLng}`,
//       destination: `${destinationLat},${destinationLng}`,
//       mode: "driving",
//       alternatives: true,
//       key: apiKey,
//     },
//   });

//   if (data.status !== "OK") {
//     throw new Error(data.error_message || data.status || "Unable to fetch route");
//   }

//   return data.routes.map((route, index) => {
//     const leg = route.legs?.[0];
//     const polyline = route.overview_polyline?.points;

//     return {
//       route_index: index,
//       summary: route.summary || `Route ${index + 1}`,
//       polyline,
//       // route_points: decodePolyline(polyline),
//       route_points: "",
//       distance_meters: leg?.distance?.value || 0,
//       duration_seconds: leg?.duration?.value || 0,
//       distance_text: leg?.distance?.text || "",
//       duration_text: leg?.duration?.text || "",
//     };
//   });
// }

async function getDrivingRoutes({ sourceLat, sourceLng, destinationLat, destinationLng }) {
  // No API key verification needed!

  // OSRM Public Demo Server URL
  // Format requirement: /driving/{sourceLng},{sourceLat};{destinationLng},{destinationLat}
  const url = `http://router.project-osrm.org/route/v1/driving/${sourceLng},${sourceLat};${destinationLng},${destinationLat}`;

  try {
    const { data } = await axios.get(url, {
      params: {
        overview: "full",       // Returns the complete geometry geometry path
        geometries: "polyline", // 🌟 Key: Tells OSRM to encode the path exactly like Google's polyline
        alternatives: "true",   // Requests alternative paths just like Google's alternatives: true
      },
    });

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || "Unable to fetch route from OSRM");
    }

    return data.routes.map((route, index) => {
      // OSRM uses meters and seconds natively
      const distanceMeters = Math.round(route.distance || 0);
      const durationSeconds = Math.round(route.duration || 0);

      // Create readable text variations to match Google's format (e.g., "12.5 km", "24 mins")
      const distanceKm = (distanceMeters / 1000).toFixed(1);
      const durationMins = Math.round(durationSeconds / 60);

      return {
        route_index: index,
        // OSRM builds route summary descriptions from major intersecting street names
        summary: route.legs?.[0]?.summary || route.summary || `Route ${index + 1}`,
        polyline: route.geometry, // This is your standard Google-compatible encoded polyline string!
        route_points: "",         // Keep this consistent with your front-end schema
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        distance_text: `${distanceKm} km`,
        duration_text: durationMins > 60 
          ? `${Math.floor(durationMins / 60)} hr ${durationMins % 60} min` 
          : `${durationMins} mins`,
      };
    });

  } catch (error) {
    throw new Error(error.message || "Unable to fetch route");
  }
}

module.exports = {
  decodePolyline,
  getDrivingRoutes,
};