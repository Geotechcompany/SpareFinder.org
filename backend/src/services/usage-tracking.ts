import { supabase } from "../server";

type UsageRow = {
  user_id: string;
  month: number;
  year: number;
  searches_count: number;
  api_calls_count: number;
  storage_used: number;
};

const getPeriod = (d = new Date()) => ({
  month: d.getMonth() + 1,
  year: d.getFullYear(),
});

export async function getUsageRow(userId: string): Promise<UsageRow> {
  const { month, year } = getPeriod();

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("user_id, month, year, searches_count, api_calls_count, storage_used")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (error) {
    // Fail closed to zeros; callers can still enforce via subscription/credits.
    return {
      user_id: userId,
      month,
      year,
      searches_count: 0,
      api_calls_count: 0,
      storage_used: 0,
    };
  }

  if (!data) {
    // Create row
    await supabase.from("usage_tracking").insert([
      {
        user_id: userId,
        month,
        year,
        searches_count: 0,
        api_calls_count: 0,
        storage_used: 0,
        bandwidth_used: 0,
      },
    ]);
    return {
      user_id: userId,
      month,
      year,
      searches_count: 0,
      api_calls_count: 0,
      storage_used: 0,
    };
  }

  return {
    user_id: data.user_id,
    month: data.month,
    year: data.year,
    searches_count: data.searches_count ?? 0,
    api_calls_count: data.api_calls_count ?? 0,
    storage_used: Number(data.storage_used ?? 0),
  };
}

export async function incrementUsage(opts: {
  userId: string;
  searches?: number;
  apiCalls?: number;
}): Promise<void> {
  const searches = Number(opts.searches ?? 0);
  const apiCalls = Number(opts.apiCalls ?? 0);
  if (!Number.isFinite(searches) || !Number.isFinite(apiCalls)) return;

  // Prefer the database function if present (atomic).
  // This exists in `supabase-setup.sql`.
  if (searches !== 0 || apiCalls !== 0) {
    await supabase.rpc("increment_usage", {
      p_user_id: opts.userId,
      p_searches: searches,
      p_api_calls: apiCalls,
    });
  }
}

export async function incrementStorage(opts: {
  userId: string;
  bytes: number;
}): Promise<void> {
  const bytes = Number(opts.bytes ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return;

  const row = await getUsageRow(opts.userId);
  const next = row.storage_used + bytes;

  await supabase
    .from("usage_tracking")
    .update({ storage_used: next })
    .eq("user_id", row.user_id)
    .eq("month", row.month)
    .eq("year", row.year);
}

