import mongoose from "mongoose";
let cached = global._mongoose;
if (!cached)
    global._mongoose = { conn: null, promise: null };
cached = global._mongoose;
export async function connectDB(uri) {
    if (cached.conn)
        return cached.conn;
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
