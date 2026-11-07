import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export class WorkspaceError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new WorkspaceError(status, code, message); };
const missing = () => fail(404, 'NOT_FOUND', '자료를 찾을 수 없습니다.');
const now = () => new Date().toISOString();
const seoulDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const text = (value, max, required = false) => {
  if (value != null && typeof value !== 'string') fail(400, 'INVALID_INPUT', '문자 입력값을 확인해 주세요.');
  const result = (value || '').trim();
  if ((required && !result) || result.length > max) fail(400, 'INVALID_INPUT', '필수 항목과 입력 길이를 확인해 주세요.');
  return result;
};
function number(value, integer = false) {
  if (value === '' || value == null) return null;
  const result = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(result) || result < 0 || result > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(result))) fail(400, 'INVALID_INPUT', '면적·금액은 올바른 단위의 0 이상 숫자로 입력해 주세요.');
  return result;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
function version(input, row) {
  if (!Number.isSafeInteger(input.version) || input.version !== row.version) fail(409, 'VERSION_CONFLICT', '다른 화면에서 자료가 바뀌었습니다. 입력은 유지되니 최신 자료를 확인한 뒤 다시 저장해 주세요.');
}
const statusLabels = { received: '접수', reviewing: '검토 중', more_info: '추가자료 요청', answered: '답변 완료', hold: '보류', reopened: '재문의', closed: '종료' };
export { statusLabels };

// Identity is supplied by the trusted server boundary, never by business request bodies.
export function createWorkspaceStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS principals(id TEXT PRIMARY KEY,label TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('customer','staff','manager')),team_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES principals(id),team_id TEXT NOT NULL,title TEXT NOT NULL,assignee_id TEXT REFERENCES principals(id),version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS candidates(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),version INTEGER NOT NULL,name TEXT NOT NULL,address TEXT NOT NULL,area_sqm REAL,price_won INTEGER,listing_url TEXT NOT NULL,memo TEXT NOT NULL,lifecycle TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS candidate_versions(candidate_id TEXT NOT NULL REFERENCES candidates(id),version INTEGER NOT NULL,snapshot_json TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES principals(id),created_at TEXT NOT NULL,PRIMARY KEY(candidate_id,version));
    CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),candidate_id TEXT NOT NULL REFERENCES candidates(id),candidate_version INTEGER NOT NULL,receipt TEXT NOT NULL UNIQUE,question TEXT NOT NULL,snapshot_json TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(candidate_id,candidate_version) REFERENCES candidate_versions(candidate_id,version));
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,inquiry_id TEXT NOT NULL REFERENCES inquiries(id),actor_id TEXT NOT NULL REFERENCES principals(id),kind TEXT NOT NULL,body TEXT NOT NULL,source TEXT NOT NULL DEFAULT '',checked_by TEXT NOT NULL DEFAULT '',checked_at TEXT NOT NULL DEFAULT '',recheck INTEGER NOT NULL DEFAULT 0,recheck_reason TEXT NOT NULL DEFAULT '',official_confirmed INTEGER NOT NULL DEFAULT 0,supersedes TEXT REFERENCES messages(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,inquiry_id TEXT NOT NULL REFERENCES inquiries(id),item TEXT NOT NULL,state TEXT NOT NULL,body TEXT NOT NULL,source TEXT NOT NULL,checked_by TEXT NOT NULL,checked_at TEXT NOT NULL,recheck INTEGER NOT NULL,recheck_reason TEXT NOT NULL,official_confirmed INTEGER NOT NULL,actor_id TEXT NOT NULL REFERENCES principals(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,inquiry_id TEXT NOT NULL REFERENCES inquiries(id),candidate_version INTEGER NOT NULL,actor_id TEXT NOT NULL REFERENCES principals(id),name TEXT NOT NULL,mime TEXT NOT NULL,visibility TEXT NOT NULL CHECK(visibility IN ('public','internal')),data BLOB NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),inquiry_id TEXT REFERENCES inquiries(id),actor_id TEXT NOT NULL REFERENCES principals(id),kind TEXT NOT NULL,visibility TEXT NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS submissions(actor_id TEXT NOT NULL REFERENCES principals(id),scope TEXT NOT NULL,operation TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(actor_id,scope,operation,request_id));
    CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS projects_assignee ON projects(assignee_id);
    CREATE INDEX IF NOT EXISTS candidates_project ON candidates(project_id);
    CREATE INDEX IF NOT EXISTS inquiries_project ON inquiries(project_id);
    CREATE INDEX IF NOT EXISTS messages_inquiry ON messages(inquiry_id,created_at);
    CREATE INDEX IF NOT EXISTS reviews_inquiry ON reviews(inquiry_id,created_at);
    CREATE INDEX IF NOT EXISTS attachments_inquiry ON attachments(inquiry_id);
    CREATE INDEX IF NOT EXISTS events_project ON events(project_id,created_at);
  `);
  if (path !== ':memory:') chmodSync(path, 0o600);
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  function actor(id) { const p = one('SELECT * FROM principals WHERE id=?', id); if (!p) fail(401, 'IDENTITY_REQUIRED', '시험 역할을 먼저 선택해 주세요.'); return p; }
  function access(who, projectId) {
    const p = one('SELECT * FROM projects WHERE id=?', projectId);
    if (!p || !(who.role === 'customer' ? p.owner_id === who.id : who.role === 'manager' ? p.team_id === who.team_id : p.assignee_id === who.id && p.team_id === who.team_id)) missing();
    return p;
  }
  function owner(who, p) { if (who.role !== 'customer' || p.owner_id !== who.id) fail(403, 'FORBIDDEN', '고객 본인만 제출하거나 수정할 수 있습니다.'); }
  function staff(who) { if (!['staff', 'manager'].includes(who.role)) fail(403, 'FORBIDDEN', '담당자 권한이 필요합니다.'); }
  function write(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  function idempotent(who, scope, operation, input, work) {
    const key = text(input.requestId, 100, true);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(key)) fail(400, 'INVALID_REQUEST_ID', '제출 식별값을 확인해 주세요.');
    const fingerprint = digest(input);
    const previous = one('SELECT * FROM submissions WHERE actor_id=? AND scope=? AND operation=? AND request_id=?', who.id, scope, operation, key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail(409, 'IDEMPOTENCY_CONFLICT', '같은 제출 식별값의 내용이 달라졌습니다. 기존 제출은 변경되지 않았습니다.');
      return JSON.parse(previous.result_json);
    }
    const result = work();
    run('INSERT INTO submissions VALUES(?,?,?,?,?,?)', who.id, scope, operation, key, fingerprint, JSON.stringify(result));
    return result;
  }
  function event(who, projectId, inquiryId, kind, visibility, payload) {
    run('INSERT INTO events VALUES(?,?,?,?,?,?,?,?)', randomUUID(), projectId, inquiryId, who.id, kind, visibility, JSON.stringify(payload), now());
  }
  function touchProject(id) { run('UPDATE projects SET updated_at=? WHERE id=?', now(), id); }
  function candidateData(input) {
    const url = text(input.listingUrl, 1500);
    if (url) { try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw Error(); } catch { fail(400, 'INVALID_INPUT', '매물 주소는 http 또는 https 주소로 입력해 주세요.'); } }
    const lifecycle = input.lifecycle || 'reviewing';
    if (!['reviewing', 'selected', 'hold', 'rejected'].includes(lifecycle)) fail(400, 'INVALID_INPUT', '후보지 상태를 확인해 주세요.');
    return { name: text(input.name, 160, true), address: text(input.address, 300, true), area_sqm: number(input.areaSqm), price_won: number(input.priceWon, true), listing_url: url, memo: text(input.memo, 4000), lifecycle };
  }
  function saveCandidateVersion(who, row) {
    run('INSERT INTO candidate_versions VALUES(?,?,?,?,?)', row.id, row.version, JSON.stringify(row), who.id, now());
  }
  function inquiryAccess(who, id) {
    const inquiry = one('SELECT * FROM inquiries WHERE id=?', id);
    if (!inquiry) missing();
    const project = access(who, inquiry.project_id);
    return { inquiry, project };
  }
  function evidence(input, required = true) {
    const result = { source: text(input.source, 2000, required), checkedBy: text(input.checkedBy, 160, required), checkedAt: text(input.checkedAt, 10, required), recheck: input.recheck === true, recheckReason: text(input.recheckReason, 2000), officialConfirmed: input.officialConfirmed === true };
    if (result.checkedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(result.checkedAt) || !Number.isFinite(Date.parse(result.checkedAt)) || new Date(result.checkedAt).toISOString().slice(0, 10) !== result.checkedAt || result.checkedAt > seoulDay())) fail(400, 'INVALID_INPUT', '확인일은 실제 확인한 날짜로 입력해 주세요.');
    if (result.recheck && !result.recheckReason) fail(400, 'INVALID_INPUT', '재확인 사유를 입력해 주세요.');
    return result;
  }
  function addMessage(who, inquiry, kind, body, proof = {}, supersedes = null) {
    const id = randomUUID();
    run('INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', id, inquiry.id, who.id, kind, body, proof.source || '', proof.checkedBy || '', proof.checkedAt || '', proof.recheck ? 1 : 0, proof.recheckReason || '', proof.officialConfirmed ? 1 : 0, supersedes, now());
    return id;
  }
  function bumpInquiry(inquiry, status = inquiry.status) {
    run('UPDATE inquiries SET status=?,version=version+1,updated_at=? WHERE id=?', status, now(), inquiry.id);
    touchProject(inquiry.project_id);
  }
  function inquiryView(who, row) {
    const publicOnly = who.role === 'customer';
    return {
      id: row.id, projectId: row.project_id, candidateId: row.candidate_id, candidateVersion: row.candidate_version,
      receipt: row.receipt, question: row.question, snapshot: JSON.parse(row.snapshot_json), status: row.status, statusLabel: statusLabels[row.status], version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
      messages: all(`SELECT m.*,p.label AS author FROM messages m JOIN principals p ON p.id=m.actor_id WHERE inquiry_id=? ${publicOnly ? "AND kind<>'note'" : ''} ORDER BY m.rowid`, row.id).map(m => ({ id: m.id, kind: m.kind, body: m.body, author: m.author, source: m.source, checkedBy: m.checked_by, checkedAt: m.checked_at, recheck: !!m.recheck, recheckReason: m.recheck_reason, officialConfirmed: !!m.official_confirmed, supersedes: m.supersedes, createdAt: m.created_at })),
      reviews: all('SELECT * FROM reviews WHERE inquiry_id=? ORDER BY rowid', row.id).map(r => ({ id: r.id, item: r.item, state: r.state, body: r.body, source: r.source, checkedBy: r.checked_by, checkedAt: r.checked_at, recheck: !!r.recheck, recheckReason: r.recheck_reason, officialConfirmed: !!r.official_confirmed, createdAt: r.created_at })),
      attachments: all(`SELECT id,name,mime,visibility,length(data) AS size,created_at FROM attachments WHERE inquiry_id=? ${publicOnly ? "AND visibility='public'" : ''} ORDER BY rowid`, row.id).map(a => ({ id: a.id, name: a.name, mime: a.mime, visibility: a.visibility, size: a.size, createdAt: a.created_at })),
      events: all(`SELECT kind,payload_json,created_at FROM events WHERE inquiry_id=? ${publicOnly ? "AND visibility='public'" : ''} ORDER BY rowid`, row.id).map(e => ({ kind: e.kind, ...JSON.parse(e.payload_json), createdAt: e.created_at })),
    };
  }
  function projectView(who, p) {
    return {
      id: p.id, title: p.title, version: p.version, assigned: !!p.assignee_id, createdAt: p.created_at, updatedAt: p.updated_at,
      ...(who.role !== 'customer' ? { assigneeId: p.assignee_id, assignmentHistory: all("SELECT payload_json,created_at FROM events WHERE project_id=? AND kind='assignment' ORDER BY rowid", p.id).map(e => ({ ...JSON.parse(e.payload_json), createdAt: e.created_at })) } : {}),
      candidates: all('SELECT * FROM candidates WHERE project_id=? ORDER BY rowid', p.id).map(c => ({ id: c.id, version: c.version, name: c.name, address: c.address, areaSqm: c.area_sqm, priceWon: c.price_won, listingUrl: c.listing_url, memo: c.memo, lifecycle: c.lifecycle, updatedAt: c.updated_at })),
      inquiries: all('SELECT * FROM inquiries WHERE project_id=? ORDER BY rowid DESC', p.id).map(row => inquiryView(who, row)),
    };
  }
  return {
    close: () => db.close(),
    registerPrincipal(p) {
      if (!['customer', 'staff', 'manager'].includes(p.role)) throw Error('Invalid principal');
      run('INSERT INTO principals(id,label,role,team_id) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING', p.id, p.label, p.role, p.teamId);
    },
    principal(id) { const p = actor(id); return { id: p.id, label: p.label, role: p.role }; },
    staffList(actorId) { const who = actor(actorId); if (who.role !== 'manager') fail(403, 'FORBIDDEN', '관리 책임자 권한이 필요합니다.'); return all("SELECT id,label FROM principals WHERE role='staff' AND team_id=?", who.team_id); },
    listProjects(actorId) {
      const who = actor(actorId);
      const rows = who.role === 'customer' ? all('SELECT * FROM projects WHERE owner_id=? ORDER BY updated_at DESC', who.id) : who.role === 'manager' ? all('SELECT * FROM projects WHERE team_id=? ORDER BY updated_at DESC', who.team_id) : all('SELECT * FROM projects WHERE assignee_id=? AND team_id=? ORDER BY updated_at DESC', who.id, who.team_id);
      return rows.map(p => ({ id: p.id, title: p.title, version: p.version, assigned: !!p.assignee_id, updatedAt: p.updated_at, candidateCount: one('SELECT count(*) AS n FROM candidates WHERE project_id=?', p.id).n, inquiryCount: one('SELECT count(*) AS n FROM inquiries WHERE project_id=?', p.id).n }));
    },
    project(actorId, id) { const who = actor(actorId); return projectView(who, access(who, id)); },
    createProject(actorId, input) {
      const who = actor(actorId); if (who.role !== 'customer') fail(403, 'FORBIDDEN', '고객만 사업을 등록할 수 있습니다.');
      const result = write(() => idempotent(who, who.id, 'project', input, () => {
        const id = randomUUID(), date = now();
        run('INSERT INTO projects VALUES(?,?,?,?,NULL,1,?,?)', id, who.id, who.team_id, text(input.title, 160, true), date, date);
        return { projectId: id };
      }));
      return projectView(who, access(who, result.projectId));
    },
    saveCandidate(actorId, projectId, candidateId, input) {
      const who = actor(actorId);
      const result = write(() => {
        const p = access(who, projectId); owner(who, p);
        return idempotent(who, projectId, `candidate:${candidateId || 'new'}`, input, () => {
          const values = candidateData(input);
          const current = candidateId ? one('SELECT * FROM candidates WHERE id=? AND project_id=?', candidateId, projectId) : null;
          if (candidateId && !current) missing();
          if (current) version(input, current);
          const id = candidateId || randomUUID(), date = now();
          if (current) run('UPDATE candidates SET version=version+1,name=?,address=?,area_sqm=?,price_won=?,listing_url=?,memo=?,lifecycle=?,updated_at=? WHERE id=?', ...Object.values(values), date, id);
          else run('INSERT INTO candidates VALUES(?,?,1,?,?,?,?,?,?,?,?)', id, projectId, ...Object.values(values), date);
          saveCandidateVersion(who, one('SELECT * FROM candidates WHERE id=?', id));
          touchProject(projectId);
          return { candidateId: id };
        });
      });
      return { project: projectView(who, access(who, projectId)), candidateId: result.candidateId };
    },
    assign(actorId, projectId, input) {
      const who = actor(actorId);
      write(() => {
        const p = access(who, projectId);
        if (who.role !== 'manager') fail(403, 'FORBIDDEN', '관리 책임자만 배정할 수 있습니다.');
        idempotent(who, projectId, 'assign', input, () => {
          version(input, p);
          const reason = text(input.reason, 1000, true);
          const next = input.assigneeId ? one("SELECT * FROM principals WHERE id=? AND role='staff' AND team_id=?", input.assigneeId, p.team_id) : null;
          if (input.assigneeId && !next) fail(400, 'INVALID_ASSIGNEE', '배정 가능한 담당자를 선택해 주세요.');
          run('UPDATE projects SET assignee_id=?,version=version+1,updated_at=? WHERE id=?', next?.id || null, now(), projectId);
          event(who, projectId, null, 'assignment', 'internal', { from: p.assignee_id, to: next?.id || null, reason, actor: who.label });
          return { projectId };
        });
      });
      return projectView(who, access(who, projectId));
    },
    submit(actorId, projectId, input) {
      const who = actor(actorId);
      const result = write(() => {
        const p = access(who, projectId); owner(who, p);
        return idempotent(who, projectId, 'submit', input, () => {
          if (input.consent !== true) fail(400, 'CONSENT_REQUIRED', '검토 의뢰 내용과 자료 전달을 확인해 주세요.');
          const c = one('SELECT * FROM candidates WHERE id=? AND project_id=?', input.candidateId, projectId);
          if (!c) missing();
          version(input, c);
          const id = randomUUID(), date = now();
          const receipt = `SWR-${seoulDay().replaceAll('-', '')}-${randomBytes(6).toString('hex').toUpperCase()}`;
          run("INSERT INTO inquiries VALUES(?,?,?,?,?,?,?,'received',1,?,?)", id, projectId, c.id, c.version, receipt, text(input.question, 4000, true), JSON.stringify(c), date, date);
          event(who, projectId, id, 'submitted', 'public', { status: 'received', consentAt: date });
          touchProject(projectId);
          return { inquiryId: id };
        });
      });
      return inquiryView(who, inquiryAccess(who, result.inquiryId).inquiry);
    },
    inquiry(actorId, id) { const who = actor(actorId); return inquiryView(who, inquiryAccess(who, id).inquiry); },
    act(actorId, inquiryId, action, input) {
      const who = actor(actorId);
      write(() => {
        const { inquiry: q, project: p } = inquiryAccess(who, inquiryId);
        if (['followup', 'additional'].includes(action)) owner(who, p); else staff(who);
        idempotent(who, p.id, `${action}:${q.id}`, input, () => {
          version(input, q);
          const body = text(input.body, 6000, true);
          let status = q.status;
          if (action === 'transition') {
            const target = input.status;
            const allowed = { reviewing: ['received', 'hold', 'reopened'], more_info: ['reviewing', 'reopened'], hold: ['received', 'reviewing', 'more_info', 'reopened'], closed: ['received', 'reviewing', 'more_info', 'answered', 'hold', 'reopened'] };
            if (!allowed[target]?.includes(q.status)) fail(409, 'INVALID_TRANSITION', '현재 상태에서 허용되지 않는 변경입니다.');
            status = target;
          } else if (action === 'reply') {
            const proof = evidence(input);
            let supersedes = null;
            if (input.supersedes) {
              const previous = one("SELECT * FROM messages WHERE id=? AND inquiry_id=? AND kind='reply'", input.supersedes, q.id);
              if (!previous || q.status !== 'answered') fail(409, 'INVALID_CORRECTION', '정정할 기존 답변을 확인해 주세요.');
              supersedes = previous.id;
              text(input.reason, 1000, true);
            } else if (q.status !== 'reviewing') fail(409, 'INVALID_TRANSITION', '검토 중 상태에서 공개 답변을 작성해 주세요.');
            addMessage(who, q, 'reply', body, proof, supersedes);
            status = 'answered';
          } else if (action === 'followup') {
            if (!['answered', 'hold', 'closed'].includes(q.status)) fail(409, 'INVALID_TRANSITION', '답변 완료·보류·종료 상태에서 재문의할 수 있습니다.');
            addMessage(who, q, 'followup', body); status = 'reopened';
          } else if (action === 'additional') {
            if (q.status !== 'more_info') fail(409, 'INVALID_TRANSITION', '추가자료 요청 상태가 아닙니다.');
            addMessage(who, q, 'additional', body); status = 'reviewing';
          } else if (action === 'note') addMessage(who, q, 'note', body);
          else if (action === 'review') {
            if (!['reviewing', 'reopened'].includes(q.status)) fail(409, 'INVALID_TRANSITION', '검토 중에 항목을 기록해 주세요.');
            if (!['land', 'building', 'water', 'access'].includes(input.item) || !['unreviewed', 'checking', 'recorded', 'needs_review'].includes(input.state)) fail(400, 'INVALID_INPUT', '검토 항목·확인 상태를 확인해 주세요.');
            const proof = input.state === 'unreviewed' ? { source: '', checkedBy: '', checkedAt: '', recheck: false, recheckReason: '', officialConfirmed: false } : evidence(input, input.state === 'recorded');
            run('INSERT INTO reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', randomUUID(), q.id, input.item, input.state, body, proof.source, proof.checkedBy, proof.checkedAt, proof.recheck ? 1 : 0, proof.recheckReason, proof.officialConfirmed ? 1 : 0, who.id, now());
          } else fail(404, 'NOT_FOUND', '지원하지 않는 작업입니다.');
          bumpInquiry(q, status);
          event(who, p.id, q.id, action, action === 'note' ? 'internal' : 'public', { from: q.status, status, ...(action === 'transition' ? { reason: body } : {}), ...(input.supersedes ? { correctionReason: text(input.reason, 1000, true) } : {}) });
          return { inquiryId: q.id };
        });
      });
      return inquiryView(who, inquiryAccess(who, inquiryId).inquiry);
    },
    attach(actorId, inquiryId, input) {
      const who = actor(actorId);
      write(() => {
        const { inquiry: q, project: p } = inquiryAccess(who, inquiryId);
        idempotent(who, p.id, `attachment:${q.id}`, input, () => {
          version(input, q);
          const visibility = input.visibility || 'public';
          if (!['public', 'internal'].includes(visibility) || (who.role === 'customer' && visibility !== 'public')) fail(403, 'FORBIDDEN', '첨부 공개 범위를 확인해 주세요.');
          const raw = text(input.data, 2_800_000, true);
          if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail(400, 'INVALID_FILE', '이미지 파일을 확인해 주세요.');
          const data = Buffer.from(raw, 'base64');
          const valid = input.mime === 'image/png' ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.length > 24 : input.mime === 'image/jpeg' ? data[0] === 255 && data[1] === 216 && data[2] === 255 && data.at(-2) === 255 && data.at(-1) === 217 : input.mime === 'image/webp' ? data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' && data.length > 16 : false;
          if (!valid || data.toString('base64') !== raw || data.length > 2_000_000) fail(400, 'INVALID_FILE', 'PNG·JPEG·WebP 이미지 파일만 2MB까지 첨부할 수 있습니다.');
          if (one('SELECT count(*) AS n FROM attachments WHERE inquiry_id=?', q.id).n >= 10) fail(400, 'FILE_LIMIT', '접수 한 건에 사진은 10장까지 첨부할 수 있습니다.');
          const name = text(input.name, 160, true).replace(/[\\/\u0000-\u001f\u007f]/g, '_');
          run('INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?,?)', randomUUID(), q.id, q.candidate_version, who.id, name, input.mime, visibility, data, now());
          bumpInquiry(q);
          event(who, p.id, q.id, 'attachment', visibility, { name });
          return { inquiryId: q.id };
        });
      });
      return inquiryView(who, inquiryAccess(who, inquiryId).inquiry);
    },
    attachment(actorId, id) {
      const who = actor(actorId), a = one('SELECT * FROM attachments WHERE id=?', id);
      if (!a) missing();
      inquiryAccess(who, a.inquiry_id);
      if (who.role === 'customer' && a.visibility !== 'public') missing();
      return { name: a.name, mime: a.mime, data: Buffer.from(a.data) };
    },
  };
}
