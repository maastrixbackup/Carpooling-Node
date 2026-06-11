const { createUserSupabaseClient, supabaseAdmin } = require("../config/supabase");

const supabaseAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session.",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      metadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
    };

    req.supabase = createUserSupabaseClient(token);

    next();
  } catch (error) {
    console.error("Supabase auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = supabaseAuthMiddleware;