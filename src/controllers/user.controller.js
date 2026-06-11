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
    console.error("Get full profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user profile.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const profile = await UserModel.updateProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
      data: { user: profile },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Something went wrong while updating profile.",
    });
  }
};

module.exports = {
  getFullProfile,
  updateProfile,
};