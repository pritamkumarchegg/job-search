import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { User } from "./models/User";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

dotenv.config();

async function writeLocalAdmin(email: string, hash: string) {
  const outDir = path.resolve(__dirname, "..", "dev_data");
  try {
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, "admin.json");
    const payload = {
      email,
      passwordHash: hash,
      roles: ["admin"],
      name: "Admin",
      createdAt: new Date().toISOString()
    };
    await fs.writeFile(outFile, JSON.stringify(payload, null, 2), { encoding: "utf8" });
  } catch (err) {
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || "";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@jobscout.local";
  const adminPass = process.env.SEED_ADMIN_PASS || "password123";

  try {
    await connectDB(uri);
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      process.exit(0);
    }

    const hash = await bcrypt.hash(adminPass, 10);
    const admin = await User.create({ email: adminEmail, passwordHash: hash, roles: ["admin"], name: "Admin" });
    process.exit(0);
  } catch (err) {
    const hash = await bcrypt.hash(adminPass, 10);
    await writeLocalAdmin(adminEmail, hash);
    process.exit(0);
  }
}

run().catch((err) => {
  process.exit(1);
});
