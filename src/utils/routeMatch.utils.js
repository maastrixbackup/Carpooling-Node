function getNearestRoutePoint(routePoints, lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  for (const point of routePoints || []) {
    const distance = getDistanceMeters(lat, lng, point.lat, point.lng);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return {
    point: nearest,
    distanceFromRoute: minDistance,
  };
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = value => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchPassengerRoute({
  routePoints,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
  maxDistanceFromRouteMeters = 1500,
}) {
  const pickupMatch = getNearestRoutePoint(routePoints, pickupLat, pickupLng);
  const dropMatch = getNearestRoutePoint(routePoints, dropLat, dropLng);

  if (!pickupMatch.point || !dropMatch.point) {
    return { matched: false, reason: "route_points_missing" };
  }

  if (pickupMatch.distanceFromRoute > maxDistanceFromRouteMeters) {
    return { matched: false, reason: "pickup_too_far_from_route" };
  }

  if (dropMatch.distanceFromRoute > maxDistanceFromRouteMeters) {
    return { matched: false, reason: "drop_too_far_from_route" };
  }

  const pickupDistance =
    pickupMatch.point.distance_from_start_meters || 0;

  const dropDistance =
    dropMatch.point.distance_from_start_meters || 0;

  if (pickupDistance >= dropDistance) {
    return { matched: false, reason: "invalid_direction" };
  }

  return {
    matched: true,
    pickupDistanceMeters: pickupDistance,
    dropDistanceMeters: dropDistance,
    bookingDistanceMeters: dropDistance - pickupDistance,
  };
}

module.exports = {
  matchPassengerRoute,
};