"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Ad from "@/models/Ad";
import Contact from "@/models/Contact";
import Game from "@/models/Game";
import GameResult from "@/models/GameResult";
import User from "@/models/User";
import mongoose from "mongoose";

function mongoId(value) {
  const id = String(value || "");
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : value;
}

function resultDateRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function resultTimeToCityTime(resultTime = "") {
  const [hours = "00", minutes = "00"] = String(resultTime || "").split(":");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function hasCityGames() {
  return (await Game.db.collection("cities").countDocuments({}, { limit: 1 })) > 0;
}

export async function saveContact(formData) {
  await requireAdmin();
  await connectDB();
  const id = formData.get("id");
  const data = {
    name: formData.get("name") || "",
    contactNumber: formData.get("contactNumber") || ""
  };
  if (id) await Contact.findByIdAndUpdate(id, data, { upsert: false });
  else await Contact.create(data);
  revalidatePath("/");
  redirect("/admin/dashboard?saved=1");
}

export async function saveAd(formData) {
  await requireAdmin();
  await connectDB();
  const id = formData.get("id");
  const data = {
    khaiwalName: formData.get("khaiwalName") || "",
    gpayNumber: formData.get("gpayNumber") || "",
    whatsappNumber: formData.get("whatsappNumber") || ""
  };
  if (id) await Ad.findByIdAndUpdate(id, data, { upsert: false });
  else await Ad.create(data);
  revalidatePath("/");
  redirect("/admin/ad?saved=1");
}

export async function saveGame(formData) {
  await requireAdmin();
  await connectDB();
  const id = formData.get("id");
  const resultTime = formData.get("resultTime") || "00:00:00";
  const showIndex = Number(formData.get("showIndex") || 0);
  const data = {
    name: formData.get("name") || "",
    code: formData.get("code") || "",
    resultTime,
    showIndex,
    isActive: true
  };

  const cityId = id ? mongoId(id) : null;
  const existingCity = id
    ? await Game.db.collection("cities").findOne({ _id: cityId }, { projection: { _id: 1 } })
    : null;

  if (existingCity || (!id && (await hasCityGames()))) {
    const cityData = {
      name: data.name,
      code: data.code,
      revelationTime: resultTimeToCityTime(resultTime),
      revelationOrder: showIndex,
      isActive: true,
      updatedAt: new Date()
    };

    if (existingCity) {
      await Game.db.collection("cities").updateOne({ _id: cityId }, { $set: cityData });
    } else {
      await Game.db.collection("cities").insertOne({ ...cityData, createdAt: new Date() });
    }
  } else if (id) {
    await Game.findByIdAndUpdate(id, data);
  } else {
    await Game.create(data);
  }

  revalidatePath("/");
  revalidatePath("/charts");
  revalidatePath("/chart/[slug]", "page");
  revalidatePath("/year-chart/[slugYear]", "page");
  redirect("/admin/games?saved=1");
}

export async function deleteGame(formData) {
  await requireAdmin();
  await connectDB();
  const id = formData.get("id");
  if (id) {
    const cityId = mongoId(id);
    const cityUpdate = await Game.db.collection("cities").updateOne(
      { _id: cityId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    if (!cityUpdate.matchedCount) await Game.findByIdAndUpdate(id, { isActive: false });
  }
  revalidatePath("/");
  revalidatePath("/charts");
  revalidatePath("/chart/[slug]", "page");
  revalidatePath("/year-chart/[slugYear]", "page");
  redirect("/admin/games?deleted=1");
}

export async function saveGameResult(formData) {
  await requireAdmin();
  await connectDB();
  const game = formData.get("game");
  const resultDate = formData.get("resultDate");
  const result = formData.get("result") || "";
  if (game && resultDate) {
    const gameId = mongoId(game);
    const city = await Game.db.collection("cities").findOne({ _id: gameId }, { projection: { sqlId: 1 } });

    if (city) {
      const { start, end } = resultDateRange(resultDate);
      await Game.db.collection("dailynumbers").findOneAndUpdate(
        { city: gameId, date: { $gte: start, $lt: end } },
        {
          $set: {
            city: gameId,
            date: start,
            number: result,
            revealedAt: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, returnDocument: "after" }
      );
    } else {
      const gameDoc = await Game.findById(game).lean();
      await GameResult.findOneAndUpdate(
        { game, resultDate },
        { game, gameSqlId: gameDoc?.sqlId, resultDate, result },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
  revalidatePath("/");
  revalidatePath("/charts");
  revalidatePath("/chart/[slug]", "page");
  revalidatePath("/year-chart/[slugYear]", "page");
  redirect(`/admin/game/result?date=${resultDate || ""}&saved=1`);
}

export async function deleteGameResult(formData) {
  await requireAdmin();
  await connectDB();
  const id = formData.get("id");
  const date = formData.get("date");
  if (id) {
    const dailyNumberId = mongoId(id);
    const dailyDelete = await Game.db.collection("dailynumbers").deleteOne({ _id: dailyNumberId });
    if (!dailyDelete.deletedCount) await GameResult.findByIdAndDelete(id);
  }
  revalidatePath("/");
  revalidatePath("/charts");
  revalidatePath("/chart/[slug]", "page");
  revalidatePath("/year-chart/[slugYear]", "page");
  redirect(`/admin/game/result?date=${date || ""}&deleted=1`);
}

export async function createAdminUser(formData) {
  await connectDB();
  const existing = await User.countDocuments();
  if (existing > 0) redirect("/admin/login");
  const password = await bcrypt.hash(formData.get("password") || "admin123", 10);
  await User.create({
    name: formData.get("name") || "Admin",
    email: formData.get("email") || "admin@example.com",
    password
  });
  redirect("/admin/login?created=1");
}
