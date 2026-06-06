import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;

function cleanDisplayName(displayName: string) {
  const trimmed = displayName.trim();
  if (trimmed.length < 2) {
    throw new Error("이름은 2자 이상이어야 합니다");
  }
  return trimmed;
}

export function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("이메일 형식이 올바르지 않습니다");
  }
  return normalized;
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("비밀번호는 8자 이상이어야 합니다");
  }
}

export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, key] = storedHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const displayName = cleanDisplayName(input.displayName);

  try {
    return await db.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("이미 가입된 이메일입니다");
    }
    throw error;
  }
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다");
  }

  return user;
}
