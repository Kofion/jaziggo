import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { argon2id, hash } from "argon2";

const prisma = new PrismaClient();

class SeedConfigurationError extends Error {}

function getInitialAdminEmail(): string {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.endsWith(".invalid")
  ) {
    throw new SeedConfigurationError(
      "INITIAL_ADMIN_EMAIL must contain a valid non-placeholder email address.",
    );
  }

  return email;
}

function getInitialAdminPassword(): string {
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (
    !password ||
    password === "<replace-with-a-one-time-initial-password>" ||
    password.length < 12 ||
    password.length > 1024 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new SeedConfigurationError(
      "INITIAL_ADMIN_PASSWORD must be a non-placeholder value with 12-1024 characters, including a letter, number and special character.",
    );
  }

  return password;
}

async function main(): Promise<void> {
  const email = getInitialAdminEmail();
  const password = getInitialAdminPassword();
  const passwordHash = await hash(password, {
    type: argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  await prisma.user.upsert({
    where: { email },
    create: {
      name: "Initial Administrator",
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    update: {
      name: "Initial Administrator",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.info("Initial administrator seed completed.");
}

main()
  .catch((error: unknown) => {
    if (error instanceof SeedConfigurationError) {
      console.error(error.message);
    } else {
      console.error("Initial administrator seed failed.");
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
