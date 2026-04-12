import { User } from "@prisma/client";

const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

type TPayload = Partial<User>;

export function generateAccessToken(user: TPayload) {
  return jwt.sign(
    {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      employeeType: user.employeeType,
      phone: user.phone,
    },
    ACCESS_SECRET,
    { expiresIn: "1h" },
  ) as string;
}

export function generateRefreshToken(user: TPayload) {
  return jwt.sign(
    {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      employeeType: user.employeeType,
      phone: user.phone,
    },
    REFRESH_SECRET,
    { expiresIn: "30d" },
  ) as string;
}
