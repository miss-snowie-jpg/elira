import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

// REGISTER
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "username, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await hash(password, 12);

    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password, googleLogin = false } = req.body;

    if (!email || (!password && !googleLogin)) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // FIX: If it is a google login, skip bcrypt verification entirely.
    // If it's a standard login, execute password validation.
    if (!googleLogin) {
      const passwordMatches = await compare(password, user.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }
    }

    const token = createToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// Fetch User
export const fetchUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("FETCH USER REQUEST");
    console.log("User ID:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findById(userId)
      .select("username email")
      .lean();

    console.log("USER FROM DATABASE:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    // IMPORTANT:
    // Only send plain JSON-safe values.
    return res.status(200).json({
      success: true,
      message: "User Found",
      username: user.username,
    });

  } catch (error) {
    console.error("FETCH USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user.",
      error: error.message,
    });
  }
};