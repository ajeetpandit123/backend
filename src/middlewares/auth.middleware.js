import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    // ✅ FIX: Correctly extract token (Bearer + space is important)
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); // 🔥 added space after Bearer

    // ❌ If no token → unauthorized
    if (!token) {
      throw new apiError(401, "Unauthorized request");
    }

    // ✅ Verify token using secret
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    // ❗ FIX: Store DB user in variable (previously you didn't store it)
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    // ❗ FIX: Check 'user' not 'User'
    if (!user) {
      throw new apiError(401, "Invalid Access Token");
    }

    // ❗ FIX: Assign correct user object to req.user
    req.user = user;

    next(); // move to next middleware/controller
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Access Token");
  }
});