import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const allowedStatuses = new Set(['received', 'reviewing', 'more_info', 'answered', 'connected', 'closed']);
const allowedMimes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

function cleanText(value, maximum, required = false) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (required && !cleaned) throw new Error('INVALID_CONSULTATION');
  if (cleaned.length > maximum) throw new Error('INVALID_CONSULTATION');
  return cleaned;
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function makeReceipt(database) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).replaceAll('-', '');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const receipt = `SWC-${date}-${code}`;
    if (!database.prepare('SELECT 1 FROM consultations WHERE receipt = ?').get(receipt)) return receipt;
  }
  throw new Error('RECEIPT_GENERATION_FAILED');
}

function accessRecord(key) {
  const salt = randomBytes(24).toString('hex');
  return { salt, hash: scryptSync(key, salt, 64).toString('hex') };
}

function accessMatches(key, row) {
  if (typeof key !== 'string' || key.length < 32 || key.length > 200) return false;
  const actual = scryptSync(key, row.access_salt, 64);
  const expected = Buffer.from(row.access_hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function validateSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_CONSULTATION');
  const sharing = input.sharing && typeof input.sharing === 'object' ? input.sharing : {};
  const checks = Array.isArray(input.checks) ? input.checks.slice(0, 120).map((item) => ({
    id: cleanText(item?.id, 40, true),
    label: cleanText(item?.label, 300, true),
    step: cleanText(item?.step, 40),
    completed: item?.completed === true,
  })) : [];
  const steps = Array.isArray(input.steps) ? input.steps.slice(0, 30).map((item) => ({
    id: cleanText(item?.id, 40, true),
    label: cleanText(item?.label, 200, true),
    completed: item?.completed === true,
    status: ['unreviewed', 'possible', 'conditional', 'blocked'].includes(item?.status) ? item.status : 'unreviewed',
  })) : [];
  const notes = sharing.notes === true && Array.isArray(input.notes)
    ? input.notes.slice(0, 120).map((item) => ({
      id: cleanText(item?.id, 40, true),
      label: cleanText(item?.label, 300, true),
      text: cleanText(item?.text, 4000, true),
    }))
    : [];
  return {
    version: 1,
    candidateName: cleanText(input.candidateName, 160, true),
    address: sharing.address === true ? cleanText(input.address, 300) : '',
    plan: sharing.plan === true ? {
      washType: cleanText(input.plan?.washType, 100),
      bayCount: cleanText(input.plan?.bayCount, 30),
    } : null,
    progress: {
      completed: Math.max(0, Number.parseInt(input.progress?.completed || 0, 10) || 0),
      total: Math.max(0, Number.parseInt(input.progress?.total || 0, 10) || 0),
      unchecked: Math.max(0, Number.parseInt(input.progress?.unchecked || 0, 10) || 0),
    },
    overallStatus: ['unreviewed', 'possible', 'conditional', 'blocked'].includes(input.overallStatus)
      ? input.overallStatus : 'unreviewed',
    steps,
    checks,
    notes,
    sharing: {
      address: sharing.address === true,
      plan: sharing.plan === true,
      notes: sharing.notes === true,
      photos: sharing.photos === true,
    },
  };
}

function serializeConsultation(row, messages = [], attachments = []) {
  const snapshot = safeJson(row.snapshot_json, {});
  return {
    receipt: row.receipt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    snapshot,
    question: row.question,
    userConfirmed: Boolean(row.user_confirmed),
    emailStatus: row.email_status,
    emailError: row.email_error || '',
    messages: messages.map((message) => ({
      id: Number(message.id),
      sender: message.sender,
      body: message.body,
      contextId: message.context_id || '',
      contextLabel: message.context_label || '',
      createdAt: message.created_at,
    })),
    attachments: attachments.map((attachment) => ({
      id: Number(attachment.id),
      name: attachment.original_name,
      mime: attachment.mime,
      size: Number(attachment.size),
      createdAt: attachment.created_at,
    })),
  };
}

export async function createConsultationStore(dataRoot) {
  const databasePath = resolve(dataRoot, 'consultations.sqlite');
  const uploadRoot = resolve(dataRoot, 'consultation-uploads');
  await mkdir(uploadRoot, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA busy_timeout = 3000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt TEXT NOT NULL UNIQUE,
      client_candidate_ref TEXT NOT NULL,
      access_salt TEXT NOT NULL,
      access_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      candidate_name TEXT NOT NULL,
      address_shared INTEGER NOT NULL DEFAULT 0,
      snapshot_json TEXT NOT NULL,
      question TEXT NOT NULL,
      consent_at TEXT NOT NULL,
      user_confirmed INTEGER NOT NULL DEFAULT 0,
      email_status TEXT NOT NULL DEFAULT 'queued',
      email_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS consultation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      context_id TEXT NOT NULL DEFAULT '',
      context_label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS consultation_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_path TEXT NOT NULL DEFAULT '',
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS consultation_status_created_idx ON consultations(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS consultation_message_idx ON consultation_messages(consultation_id, created_at, id);
    CREATE INDEX IF NOT EXISTS consultation_attachment_idx ON consultation_attachments(consultation_id, id);
  `);
  await chmod(databasePath, 0o600);

  const getByReceipt = database.prepare('SELECT * FROM consultations WHERE receipt = ?');
  const getMessages = database.prepare('SELECT * FROM consultation_messages WHERE consultation_id = ? ORDER BY created_at, id');
  const getAttachments = database.prepare('SELECT * FROM consultation_attachments WHERE consultation_id = ? ORDER BY id');

  function authorized(receipt, key) {
    const row = getByReceipt.get(receipt);
    if (!row || !accessMatches(key, row)) return null;
    return row;
  }

  function detail(row) {
    return serializeConsultation(row, getMessages.all(row.id), getAttachments.all(row.id));
  }

  return {
    allowedStatuses,
    async create(input) {
      const snapshot = validateSnapshot(input.snapshot);
      const question = cleanText(input.question, 3000, true);
      const clientCandidateRef = cleanText(input.clientCandidateRef, 160, true);
      if (input.consent !== true) throw new Error('CONSENT_REQUIRED');
      const receipt = makeReceipt(database);
      const accessKey = randomBytes(32).toString('base64url');
      const access = accessRecord(accessKey);
      const now = new Date().toISOString();
      database.prepare(`
        INSERT INTO consultations (
          receipt, client_candidate_ref, access_salt, access_hash, status, candidate_name,
          address_shared, snapshot_json, question, consent_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receipt, clientCandidateRef, access.salt, access.hash, snapshot.candidateName,
        snapshot.sharing.address ? 1 : 0, JSON.stringify(snapshot), question, now, now, now,
      );
      return { consultation: detail(getByReceipt.get(receipt)), accessKey };
    },
    getPublic(receipt, key) {
      const row = authorized(receipt, key);
      return row ? detail(row) : null;
    },
    markSeen(receipt, key) {
      const row = authorized(receipt, key);
      if (!row) return null;
      database.prepare('UPDATE consultations SET user_confirmed = 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), row.id);
      return detail(getByReceipt.get(receipt));
    },
    list() {
      return database.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM consultation_messages m WHERE m.consultation_id = c.id) AS message_count,
          (SELECT COUNT(*) FROM consultation_attachments a WHERE a.consultation_id = c.id) AS photo_count
        FROM consultations c ORDER BY c.created_at DESC LIMIT 500
      `).all().map((row) => {
        const snapshot = safeJson(row.snapshot_json, {});
        return {
          receipt: row.receipt,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          status: row.status,
          candidateName: row.candidate_name,
          addressShared: Boolean(row.address_shared),
          address: snapshot.address || '',
          progress: snapshot.progress || {},
          question: row.question,
          photoCount: Number(row.photo_count),
          messageCount: Number(row.message_count),
          userConfirmed: Boolean(row.user_confirmed),
          emailStatus: row.email_status,
        };
      });
    },
    getAdmin(receipt) {
      const row = getByReceipt.get(receipt);
      return row ? detail(row) : null;
    },
    updateStatus(receipt, status) {
      if (!allowedStatuses.has(status)) throw new Error('INVALID_CONSULTATION');
      const now = new Date().toISOString();
      const result = database.prepare('UPDATE consultations SET status = ?, updated_at = ? WHERE receipt = ?')
        .run(status, now, receipt);
      return result.changes ? detail(getByReceipt.get(receipt)) : null;
    },
    addMessage(receipt, key, sender, input) {
      const row = sender === 'admin' ? getByReceipt.get(receipt) : authorized(receipt, key);
      if (!row) return null;
      const body = cleanText(input.body, 4000, true);
      const contextId = cleanText(input.contextId, 80);
      const contextLabel = cleanText(input.contextLabel, 300);
      const now = new Date().toISOString();
      database.prepare(`
        INSERT INTO consultation_messages (consultation_id, sender, body, context_id, context_label, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(row.id, sender, body, contextId, contextLabel, now);
      database.prepare('UPDATE consultations SET user_confirmed = ?, updated_at = ? WHERE id = ?')
        .run(sender === 'admin' ? 0 : row.user_confirmed, now, row.id);
      return detail(getByReceipt.get(receipt));
    },
    async addAttachment(receipt, key, input) {
      const row = authorized(receipt, key);
      if (!row) return null;
      const snapshot = safeJson(row.snapshot_json, {});
      if (snapshot.sharing?.photos !== true) throw new Error('PHOTO_SHARING_DISABLED');
      const mime = cleanText(input.mime, 40, true);
      const extension = allowedMimes.get(mime);
      if (!extension) throw new Error('INVALID_PHOTO');
      const originalName = cleanText(input.name, 180, true);
      const encoded = cleanText(input.data, 4_500_000, true);
      const data = Buffer.from(encoded, 'base64');
      if (!data.length || data.length > 3_000_000) throw new Error('INVALID_PHOTO');
      const signatureOk = (mime === 'image/jpeg' && data[0] === 0xff && data[1] === 0xd8)
        || (mime === 'image/png' && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        || (mime === 'image/webp' && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP');
      if (!signatureOk) throw new Error('INVALID_PHOTO');
      const count = Number(database.prepare('SELECT COUNT(*) AS count FROM consultation_attachments WHERE consultation_id = ?').get(row.id).count);
      if (count >= 10) throw new Error('PHOTO_LIMIT');
      const now = new Date().toISOString();
      const result = database.prepare(`
        INSERT INTO consultation_attachments (consultation_id, original_name, mime, size, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(row.id, originalName, mime, data.length, now);
      const attachmentId = Number(result.lastInsertRowid);
      const directory = resolve(uploadRoot, String(row.id));
      await mkdir(directory, { recursive: true });
      const pathname = resolve(directory, `${attachmentId}${extension}`);
      await writeFile(pathname, data, { mode: 0o600 });
      database.prepare('UPDATE consultation_attachments SET stored_path = ? WHERE id = ?').run(pathname, attachmentId);
      database.prepare('UPDATE consultations SET updated_at = ? WHERE id = ?').run(now, row.id);
      return detail(getByReceipt.get(receipt));
    },
    async attachment(receipt, attachmentId, key = '', admin = false) {
      const row = admin ? getByReceipt.get(receipt) : authorized(receipt, key);
      if (!row) return null;
      const attachment = database.prepare('SELECT * FROM consultation_attachments WHERE id = ? AND consultation_id = ?')
        .get(attachmentId, row.id);
      if (!attachment?.stored_path) return null;
      return { attachment, data: await readFile(attachment.stored_path) };
    },
    async deleteAttachment(receipt, attachmentId, key = '', admin = false) {
      const row = admin ? getByReceipt.get(receipt) : authorized(receipt, key);
      if (!row) return false;
      const attachment = database.prepare('SELECT * FROM consultation_attachments WHERE id = ? AND consultation_id = ?')
        .get(attachmentId, row.id);
      if (!attachment) return false;
      database.prepare('DELETE FROM consultation_attachments WHERE id = ?').run(attachment.id);
      if (attachment.stored_path) await unlink(attachment.stored_path).catch(() => {});
      database.prepare('UPDATE consultations SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
      return true;
    },
    setEmailResult(receipt, status, error = '') {
      database.prepare('UPDATE consultations SET email_status = ?, email_error = ?, updated_at = ? WHERE receipt = ?')
        .run(cleanText(status, 30, true), cleanText(error, 500), new Date().toISOString(), receipt);
    },
    close() { database.close(); },
  };
}
