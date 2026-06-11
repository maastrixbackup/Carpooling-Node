const ReviewModel = {
  async create(
    supabase,
    {
      rideId,
      bookingId,
      reviewerId,
      driverId,
      rating,
      review,
    },
  ) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .insert({
        ride_id: rideId,
        booking_id: bookingId,
        reviewer_id: reviewerId,
        driver_id: driverId,
        rating,
        review: review || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    return data;
  },

  async findById(supabase, id) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findByBooking(supabase, bookingId) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error) throw error;

    return data || null;
  },

  async findByDriver(supabase, driverId) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data?.length) return [];

    const reviewerIds = [...new Set(data.map((item) => item.reviewer_id))];

    const { data: reviewers, error: reviewerError } = await supabase
      .from("user_details")
      .select("id, full_name, profile_picture")
      .in("id", reviewerIds);

    if (reviewerError) throw reviewerError;

    const reviewerMap = (reviewers || []).reduce((map, user) => {
      map[String(user.id)] = user;
      return map;
    }, {});

    return data.map((review) => {
      const reviewer = reviewerMap[String(review.reviewer_id)];

      return {
        ...review,
        reviewer_name: reviewer?.full_name || "Passenger",
        reviewer_profile_picture: reviewer?.profile_picture || null,
      };
    });
  },

  async getDriverStats(supabase, driverId) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .select("rating")
      .eq("driver_id", driverId);

    if (error) throw error;

    const totalReviews = data?.length || 0;

    if (totalReviews === 0) {
      return {
        total_reviews: 0,
        average_rating: 0,
      };
    }

    const totalRating = data.reduce((sum, item) => {
      return sum + Number(item.rating || 0);
    }, 0);

    return {
      total_reviews: totalReviews,
      average_rating: Number((totalRating / totalReviews).toFixed(1)),
    };
  },

  async hasReviewed(supabase, bookingId) {
    const { data, error } = await supabase
      .from("ride_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  },
};

module.exports = ReviewModel;