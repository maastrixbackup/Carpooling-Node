const HomeModel = require("../../models/bootstrap/home.model");

const getHomeBootstrap = async (req, res) => {
  try {
    const { source, destination, ride_date, seats } = req.query;

    const [stats, upcomingBooking, popularRoutes, availableRides] =
      await Promise.all([
        HomeModel.getUserStats(req.user.id),
        HomeModel.getUpcomingBooking(req.user.id),
        HomeModel.getPopularRoutes(),
        HomeModel.getAvailableRides({
          source,
          destination,
          rideDate: ride_date,
          seats,
        }),
      ]);

    return res.status(200).json({
      success: true,
      message: "Home data fetched successfully.",
      data: {
        user: req.user,
        stats,
        upcoming_booking: upcomingBooking,
        popular_routes: popularRoutes,
        available_rides: availableRides,
      },
    });
  } catch (error) {
    console.error("Home bootstrap error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching home data.",
    });
  }
};

module.exports = {
  getHomeBootstrap,
};