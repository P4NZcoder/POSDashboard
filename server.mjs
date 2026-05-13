import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.MKM_API_HOST || "127.0.0.1";
const PORT = Number(process.env.MKM_API_PORT || 8787);
const DATA_DIR = process.env.MKM_DATA_DIR || join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "mkm-pos-db.json");
const BACKUP_DIR = join(DATA_DIR, "backups");
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function sendText(res, status, content, contentType) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(content);
}

function sendJson(res, status, payload) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(payload));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvFromRows(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
}

function getTableRows(snapshot, tableName) {
  if (tableName === "inventory") {
    return {
      headers: ["id", "name", "category", "stock", "unit"],
      rows: snapshot.inventory || [],
    };
  }
  if (tableName === "employees") {
    return {
      headers: ["id", "name", "role", "baseWage", "bankName", "bankAcc"],
      rows: snapshot.employees || [],
    };
  }
  if (tableName === "sales") {
    return {
      headers: ["id", "timestamp", "table", "total", "cash", "transfer", "grab", "status"],
      rows: (snapshot.salesData || []).map((sale) => ({ ...sale, grab: sale.grab || 0 })),
    };
  }
  return null;
}

function tableTitle(tableName) {
  if (tableName === "inventory") return "รายการวัตถุดิบ";
  if (tableName === "employees") return "รายชื่อพนักงาน";
  if (tableName === "sales") return "รายรับ";
  return tableName;
}

function htmlPortalPage(snapshot) {
  const savedAt = snapshot?.savedAt || snapshot?.syncedAt || "-";
  const cards = [
    ["วัตถุดิบ", "รายการวัตถุดิบทั้งหมด", "/tables/inventory", "/api/tables/inventory.csv", snapshot?.inventory?.length || 0],
    ["พนักงาน", "ข้อมูลพนักงานและบัญชี", "/tables/employees", "/api/tables/employees.csv", snapshot?.employees?.length || 0],
    ["รายรับ", "บิลและยอดขาย", "/tables/sales", "/api/tables/sales.csv", snapshot?.salesData?.length || 0],
  ];
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="30" />
  <title>MKM.POS Data Center</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: "Noto Sans Thai", Inter, system-ui, sans-serif; padding: 28px; }
    .shell { max-width: 1180px; margin: 0 auto; }
    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: clamp(32px, 5vw, 56px); line-height: 1.02; letter-spacing: 0; }
    .meta { margin-top: 10px; color: #6b7280; font-size: 14px; font-weight: 800; line-height: 1.7; }
    .status { border-radius: 999px; background: #dcfce7; color: #166534; padding: 12px 18px; font-weight: 900; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .card { background: white; border: 1px solid rgba(255,255,255,0.85); border-radius: 30px; padding: 22px; box-shadow: 0 18px 50px rgba(39, 37, 62, 0.07); }
    .count { color: #111827; font-size: 42px; font-weight: 900; line-height: 1; margin: 12px 0 8px; }
    .label { color: #6b7280; font-size: 14px; font-weight: 800; line-height: 1.6; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    a { border-radius: 999px; padding: 11px 16px; background: #f9fafb; color: #374151; text-decoration: none; font-weight: 900; box-shadow: 0 10px 30px rgba(17, 24, 39, 0.04); }
    a.primary { background: #2563eb; color: white; box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22); }
    .path { margin-top: 18px; word-break: break-all; background: white; border-radius: 24px; padding: 18px; color: #4b5563; font-weight: 800; box-shadow: 0 12px 30px rgba(17,24,39,0.04); }
    @media (max-width: 820px) { body { padding: 16px; } .hero { flex-direction: column; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="shell">
    <div class="hero">
      <div>
        <h1>MKM.POS Data Center</h1>
        <div class="meta">ข้อมูลกลางของร้าน · อัปเดตล่าสุด ${escapeHtml(savedAt)} · หน้านี้รีเฟรชเองทุก 30 วินาที</div>
      </div>
      <div class="status">Backend พร้อมใช้งาน</div>
    </div>
    <section class="grid">
      ${cards
        .map(
          ([title, subtitle, viewPath, csvPath, count]) => `
            <article class="card">
              <div class="label">${escapeHtml(subtitle)}</div>
              <div class="count">${escapeHtml(count)}</div>
              <h2>${escapeHtml(title)}</h2>
              <div class="actions">
                <a class="primary" href="${viewPath}">ดูตาราง</a>
                <a href="${csvPath}">Excel CSV</a>
              </div>
            </article>
          `,
        )
        .join("")}
    </section>
    <div class="path">ไฟล์ฐานข้อมูลจริง: ${escapeHtml(DB_FILE)}</div>
  </main>
</body>
</html>`;
}

function htmlTablePage(tableName, table, snapshot) {
  const title = tableTitle(tableName);
  const updatedAt = snapshot.savedAt || snapshot.syncedAt || "-";
  const rows = table.rows
    .map(
      (row) => `
        <tr>
          ${table.headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="15" />
  <title>MKM.POS - ${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: "Noto Sans Thai", Inter, system-ui, sans-serif;
      padding: 28px;
    }
    .shell {
      max-width: 1180px;
      margin: 0 auto;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.05;
      letter-spacing: 0;
    }
    .meta {
      margin-top: 8px;
      color: #6b7280;
      font-weight: 800;
      font-size: 14px;
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    a, button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      background: white;
      color: #374151;
      text-decoration: none;
      font: inherit;
      font-weight: 900;
      box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
      cursor: pointer;
    }
    a.primary {
      background: #2563eb;
      color: white;
      box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
    }
    .card {
      overflow: hidden;
      background: white;
      border-radius: 30px;
      border: 1px solid rgba(255,255,255,0.85);
      box-shadow: 0 18px 50px rgba(39, 37, 62, 0.07);
    }
    .table-wrap {
      overflow: auto;
      max-height: calc(100vh - 180px);
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 760px;
    }
    th {
      position: sticky;
      top: 0;
      background: #f9fafb;
      color: #6b7280;
      text-align: left;
      font-size: 12px;
      font-weight: 900;
      padding: 16px 18px;
      border-bottom: 1px solid #eef0f3;
      text-transform: uppercase;
    }
    td {
      padding: 17px 18px;
      border-bottom: 1px solid #f1f2f4;
      font-weight: 800;
      white-space: nowrap;
    }
    tr:hover td { background: #f9fafb; }
    .empty {
      padding: 40px;
      color: #9ca3af;
      font-weight: 900;
      text-align: center;
    }
    @media (max-width: 720px) {
      body { padding: 16px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .actions { justify-content: flex-start; }
      a, button { padding: 10px 14px; font-size: 14px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="topbar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">${table.rows.length} รายการ · อัปเดตล่าสุด ${escapeHtml(updatedAt)}</div>
      </div>
      <div class="actions">
        <a href="/tables/inventory">วัตถุดิบ</a>
        <a href="/tables/employees">พนักงาน</a>
        <a href="/tables/sales">รายรับ</a>
        <a class="primary" href="/api/tables/${tableName}.csv">CSV</a>
        <button type="button" onclick="location.reload()">รีเฟรช</button>
      </div>
    </div>
    <section class="card">
      ${
        table.rows.length
          ? `<div class="table-wrap"><table><thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
          : `<div class="empty">ยังไม่มีข้อมูล</div>`
      }
    </section>
  </main>
</body>
</html>`;
}

function isValidSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.salesData) &&
      Array.isArray(snapshot.inventory) &&
      Array.isArray(snapshot.employees) &&
      snapshot.dailyRecords &&
      typeof snapshot.dailyRecords === "object",
  );
}

async function readSnapshot() {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeSnapshot(snapshot) {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(BACKUP_DIR, { recursive: true });

  const previous = await readSnapshot();
  if (previous) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(join(BACKUP_DIR, `mkm-pos-db-${stamp}.json`), JSON.stringify(previous, null, 2));
  }

  const next = {
    ...snapshot,
    savedAt: new Date().toISOString(),
    source: "mkm-pos-backend",
  };
  const tmpFile = `${DB_FILE}.tmp`;
  await writeFile(tmpFile, JSON.stringify(next, null, 2));
  await rename(tmpFile, DB_FILE);
  return next;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        name: "MKM.POS Backend",
        host: HOST,
        port: PORT,
        database: DB_FILE,
      });
      return;
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/tables")) {
      const snapshot = (await readSnapshot()) || { salesData: [], inventory: [], employees: [], dailyRecords: {} };
      sendText(res, 200, htmlPortalPage(snapshot), "text/html; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/snapshot") {
      const snapshot = await readSnapshot();
      if (!snapshot) {
        sendJson(res, 404, { ok: false, error: "Database is empty" });
        return;
      }
      sendJson(res, 200, { ok: true, data: snapshot });
      return;
    }

    const tableMatch = url.pathname.match(/^\/(?:api\/tables|tables)\/(inventory|employees|sales)(?:\.csv)?$/);
    if (req.method === "GET" && tableMatch) {
      const snapshot = await readSnapshot();
      if (!snapshot) {
        sendJson(res, 404, { ok: false, error: "Database is empty" });
        return;
      }
      const table = getTableRows(snapshot, tableMatch[1]);
      if (!table) {
        sendJson(res, 404, { ok: false, error: "Unknown table" });
        return;
      }
      if (url.pathname.endsWith(".csv")) {
        sendText(res, 200, csvFromRows(table.headers, table.rows), "text/csv; charset=utf-8");
        return;
      }
      if (url.pathname.startsWith("/tables/")) {
        sendText(res, 200, htmlTablePage(tableMatch[1], table, snapshot), "text/html; charset=utf-8");
        return;
      }
      sendJson(res, 200, { ok: true, table: tableMatch[1], rows: table.rows });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/snapshot") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const snapshot = payload?.data || payload?.snapshot || payload;
      if (!isValidSnapshot(snapshot)) {
        sendJson(res, 400, { ok: false, error: "Invalid MKM.POS snapshot" });
        return;
      }
      const saved = await writeSnapshot(snapshot);
      sendJson(res, 200, {
        ok: true,
        savedAt: saved.savedAt,
        counts: {
          salesData: saved.salesData.length,
          inventory: saved.inventory.length,
          employees: saved.employees.length,
          dailyRecordDays: Object.keys(saved.dailyRecords || {}).length,
        },
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  const visibleHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`MKM.POS backend ready at http://${visibleHost}:${PORT}`);
  console.log(`Database file: ${DB_FILE}`);
});
