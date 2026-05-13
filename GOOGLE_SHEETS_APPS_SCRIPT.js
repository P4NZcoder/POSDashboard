// Optional: paste your Google Sheet ID here if this Apps Script is not opened from Extensions > Apps Script inside the Sheet.
// Example Sheet URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = "";

const SHEET_NAMES = {
  salesData: "Sales",
  inventory: "Inventory",
  employees: "Employees",
  dailyRecords: "DailyRecords",
  settings: "Settings",
};

const HEADERS = {
  salesData: ["id", "timestamp", "table", "total", "cash", "transfer", "grab", "status"],
  inventory: ["id", "name", "category", "stock", "unit"],
  employees: ["id", "name", "role", "baseWage", "bankAcc", "bankName"],
  dailyRecords: ["date", "employeeId", "status", "late", "advance", "meal"],
  settings: ["key", "value"],
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || "read";
  const callback = params.callback;
  let payload;
  if (action === "read") {
    payload = { ok: true, spreadsheet: getSpreadsheetInfo_(), data: readSnapshot_() };
  } else if (action === "ping") {
    payload = { ok: true, spreadsheet: getSpreadsheetInfo_(), checkedAt: new Date().toISOString() };
  } else {
    payload = { ok: false, error: "Unknown action" };
  }

  if (callback) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(payload)});`).setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({
        ok: false,
        error: "doPost must be called by the MKM.POS app or an HTTP POST request, not by the Apps Script Run button.",
      });
    }
    const payload = JSON.parse(e.postData.contents || "{}");
    writeSnapshot_(payload);
    return json_({ ok: true, spreadsheet: getSpreadsheetInfo_(), syncedAt: new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function runManualCheck() {
  const snapshot = readSnapshot_();
  Logger.log(JSON.stringify({ ok: true, spreadsheet: getSpreadsheetInfo_(), salesCount: snapshot.salesData.length }));
  return snapshot;
}

function writeSnapshot_(payload) {
  writeRows_("salesData", payload.salesData || []);
  writeRows_("inventory", payload.inventory || []);
  writeRows_("employees", payload.employees || []);
  writeDailyRecords_(payload.dailyRecords || {});
  writeSettings_(payload.settings || {}, payload.syncedAt);
}

function readSnapshot_() {
  return {
    salesData: readRows_("salesData").map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      table: row.table,
      total: number_(row.total),
      cash: number_(row.cash),
      transfer: number_(row.transfer),
      grab: number_(row.grab),
      status: row.status,
    })),
    inventory: readRows_("inventory").map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      stock: number_(row.stock),
      unit: row.unit,
    })),
    employees: readRows_("employees").map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      baseWage: number_(row.baseWage),
      bankAcc: row.bankAcc,
      bankName: row.bankName,
    })),
    dailyRecords: readDailyRecords_(),
    settings: readSettings_(),
  };
}

function writeRows_(type, rows) {
  const sheet = getSheet_(type);
  const headers = HEADERS[type];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (!rows.length) return;
  const values = rows.map((row) => headers.map((key) => row[key] == null ? "" : row[key]));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function readRows_(type) {
  const sheet = getSheet_(type);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || HEADERS[type];
  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      headers.reduce((acc, key, index) => {
        acc[key] = row[index];
        return acc;
      }, {}),
    );
}

function writeDailyRecords_(records) {
  const rows = [];
  Object.entries(records).forEach(([date, employees]) => {
    Object.entries(employees || {}).forEach(([employeeId, record]) => {
      rows.push({
        date,
        employeeId,
        status: record.status,
        late: record.late,
        advance: record.advance,
        meal: record.meal,
      });
    });
  });
  writeRows_("dailyRecords", rows);
}

function readDailyRecords_() {
  return readRows_("dailyRecords").reduce((acc, row) => {
    if (!row.date || !row.employeeId) return acc;
    if (!acc[row.date]) acc[row.date] = {};
    acc[row.date][row.employeeId] = {
      status: row.status || "present",
      late: number_(row.late),
      advance: number_(row.advance),
      meal: number_(row.meal),
    };
    return acc;
  }, {});
}

function writeSettings_(settings, syncedAt) {
  const safeSettings = Object.assign({}, settings, { lastSyncedAt: syncedAt || new Date().toISOString() });
  const rows = Object.entries(safeSettings).map(([key, value]) => ({
    key,
    value: typeof value === "object" ? JSON.stringify(value) : value,
  }));
  writeRows_("settings", rows);
}

function readSettings_() {
  return readRows_("settings").reduce((acc, row) => {
    if (!row.key) return acc;
    acc[row.key] = parseValue_(row.value);
    return acc;
  }, {});
}

function getSheet_(type) {
  const ss = getSpreadsheet_();
  const name = SHEET_NAMES[type];
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("No active spreadsheet. Open Apps Script from the target Sheet, or set SPREADSHEET_ID in the script.");
  }
  return ss;
}

function getSpreadsheetInfo_() {
  const ss = getSpreadsheet_();
  return {
    id: ss.getId(),
    name: ss.getName(),
    url: ss.getUrl(),
  };
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function number_(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseValue_(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}
