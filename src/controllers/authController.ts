import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Settings } from "../models/Settings";

const JWT_SECRET = process.env.JWT_SECRET || "aquarius_tattoo_studio_secret_key_13579";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "aquarius_tattoo_studio_refresh_key_24680";

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, latitude, longitude } = req.body;

  if (!email || !password) {
    console.warn("[Auth] Login rejected: missing email or password");
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.warn(`[Auth] Login failed: User not found for email: ${email.toLowerCase()}`);
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (user.status === "Inactive") {
      console.warn(`[Auth] Login blocked: account is Inactive for user: ${user.email}`);
      res.status(403).json({ message: "Your account is deactivated. Contact Admin." });
      return;
    }

    // Geofencing verification for employees
    if (user.role === "Employee") {
      const systemSettings = await Settings.get();
      if (systemSettings && systemSettings.geofenceEnabled) {
        const targetLat = systemSettings.geofenceLatitude;
        const targetLon = systemSettings.geofenceLongitude;

        if (targetLat !== undefined && targetLon !== undefined && targetLat !== 0 && targetLon !== 0) {
          if (latitude === undefined || longitude === undefined) {
            console.warn(`[Auth] Employee login rejected: geofencing enabled but coordinates missing.`);
            res.status(400).json({ message: "Location permission is required for Employee login. Please enable location services on your device." });
            return;
          }

          const distance = getDistanceInMeters(
            Number(latitude),
            Number(longitude),
            Number(targetLat),
            Number(targetLon)
          );

          if (distance > 5) {
            console.warn(`[Auth] Employee login blocked: out of geofence bounds. Distance: ${distance.toFixed(2)} meters.`);
            res.status(403).json({
              message: `Access denied. You must be within 5 meters of the studio to log in. (Currently ${distance.toFixed(1)} meters away)`
            });
            return;
          }
        }
      }
    }

    // Compare hashed password
    const isMatched = bcrypt.compareSync(password, user.password || "");
    if (!isMatched) {
      console.warn(`[Auth] Login failed: password mismatch for user: ${user.email}`);
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate accessToken
    const accessToken = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage },
      JWT_SECRET,
      { expiresIn: "1d" } // 1 day remember duration or expiration
    );

    // Generate refreshToken
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        profileImage: user.profileImage,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error("[Auth] Login controller error encountered:", error);
    res.status(500).json({ message: error.message || "Server authentication error" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Client-side discards token, we send confirmation
  res.status(200).json({ message: "Logout successful, tokens invalidated." });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (!user || user.status === "Inactive") {
      res.status(401).json({ message: "User not found or suspended" });
      return;
    }

    const accessToken = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const nextRefreshToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      accessToken,
      refreshToken: nextRefreshToken
    });
  } catch (error) {
    res.status(403).json({ message: "Expired or invalid refresh token" });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const reqUser = (req as any).user;
  if (!reqUser) {
    res.status(401).json({ message: "Access unauthorized" });
    return;
  }

  try {
    const user = await User.findById(reqUser.id);
    if (!user) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve profile data" });
  }
}
