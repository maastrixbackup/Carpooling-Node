const AuthModel = require("../models/auth.model");
const UserModel = require("../models/user.model");
const { logError } = require("../utils/logger");

const signup = async (req, res) => {
  try {
    const { name, full_name, email, phone, password } = req.body;
    const displayName = full_name || name;
    if (!displayName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const phoneExists = await UserModel.phoneExists(phone);

    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: "User with this phone number already exists.",
      });
    }

    const authData = await AuthModel.signUp({
      fullName: displayName,
      email,
      phone,
      password,
      role: "passenger",
    });

    const userId = authData.user?.id;

    const user = userId
      ? await UserModel.findFullProfileById(userId)
      : authData.user;

    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      data: {
        user,
        access_token: authData.session?.access_token || null,
        refresh_token: authData.session?.refresh_token || null,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    logError("Signup", error);
    const message =
      error?.message === "User already registered"
        ? "User with this email already exists."
        : error?.message || "Something went wrong during signup.";

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }
    const authData = await AuthModel.login({
      email,
      password,
    });

    const userId = authData.user?.id;

    const user = userId
      ? await UserModel.findFullProfileById(userId)
      : authData.user;

    if (user?.status && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user,
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    logError("Login", error)
    return res.status(401).json({
      success: false,
      message: error?.message || "Invalid email or password.",
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await UserModel.findFullProfileById(req.user.id);

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user details.",
    });
  }
};

const logout = async (req, res) => {
  try {
    await AuthModel.logout(req.accessToken);
    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    logError("Logout Error", error)
    console.error("[ERROR] Logout:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to logout.",
    });
  }
};

const refreshSession = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const authData = await AuthModel.refreshSession(refresh_token);

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully.",
      data: {
        session: authData.session,
        user: authData.user,
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
      },
    });
  } catch (error) {
    console.error("Refresh session error:", error);

    return res.status(401).json({
      success: false,
      message: error?.message || "Unable to refresh session.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    await AuthModel.resetPassword(email);

    return res.status(200).json({
      success: true,
      message: "Password reset link sent successfully.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Unable to send password reset link.",
    });
  }
};

module.exports = {
  signup,
  login,
  me,
  logout,
  refreshSession,
  forgotPassword,
};
