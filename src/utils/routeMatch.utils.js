function getDistanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function findNearestPointOnRoute(routePoints, targetPoint) {
  let nearest = null;

  routePoints.forEach((point, index) => {
    const distance = getDistanceMeters(
      { lat: Number(point.lat), lng: Number(point.lng) },
      targetPoint
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { index, distance, point };
    }
  });

  return nearest;
}

function isSubRouteMatch({
  routePoints,
  pickupPoint,
  dropPoint,
  radiusMeters = 1500,
}) {
  if (!Array.isArray(routePoints) || routePoints.length === 0) {
    return {
      matched: false,
      reason: "Route points missing",
    };
  }

  const pickupMatch = findNearestPointOnRoute(routePoints, pickupPoint);
  const dropMatch = findNearestPointOnRoute(routePoints, dropPoint);

  const matched =
    pickupMatch &&
    dropMatch &&
    pickupMatch.distance <= radiusMeters &&
    dropMatch.distance <= radiusMeters &&
    pickupMatch.index < dropMatch.index;

  return {
    matched,
    pickupMatch,
    dropMatch,
    reason: matched ? "Matched" : "Pickup/drop not on route or wrong direction",
  };
}

module.exports = {
  getDistanceMeters,
  findNearestPointOnRoute,
  isSubRouteMatch,
};