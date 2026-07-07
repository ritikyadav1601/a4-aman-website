import mongoose from "mongoose";

let cached = global.resultSourceMongoConnection;

if (!cached) {
  cached = global.resultSourceMongoConnection = { conn: null, promise: null };
}

export function hasResultSourceMongo() {
  return Boolean(process.env.RESULT_SOURCE_MONGODB_URI);
}

export async function connectResultSourceDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.RESULT_SOURCE_MONGODB_URI) {
    throw new Error("Missing RESULT_SOURCE_MONGODB_URI in environment.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.createConnection(process.env.RESULT_SOURCE_MONGODB_URI, {
      bufferCommands: false,
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000
    }).asPromise();
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

