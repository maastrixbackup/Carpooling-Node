const HomeModel = require("../../models/bootstrap/home.model");

const getHomeBootstrap = async (req, res) => {
  try {
    const { source, destination, ride_date, seats } = req.query;

    const [stats, upcomingBooking, popularRoutes, availableRides] =
      await Promise.all([
        HomeModel.getUserStats(req.supabase, req.user.id),
        HomeModel.getUpcomingBooking(req.supabase, req.user.id),
        HomeModel.getPopularRoutes(req.supabase),
        HomeModel.getAvailableRides(req.supabase, {
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
    console.error("[ERROR] Home bootstrap:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching home data.",
    });
  }
};

module.exports = {
  getHomeBootstrap,
};