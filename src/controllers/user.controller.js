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
    const payload = {
      full_name: req.body.full_name,
      phone: req.body.phone,
    };

    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("user-documents")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from("user-documents")
        .getPublicUrl(filePath);

      payload.profile_picture = data.publicUrl;
    }

    const profile = await UserModel.updateProfile(req.user.id, payload);

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
      data: { user: profile },
    });
  } catch (error) {
    console.error("Update profile error:", {
      message: error?.message,
      details: error?.details,
      code: error?.code,
      stack: error?.stack,
    });

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