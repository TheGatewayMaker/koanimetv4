const URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON = process.env.SUPABASE_ANON_KEY || "";

function headers(useService = true) {
  const key = useService ? SERVICE_ROLE : ANON;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

function restUrl(table: string) {
  // PostgREST namespace
  return `${URL}/rest/v1/${table}`;
}

export async function supabaseSelect(table: string, qs = "") {
  if (!URL || !SERVICE_ROLE) throw new Error("Supabase not configured");
  const u = `${restUrl(table)}${qs}`;
  const res = await fetch(u, { headers: headers(true) });
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  return await res.json();
}

export async function supabaseInsert(table: string, body: any, params = "") {
  if (!URL || !SERVICE_ROLE) throw new Error("Supabase not configured");
  const u = `${restUrl(table)}${params}`;
  const res = await fetch(u, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `Supabase insert failed: ${res.status} ${await res.text()}`,
    );
  return await res.json();
}

export async function supabaseUpsert(
  table: string,
  body: any,
  on_conflict = "id",
) {
  if (!URL || !SERVICE_ROLE) throw new Error("Supabase not configured");
  const params = `?on_conflict=${encodeURIComponent(on_conflict)}`;
  return await supabaseInsert(table, body, params);
}

export async function supabasePatch(table: string, qs = "", body: any) {
  if (!URL || !SERVICE_ROLE) throw new Error("Supabase not configured");
  const u = `${restUrl(table)}${qs}`;
  const res = await fetch(u, {
    method: "PATCH",
    headers: headers(true),
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(`Supabase patch failed: ${res.status} ${await res.text()}`);
  return await res.json();
}
