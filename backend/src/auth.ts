import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

const tokenTtl = "30d";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function createUser(email: string, password: string, name: string): Promise<{ user: AuthUser; token: string }> {
  const normalizedEmail = normalizeEmail(email);
  validatePassword(password);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim() || normalizedEmail.split("@")[0],
      passwordHash,
    },
    select: publicUserSelect,
  }).catch((error: { code?: string }) => {
    if (error.code === "P2002") {
      throw new AuthError(409, "An account with this email already exists.");
    }
    throw error;
  });

  return { user, token: signToken(user) };
}

export async function loginUser(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  const publicUser = { id: user.id, email: user.email, name: user.name };
  return { user: publicUser, token: signToken(publicUser) };
}

export async function userFromAuthHeader(header: string | string[] | undefined): Promise<AuthUser | null> {
  const token = bearerToken(header);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret()) as { sub?: string };
    if (!decoded.sub) return null;
    return prisma.user.findUnique({ where: { id: decoded.sub }, select: publicUserSelect });
  } catch {
    return null;
  }
}

function signToken(user: AuthUser) {
  return jwt.sign({ email: user.email, name: user.name }, jwtSecret(), {
    subject: user.id,
    expiresIn: tokenTtl,
  });
}

function bearerToken(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AuthError(400, "Enter a valid email address.");
  }
  return normalized;
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new AuthError(400, "Password must be at least 8 characters.");
  }
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new AuthError(500, "JWT_SECRET must be set to a long random value before using auth.");
  }
  return secret;
}

class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
} as const;
