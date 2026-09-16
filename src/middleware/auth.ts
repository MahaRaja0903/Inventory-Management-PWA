import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/secrets";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "Admin" | "Employee";
    profileImage?: string;
  };
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access token is missing or invalid" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      profileImage: decoded.profileImage,
    };
    next();
  } catch (err: any) {
    // An expired or malformed token is a failure to authenticate, so it answers 401.
    // It used to answer 403, which the client treats as a permission error rather than
    // a dead session — so an expired login showed errors on every screen instead of
    // returning the user to the sign-in page.
    const expired = err?.name === "TokenExpiredError";
    res.status(401).json({
      message: expired ? "Session expired. Please sign in again." : "Token is invalid",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
    return;
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized. Authentication is required" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: `Access denied. Requires role: ${allowedRoles.join(" or ")}` });
      return;
    }

    next();
  };
}

export const requireAdmin = authorizeRoles("Admin");
export const requireEmployeeOrAdmin = authorizeRoles("Admin", "Employee");
