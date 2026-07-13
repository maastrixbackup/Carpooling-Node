function calculateKmPrice(distanceMeters, pricePerKm, seats = 1) {
  const distanceKm = Number(distanceMeters) / 1000;
  const total = distanceKm * Number(pricePerKm) * Number(seats);

  return Number(total.toFixed(2));
}

module.exports = {
  calculateKmPrice,
};