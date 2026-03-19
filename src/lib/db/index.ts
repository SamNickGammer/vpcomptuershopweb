import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections in dev (Next.js hot reload)
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false, // Required for Supabase Transaction Mode pooler (port 6543)
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
