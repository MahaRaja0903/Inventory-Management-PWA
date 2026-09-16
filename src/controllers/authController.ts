import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getFrappeDocs, frappeLogin, getFrappeDoc } from "../config/frappeClient";
import { toApp, toAppList } from "../config/fieldMap";
import { JWT_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../config/secrets";

const USER_DOCTYPE = "ATS User";

const ADMINISTRATOR_PROFILE = {
  _id: "Administrator",
  name: "Administrator",
  email: "Administrator",
  role: "Admin" as const,
  status: "Active",
};

function signTokens(user: any) {
  const accessToken = jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL } as jwt.SignOptions
  );

  const refreshToken = jwt.sign({ id: user._id, role: user.role }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

/**
 * Verify a password against the stored value.
 *
 * Stored passwords are bcrypt hashes, but this compared them to the submitted
 * password with `!==`, so no account created through the app could ever log in. The
 * plaintext branch is retained only for profiles that predate hashing, and those are
 * upgraded to a hash on their next successful login.
 */
function verifyPassword(stored: string | undefined, submitted: string): { ok: boolean; needsRehash: boolean } {
  if (!stored) return { ok: false, needsRehash: false };

  if (/^\$2[aby]\$/.test(stored)) {
    return { ok: bcrypt.compareSync(submitted, stored), needsRehash: false };
  }

  return { ok: stored === submitted, needsRehash: stored === submitted };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    res.status(400).json({ message: "Email/Username and password are required" });
    return;
  }

  try {
    const isValidFrappeLogin = await frappeLogin(loginId, password);

    // A username may be supplied instead of an email; resolve it where we can.
    let actualEmail = loginId;
    try {
      const frappeUsers = await getFrappeDocs("User", { username: loginId });
      if (frappeUsers.length > 0) {
        actualEmail = frappeUsers[0].email || frappeUsers[0].name;
      }
    } catch {
      // Not fatal — fall back to the supplied identifier.
    }

    const allUsers = toAppList(USER_DOCTYPE, await getFrappeDocs(USER_DOCTYPE));
    const candidates = [actualEmail, loginId].map((v) => String(v).toLowerCase());
    let user: any =
      allUsers.find((u: any) => candidates.includes(String(u.email || "").toLowerCase())) ||
      allUsers.find((u: any) => candidates.includes(String(u._id || "").toLowerCase())) ||
      null;

    if (isValidFrappeLogin && !user && String(loginId).toLowerCase() === "administrator") {
      user = { ...ADMINISTRATOR_PROFILE };
    } else if (!isValidFrappeLogin) {
      // Frappe rejected the credentials, so fall back to the ATS profile's own password.
      if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const { ok, needsRehash } = verifyPassword(user.password, password);
      if (!ok) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      if (needsRehash) {
        try {
          const { updateFrappeDoc } = await import("../config/frappeClient");
          await updateFrappeDoc(USER_DOCTYPE, user._id, {
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
          });
        } catch (error: any) {
          console.error("[auth] Failed to upgrade stored password to a hash:", error.message);
        }
      }
    }

    if (!user) {
      res.status(401).json({ message: "User profile not found." });
      return;
    }

    if (user.status === "Inactive") {
      res.status(403).json({ message: "Your account is deactivated. Contact Admin." });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user);

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[auth] Login controller error encountered:", error);
    res.status(500).json({ message: error.message || "Server authentication error" });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
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

    const user =
      decoded.id === "Administrator"
        ? { ...ADMINISTRATOR_PROFILE }
        : toApp<any>(USER_DOCTYPE, await getFrappeDoc(USER_DOCTYPE, decoded.id));

    if (!user || user.status === "Inactive") {
      res.status(401).json({ message: "User not found or suspended" });
      return;
    }

    const { accessToken, refreshToken } = signTokens(user);
    res.status(200).json({ accessToken, refreshToken });
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
    const user =
      reqUser.id === "Administrator"
        ? { ...ADMINISTRATOR_PROFILE }
        : toApp<any>(USER_DOCTYPE, await getFrappeDoc(USER_DOCTYPE, reqUser.id));

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
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve profile data" });
  }
}
