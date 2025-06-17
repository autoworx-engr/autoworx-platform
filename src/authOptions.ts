import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

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
      };
    }
  
    interface User {
      id: string;
      name: string;
      email: string;
      role: string;
      companyId: number;
      employeeType: string;
    }
  }

export const authOptions: NextAuthOptions = {
    providers: [
      CredentialsProvider({
        name: "AutoWorx",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          if (!credentials?.email || !credentials?.password) return null;
  
          const user = await db.user.findUnique({
            where: { email: credentials.email },
          });
  
          if (!user || !user.password) return null;
  
          const isPasswordMatched = await bcrypt.compare(
            credentials.password,
            user.password,
          );
  
          if (!isPasswordMatched) return null;
  
          return {
            id: user.id.toString(),
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            employeeType: user.employeeType,
          };
        },
      }),
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.role = user.role;
          token.companyId = user.companyId;
          token.employeeType = user.employeeType;
        } else {
          const dbUser = await db.user.findUnique({
            where: { email: token.email as string },
          });
  
          if (dbUser) {
            token.id = dbUser.id;
            token.name = `${dbUser.firstName} ${dbUser.lastName}`;
            token.role = dbUser.role;
            token.companyId = dbUser.companyId;
            token.employeeType = dbUser.employeeType;
          }
        }
  
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.name = token.name as string;
          session.user.email = token.email as string;
          session.user.role = token.role as string;
          session.user.companyId = token.companyId as number;
          session.user.employeeType = token.employeeType as string;
        }
  
        return session;
      },
    },
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/login",
      error: "/auth/error",
    },
    secret: process.env.NEXTAUTH_SECRET,
  };