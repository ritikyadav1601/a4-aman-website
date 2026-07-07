// scripts/check-admin-users.mjs
//
// One-off diagnostic/reset script for the admin User collection.
//
// USAGE:
//   node scripts/check-admin-users.mjs                → lists existing users
//   node scripts/check-admin-users.mjs --delete-all    → deletes ALL users (careful!)
//   node scripts/check-admin-users.mjs --create <email> <password> [name]
//                                                       → deletes all users, then creates one fresh admin
//
// Requires MONGODB_URI to be set in the environment (same one your app uses).
// Run from your project root: node scripts/check-admin-users.mjs

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment. Set it before running this script.");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    sqlId: { type: Number, index: true, unique: true, sparse: true },
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const args = process.argv.slice(2);
  const command = args[0];

  const users = await User.find({}).lean();
  console.log(`Found ${users.length} user(s) in the database:`);
  for (const u of users) {
    console.log(`  - id=${u._id} email=${u.email} name=${u.name} passwordHashPrefix=${(u.password || "").slice(0, 7)}`);
  }

  if (command === "--delete-all") {
    const res = await User.deleteMany({});
    console.log(`Deleted ${res.deletedCount} user(s). You can now use the "Create Admin" form again.`);
  }

  if (command === "--create") {
    const email = args[1];
    const password = args[2];
    const name = args[3] || "Admin";

    if (!email || !password) {
      console.error("Usage: node scripts/check-admin-users.mjs --create <email> <password> [name]");
      process.exit(1);
    }

    const delRes = await User.deleteMany({});
    console.log(`Cleared ${delRes.deletedCount} existing user(s).`);

    const hash = await bcrypt.hash(password, 10);
    const created = await User.create({ name, email, password: hash });
    console.log(`Created new admin user: id=${created._id} email=${created.email}`);
    console.log(`You can now log in at /admin/login with email="${email}" and the password you provided.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
