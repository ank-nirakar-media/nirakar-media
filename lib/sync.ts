import { query } from "./db";
import { syncInstagram } from "./connectors/instagram";
import { syncYoutube } from "./connectors/youtube";

type Conn = { id: number; client_id: number; platform: string; account_id: string; access_token: string; refresh_token: string | null; token_expires_at: string | null };

export async function syncConnections(clientId?: number) {
  const conns = await query<Conn>(
    `SELECT id, client_id, platform, account_id, access_token, refresh_token, token_expires_at::text FROM connections
     WHERE status <> 'disconnected' AND access_token IS NOT NULL ${clientId ? "AND client_id = $1" : ""}`,
    clientId ? [clientId] : [],
  );
  const results: { id: number; platform: string; ok: boolean; detail: string }[] = [];
  for (const c of conns) {
    try {
      const n = c.platform === "youtube" ? await syncYoutube(c) : c.platform === "instagram" ? await syncInstagram(c) : 0;
      await query("UPDATE connections SET last_synced_at = now(), status = 'active', last_error = NULL WHERE id = $1", [c.id]);
      results.push({ id: c.id, platform: c.platform, ok: true, detail: `${n} videos` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await query("UPDATE connections SET status = 'error', last_error = $1 WHERE id = $2", [msg.slice(0, 500), c.id]);
      results.push({ id: c.id, platform: c.platform, ok: false, detail: msg });
    }
  }
  return results;
}
