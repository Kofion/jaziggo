import "server-only"

import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import {
  USER_ROLE,
  type UserRole,
} from "../../types/user"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    }
  }

  interface User {
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
  }
}

const useSecureCookies = process.env.NODE_ENV === "production"

function isUserRole(value: unknown): value is UserRole {
  return value === USER_ROLE.ADMIN || value === USER_ROLE.EMPLOYEE
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  debug: false,
  session: {
    strategy: "jwt",
  },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          autocomplete: "email",
        },
        password: {
          label: "Password",
          type: "password",
          autocomplete: "current-password",
        },
      },
      authorize: () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && isUserRole(user.role)) {
        token.role = user.role
      }

      return token
    },
    session({ session, token }) {
      if (!token.sub || !isUserRole(token.role)) {
        throw new Error("Invalid session token")
      }

      return {
        expires: session.expires,
        user: {
          id: token.sub,
          role: token.role,
        },
      }
    },
  },
}

export default authOptions
