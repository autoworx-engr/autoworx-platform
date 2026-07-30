import jwt from "jsonwebtoken";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./lib/db";

import nextAxios from "./helpers/next-axios";
import { getUserByEmail } from "./actions/user/getUserById";
import { getTwoFactorConfirmationByUserId } from "./app/(auth)/login/actions/getTwoFactorConfirmationByUserId";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      role: string;
      companyId: number;
      employeeType: string;
      isSuperAdmin: boolean;
      hasCopilot: boolean;
    };
    accessToken: string;
    error?: "RefreshAccessTokenError";
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: number;
    employeeType: string;
    isSuperAdmin: boolean;
    accessToken: string;
    refreshToken?: string;
  }
}

const refreshAccessToken = async (token: JWT) => {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/auth/refresh-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshAccessToken: token.refreshToken,
        }),
      },
    );

    if (!response.ok) {
      throw response;
    }

    const responseToken = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    const { accessToken, refreshToken } = responseToken;

    if (!accessToken) {
      throw new Error("No access token returned from refresh endpoint");
    }

    const verifyToken = jwt.verify(
      accessToken,
      process.env.ACCESS_SECRET || "",
    ) as jwt.JwtPayload;

    const accessTokenExpires = (verifyToken?.exp ?? 0) * 1000;

    return {
      ...token,
      accessToken,
      refreshToken,
      accessTokenExpires,
    };
  } catch (err) {
    console.error("Error refreshing access token:", err);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        console.log("credentials", credentials);
        if (!credentials?.email || !credentials?.password) return null;
        const { data: existingUser } = await getUserByEmail(credentials.email);
        // 2FA CHECK
        if (existingUser?.twoFactorEnabled) {
          const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
            existingUser.id,
          );

          if (!twoFactorConfirmation) {
            return null; // REJECT: 2FA not completed
          }

          // CONSUME THE CONFIRMATION (One-time use)
          await db.twoFactorConfirmation.delete({
            where: { id: twoFactorConfirmation.id },
          });
        }
        const response = await nextAxios.post("/auth/login", {
          email: credentials.email,
          password: credentials.password,
        });
        const loggedInUser = response.data.data;
        return loggedInUser;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const verifyToken = jwt.verify(
          user.accessToken,
          process.env.ACCESS_SECRET || "",
        ) as jwt.JwtPayload;

        const accessTokenExpires = (verifyToken?.exp ?? 0) * 1000;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          employeeType: user.employeeType,
          isSuperAdmin: user.isSuperAdmin,
          accessToken: user.accessToken,
          accessTokenExpires,
          refreshToken: user.refreshToken,
        };
      } else {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            companyId: true,
            employeeType: true,
            isSuperAdmin: true,
            hasCopilot: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = `${dbUser.firstName} ${dbUser.lastName}`;
          token.role = dbUser.role;
          token.companyId = dbUser.companyId;
          token.employeeType = dbUser.employeeType;
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.hasCopilot = dbUser.hasCopilot;
        }
      }

      if (Date.now() < (token?.accessTokenExpires as number)) {
        return token;
      }
      // console.log("Access token expired, refreshing...");
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as number;
        session.user.employeeType = token.employeeType as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.hasCopilot = (token.hasCopilot as boolean) ?? false;
        session.accessToken = token.accessToken as string;
        session.error = token.error as "RefreshAccessTokenError";
      }

      return session;
    },
  },
};
