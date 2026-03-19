import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// For Supabase Transaction Mode pooler (port 6543):
// - prepare: false is REQUIRED (pooler doesn't support prepared statements)
// - Short idle_timeout to avoid stale connections
// - max_lifetime to force reconnection periodically
const connection = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 5,
  connect_timeout: 30,
  max_lifetime: 60 * 2,
  prepare: false,
});

export const db = drizzle(connection, { schema });
