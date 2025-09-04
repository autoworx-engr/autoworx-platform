import { authOptions } from "@/authOptions";
import NextAuth from "next-auth";


console.log("NEXTAUTH_SECRET exists:", process.env.AUTH_SECRET);
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET);
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

