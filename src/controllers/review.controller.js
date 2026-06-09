const ReviewModel = require("../models/review.model");
const BookingModel = require("../models/booking.model");

const createReview = async (req, res) => {
    try {
        const bookingId = req.body.booking_id || req.body.bookingId;
        const rating = req.body.rating;
        const review = req.body.review || null;


        if (!bookingId || !rating) {
            return res.status(400).json({
                success: false,
                message: "Booking ID and rating are required.",
            });
        }

        const ratingNumber = Number(rating);

        if (Number.isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5.",
            });
        }

        const booking = await BookingModel.findById(bookingId, req.user.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (Number(booking.passenger_id) !== Number(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You can review only your own bookings.",
            });
        }

        if (booking.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Review can be submitted only after ride completion.",
            });
        }

        const existingReview = await ReviewModel.findByBooking(bookingId);

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "Review already submitted.",
            });
        }

        const createdReview = await ReviewModel.create({
            rideId: booking.ride_id,
            bookingId: booking.id,
            reviewerId: req.user.id,
            driverId: booking.driver_id,
            rating: ratingNumber,
            review,
        });

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully.",
            data: {
                review: createdReview,
            },
        });
    } catch (error) {
        console.error("Create review error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while submitting review.",
        });
    }
};

const getDriverReviews = async (req, res) => {
    try {
        const driverId = req.params.driverId;

        const reviews = await ReviewModel.findByDriver(driverId);

        const stats = await ReviewModel.getDriverStats(driverId);

        return res.status(200).json({
            success: true,
            message: "Driver reviews fetched successfully.",
            data: {
                stats,
                reviews,
            },
        });
    } catch (error) {
        console.error("Driver reviews error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching reviews.",
        });
    }
};

module.exports = {
    createReview,
    getDriverReviews,
};
