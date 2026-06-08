const bcrypt = require("bcryptjs");
const UserModel = require("../models/user.model");
const { generateAccessToken } = require("../utils/token");

const sanitizeUser = (user) => {
  const { password, otp, remember_token, ...safeUser } = user;
  return safeUser;
};

const signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
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

    const exists = await UserModel.emailOrPhoneExists(email, phone);

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User with this email or phone already exists.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.createUser({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = generateAccessToken(user);

    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      data: {
        user,
        access_token: token,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during signup.",
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

    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: sanitizeUser(user),
        access_token: token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login.",
    });
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User details fetched successfully.",
    data: {
      user: req.user,
    },
  });
};

const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
};

module.exports = {
  signup,
  login,
  me,
  logout,
};