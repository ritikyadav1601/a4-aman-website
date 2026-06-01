import mongoose from "mongoose";

let cached = global.mongooseConnection;

if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
