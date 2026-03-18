import { db } from "./index";
import { admins } from "./schema";
import { hashPassword } from "../auth/admin";

async function seed() {
  console.log("🌱 Seeding admin user...");

  const email = "admin@vpcomputer.in"; // change this
  const password = "Admin@1234"; // change this after first login!
  const name = "V&P Admin";

  const existing = await db.select().from(admins).limit(1);

  if (existing.length > 0) {
    console.log("⚠️  Admin already exists, skipping seed.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(admins).values({
    name,
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log("✅ Admin created!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   ⚠️  Change your password after first login!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
