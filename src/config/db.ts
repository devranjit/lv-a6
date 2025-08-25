import mongoose from "mongoose";

let cached = (global as any)._mongoose;
if (!cached) (global as any)._mongoose = { conn: null, promise: null };
cached = (global as any)._mongoose;

export async function connectDB(uri: string) {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri)
      .then((m) => {
        console.log("db:connected");
        return m;
      })
      .catch((e) => {
        console.error("db:error", e.message);
        throw e;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
