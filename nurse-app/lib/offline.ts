// ✅ FIX 4 implementation: SQLite offline cache
// When nurse's phone loses WiFi, bed status updates are stored locally.
// When connection resumes, they sync to Supabase automatically.
import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabaseSync('bedflow_offline.db')

export function initOfflineDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bed_id TEXT NOT NULL,
      new_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

export function queueUpdate(bedId: string, newStatus: string) {
  db.runSync(
    'INSERT INTO pending_updates (bed_id, new_status, created_at) VALUES (?, ?, ?)',
    [bedId, newStatus, new Date().toISOString()]
  )
}

export function getPendingUpdates() {
  return db.getAllSync<{ id: number; bed_id: string; new_status: string }>(
    'SELECT * FROM pending_updates ORDER BY id ASC'
  )
}

export function clearPendingUpdate(id: number) {
  db.runSync('DELETE FROM pending_updates WHERE id = ?', [id])
}