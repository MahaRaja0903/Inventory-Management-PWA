import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getFrappeDocs, frappeLogin, getFrappeDoc } from "../config/frappeClient";

const JWT_SECRET = process.env.JWT_SECRET || "aquarius_tattoo_studio_secret_key_13579";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "aquarius_tattoo_studio_refresh_key_24680";

const USER_DOCTYPE = "ATS User";
const SETTINGS_DOCTYPE = "ATS Settings";

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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
  const { loginId, password, latitude, longitude } = req.body;

  if (!loginId || !password) {
    res.status(400).json({ message: "Email/Username and password are required" });
    return;
  }

  try {
    // 1. Try Frappe Native Login first (this handles 'Administrator' and other real users)
    const isValidFrappeLogin = await frappeLogin(loginId, password);

    // 1.5. Resolve username to email if necessary
    // If the user logs in with a username (like 'Owner'), find their real email from Frappe User doctype
    let actualEmail = loginId;
    try {
      const frappeUsers = await getFrappeDocs("User", { username: loginId });
      if (frappeUsers && frappeUsers.length > 0) {
        actualEmail = frappeUsers[0].email || frappeUsers[0].name;
      }
    } catch (e) {
      // Ignore errors here and just fallback to using loginId
    }

    // 2. Fetch User Profile from ATS User Doctype
    // Search for the user by resolved email first, then by name, then by original loginId
    let users = await getFrappeDocs(USER_DOCTYPE, { email: actualEmail });
    if (users.length === 0) {
       users = await getFrappeDocs(USER_DOCTYPE, { name: actualEmail });
    }
    if (users.length === 0 && actualEmail !== loginId) {
       users = await getFrappeDocs(USER_DOCTYPE, { email: loginId });
    }
    if (users.length === 0 && actualEmail !== loginId) {
       users = await getFrappeDocs(USER_DOCTYPE, { name: loginId });
    }
    let user = users.length > 0 ? users[0] : null;

    // Support Administrator fallback if they haven't created an ATS User for the Admin yet
    if (isValidFrappeLogin && !user && loginId.toLowerCase() === "administrator") {
      user = {
        name: "Administrator",
        email: "Administrator",
        role: "Admin",
        status: "Active",
        _id: "Administrator"
      };
    } else if (!isValidFrappeLogin && !user) {
      // If neither Frappe login worked nor an ATS User exists
      res.status(401).json({ message: "Invalid credentials" });
      return;
    } else if (!isValidFrappeLogin && user) {
       // If Frappe login failed but ATS User exists, we can optionally check the raw password field in ATS User if they didn't create a real Frappe user
       // Note: In production, they SHOULD be real Frappe users. For now, we fallback to raw check if needed, or just reject.
       if (user.password !== password) {
          res.status(401).json({ message: "Invalid credentials" });
          return;
       }
    }

    if (!user) {
       res.status(401).json({ message: "User profile not found." });
       return;
    }

    // Map Frappe 'name' to '_id' for frontend compatibility
    user._id = user.name || user._id;

    if (user.status === "Inactive") {
      res.status(403).json({ message: "Your account is deactivated. Contact Admin." });
      return;
    }



    // Generate accessToken
    const accessToken = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage },
      JWT_SECRET,
      { expiresIn: "1d" }
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
        name: user.name || user.email, // fallback if name is empty
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        profileImage: user.profileImage,
        createdAt: user.creation
      }
    });
  } catch (error: any) {
    console.error("[Auth] Login controller error encountered:", error);
    res.status(500).json({ message: error.message || "Server authentication error" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
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
    
    let user;
    if (decoded.id === "Administrator") {
      user = { _id: "Administrator", name: "Administrator", email: "Administrator", role: "Admin", status: "Active" };
    } else {
      user = await getFrappeDoc(USER_DOCTYPE, decoded.id);
      if (user) user._id = user.name;
    }

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
    let user;
    if (reqUser.id === "Administrator") {
       user = { _id: "Administrator", name: "Administrator", email: "Administrator", role: "Admin", status: "Active" };
    } else {
       user = await getFrappeDoc(USER_DOCTYPE, reqUser.id);
       if (user) user._id = user.name;
    }

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
      createdAt: user.creation,
      updatedAt: user.modified
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve profile data" });
  }
}
