const UserModel = require("../models/user.model");


const getFullProfile = async (req, res) => {
  try {
    const user = await UserModel.findFullProfileById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully.",
      data: { user },
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user profile.",
    });
  }
};

module.exports = {
  getFullProfile,
};