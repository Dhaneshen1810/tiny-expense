import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export const DB_NAME = "tinyexpense";

export default function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const client = new MongoClient(uri);
  const promise = client.connect();

  if (process.env.NODE_ENV !== "production") {
    global._mongoClientPromise = promise;
  }

  return promise;
}
