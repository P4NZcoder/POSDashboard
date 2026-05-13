import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Database,
  Download,
  Edit3,
  Filter,
  History,
  Home,
  MoreVertical,
  Moon,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const DEFAULT_SHEETS_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbxrHAKfCcAPNz03K1QHVl9ogH6_vnXa3u7BS9YB_yT-KLaSU7jFpUkpUlb0WU_PNd5Q/exec";
const SHEETS_DOCUMENT_URL = "https://docs.google.com/spreadsheets/d/18EcbrQRrJkgIlpvHPzEhrs0NlU9Tqi8EXZ64mXN5pcc/edit";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8787";
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0y4cmJGTtAF62C6hyaD2w8kAGMIM1UQs",
  authDomain: "database-ffb59.firebaseapp.com",
  databaseURL: "https://database-ffb59-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "database-ffb59",
  storageBucket: "database-ffb59.firebasestorage.app",
  messagingSenderId: "419251050069",
  appId: "1:419251050069:web:0feca598ac733041dee6dc",
  measurementId: "G-6YXQEVXKCG",
};
const DEFAULT_FIREBASE_CONFIG_TEXT = JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayKey = () => localDateKey(new Date());
const dateKey = (value) => new Date(value).toISOString().slice(0, 10);
const monthKey = (value) => dateKey(value).slice(0, 7);
const yearKey = (value) => dateKey(value).slice(0, 4);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
const money = (value) =>
  Number(value || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
const numberOnly = (value) => Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function salesCsvContent(rows) {
  const headers = ["id", "timestamp", "table", "total", "cash", "transfer", "grab", "status"];
  const body = rows.map((sale) =>
    [sale.id, sale.timestamp, sale.table, sale.total, sale.cash, sale.transfer, sale.grab || 0, sale.status].map(csvValue).join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

function getStorageSizeKb(keys) {
  try {
    const bytes = keys.reduce((sum, key) => sum + (localStorage.getItem(key)?.length || 0), 0) * 2;
    return Math.round((bytes / 1024) * 10) / 10;
  } catch {
    return 0;
  }
}

const tabs = [
  { id: "dashboard", label: "ภาพรวม", icon: Home },
  { id: "billing", label: "รับชำระเงิน", icon: Receipt },
  { id: "history", label: "รายรับ", icon: History },
  { id: "employees", label: "พนักงาน", icon: Users },
  { id: "inventory", label: "คลังวัตถุดิบ", icon: Package },
  { id: "database", label: "ข้อมูล", icon: Database },
];

const INVENTORY_CATEGORIES = ["ของสด", "ผัก", "อื่นๆ"];
const LEGACY_INVENTORY_CATEGORY_MAP = {
  เนื้อสัตว์: "ของสด",
  ทะเล: "ของสด",
  ซอส: "ของสด",
  เครื่องดื่ม: "อื่นๆ",
  ทั่วไป: "อื่นๆ",
};
const normalizeInventoryCategory = (category) => {
  const value = String(category || "").trim();
  if (INVENTORY_CATEGORIES.includes(value)) return value;
  return LEGACY_INVENTORY_CATEGORY_MAP[value] || "อื่นๆ";
};

const initialSales = [
  {
    id: "BILL-1007",
    timestamp: new Date().toISOString(),
    table: "A7",
    total: 3290,
    cash: 1290,
    transfer: 2000,
    status: "success",
  },
  {
    id: "BILL-1006",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    table: "B2",
    total: 1890,
    cash: 1890,
    transfer: 0,
    status: "success",
  },
  {
    id: "BILL-1005",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    table: "C3",
    total: 2450,
    cash: 450,
    transfer: 2000,
    status: "success",
  },
  {
    id: "BILL-1004",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    table: "A4",
    total: 1780,
    cash: 0,
    transfer: 1780,
    status: "success",
  },
  {
    id: "BILL-1003",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    table: "B5",
    total: 920,
    cash: 920,
    transfer: 0,
    status: "cancelled",
  },
  {
    id: "BILL-1002",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    table: "D1",
    total: 4120,
    cash: 2120,
    transfer: 2000,
    status: "success",
  },
];

const initialInventory = [
  { id: "inv-1", name: "หมูสามชั้นสไลซ์", category: "ของสด", stock: 18, unit: "กก." },
  { id: "inv-2", name: "หมูนุ่มหมัก", category: "ของสด", stock: 22, unit: "กก." },
  { id: "inv-3", name: "กุ้งสด", category: "ของสด", stock: 8, unit: "กก." },
  { id: "inv-4", name: "ผักรวม", category: "ผัก", stock: 14, unit: "ลัง" },
  { id: "inv-5", name: "น้ำจิ้มสูตรร้าน", category: "ของสด", stock: 7, unit: "ถัง" },
];

const initialEmployees = [
  { id: "emp-1", name: "เมย์", role: "หน้าร้าน", baseWage: 520, bankAcc: "123-4-56789-0", bankName: "กสิกร" },
  { id: "emp-2", name: "บอย", role: "ครัว", baseWage: 560, bankAcc: "987-6-54321-0", bankName: "ไทยพาณิชย์" },
  { id: "emp-3", name: "ฝน", role: "แคชเชียร์", baseWage: 600, bankAcc: "222-1-88888-1", bankName: "กรุงไทย" },
];

const initialDailyRecords = {
  [todayKey()]: {
    "emp-1": { status: "present", late: 0, advance: 0, meal: 40 },
    "emp-2": { status: "present", late: 20, advance: 0, meal: 40 },
    "emp-3": { status: "off", late: 0, advance: 0, meal: 0 },
  },
};

const defaultSettings = {
  salesTarget: 45000,
  geminiKey: "YOUR_KEY",
  sheetsWebhook: DEFAULT_SHEETS_WEBHOOK,
  backendUrl: DEFAULT_BACKEND_URL,
  backendSyncEnabled: false,
  firebaseSyncEnabled: true,
  firebaseConfig: DEFAULT_FIREBASE_CONFIG_TEXT,
  firebaseCollection: "mkm_pos",
  firebaseDocId: "main",
  autoSyncEnabled: false,
  autoPullIntervalSec: 15,
};

function buildSheetsSnapshot({ salesData, inventory, employees, dailyRecords, settings }) {
  return {
    action: "save",
    salesData,
    inventory,
    employees,
    dailyRecords,
    settings: { ...settings, geminiKey: undefined },
    syncedAt: new Date().toISOString(),
  };
}

function getSheetsUrlError(url) {
  if (!url) return "กรุณาใส่ Google Apps Script Web App URL ก่อน";
  if (url.includes("script.googleusercontent.com/macros/echo")) {
    return "ลิงก์นี้เป็น echo URL ชั่วคราว ให้ใช้ Web App URL รูปแบบ https://script.google.com/macros/s/.../exec";
  }
  if (!url.includes("script.google.com/macros/s/") || !url.includes("/exec")) {
    return "URL ควรเป็น Web App URL จาก Deploy รูปแบบ https://script.google.com/macros/s/.../exec";
  }
  return "";
}

function getEffectiveSheetsWebhook(settings) {
  const savedWebhook = settings?.sheetsWebhook || "";
  if (!DEFAULT_SHEETS_WEBHOOK || getSheetsUrlError(DEFAULT_SHEETS_WEBHOOK)) {
    return getSheetsUrlError(savedWebhook) ? "" : savedWebhook;
  }
  return DEFAULT_SHEETS_WEBHOOK;
}

function getEffectiveBackendUrl(settings) {
  return String(settings?.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
}

function backendEndpoint(baseUrl, path) {
  return `${getEffectiveBackendUrl({ backendUrl: baseUrl })}${path}`;
}

async function postBackendSnapshot(baseUrl, snapshot) {
  const response = await fetch(backendEndpoint(baseUrl, "/api/snapshot"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) throw new Error(`Backend save failed: ${response.status}`);
  return response.json();
}

async function readBackendSnapshot(baseUrl) {
  const response = await fetch(backendEndpoint(baseUrl, "/api/snapshot"));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Backend read failed: ${response.status}`);
  const payload = await response.json();
  return payload?.data || payload?.snapshot || payload;
}

function parseFirebaseConfig(settings) {
  const raw = String(settings?.firebaseConfig || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasFirebaseConfig(settings) {
  const config = parseFirebaseConfig(settings);
  return Boolean(config?.apiKey && config?.projectId && config?.appId);
}

let firebaseModulesPromise = null;
function loadFirebaseModules() {
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = Promise.all([import("firebase/app"), import("firebase/firestore"), import("firebase/database")]).then(([app, firestore, database]) => ({
      initializeApp: app.initializeApp,
      getApp: app.getApp,
      getApps: app.getApps,
      dbGet: database.get,
      getDatabase: database.getDatabase,
      doc: firestore.doc,
      ref: database.ref,
      getDoc: firestore.getDoc,
      getFirestore: firestore.getFirestore,
      onSnapshot: firestore.onSnapshot,
      onValue: database.onValue,
      setDoc: firestore.setDoc,
      rtdbSet: database.set,
    }));
  }
  return firebaseModulesPromise;
}

async function getFirebaseDb(settings) {
  const config = parseFirebaseConfig(settings);
  if (!config) throw new Error("Missing Firebase config");
  const { initializeApp, getApp, getApps, getFirestore } = await loadFirebaseModules();
  const appName = `mkm-pos-${config.projectId || "default"}`;
  const app = getApps().some((item) => item.name === appName) ? getApp(appName) : initializeApp(config, appName);
  return getFirestore(app);
}

async function getFirebaseDocRef(settings) {
  const { doc } = await loadFirebaseModules();
  const db = await getFirebaseDb(settings);
  const collectionName = String(settings?.firebaseCollection || "mkm_pos").trim() || "mkm_pos";
  const docId = String(settings?.firebaseDocId || "main").trim() || "main";
  return doc(db, collectionName, docId);
}

async function getFirebaseRealtimeRef(settings) {
  const config = parseFirebaseConfig(settings);
  if (!config) throw new Error("Missing Firebase config");
  const { initializeApp, getApp, getApps, getDatabase, ref } = await loadFirebaseModules();
  const appName = `mkm-pos-${config.projectId || "default"}`;
  const app = getApps().some((item) => item.name === appName) ? getApp(appName) : initializeApp(config, appName);
  const db = getDatabase(app);
  const collectionName = String(settings?.firebaseCollection || "mkm_pos").trim() || "mkm_pos";
  const docId = String(settings?.firebaseDocId || "main").trim() || "main";
  return ref(db, `${collectionName}/${docId}`);
}

async function postFirebaseSnapshot(settings, snapshot) {
  const config = parseFirebaseConfig(settings);
  if (config?.databaseURL) {
    const { rtdbSet } = await loadFirebaseModules();
    await rtdbSet(await getFirebaseRealtimeRef(settings), {
      ...snapshot,
      savedAt: new Date().toISOString(),
      source: "firebase-realtime-database",
    });
    return true;
  }
  const { setDoc } = await loadFirebaseModules();
  await setDoc(await getFirebaseDocRef(settings), {
    ...snapshot,
    savedAt: new Date().toISOString(),
    source: "firebase-firestore",
  });
  return true;
}

async function readFirebaseSnapshot(settings) {
  const config = parseFirebaseConfig(settings);
  if (config?.databaseURL) {
    const { dbGet } = await loadFirebaseModules();
    const snap = await dbGet(await getFirebaseRealtimeRef(settings));
    return snap.exists() ? snap.val() : null;
  }
  const { getDoc } = await loadFirebaseModules();
  const snap = await getDoc(await getFirebaseDocRef(settings));
  return snap.exists() ? snap.data() : null;
}

async function subscribeFirebaseSnapshot(settings, onSnapshotValue, onError) {
  const config = parseFirebaseConfig(settings);
  if (config?.databaseURL) {
    const { onValue } = await loadFirebaseModules();
    const dbRef = await getFirebaseRealtimeRef(settings);
    return onValue(
      dbRef,
      (snap) => onSnapshotValue(snap.exists() ? snap.val() : null),
      (error) => onError?.(error),
    );
  }
  const { onSnapshot } = await loadFirebaseModules();
  const docRef = await getFirebaseDocRef(settings);
  return onSnapshot(
    docRef,
    (snap) => onSnapshotValue(snap.exists() ? snap.data() : null),
    (error) => onError?.(error),
  );
}

function postSheetsSnapshot(url, snapshot) {
  return fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    keepalive: true,
    body: JSON.stringify(snapshot),
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readSheetsSnapshot(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Missing Google Sheets Web App URL"));
      return;
    }
    const callbackName = `mkmSheetsCallback_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets read timed out"));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      if (payload?.ok === false) {
        reject(new Error(payload.error || "Google Sheets returned an error"));
        return;
      }
      resolve(payload?.data || payload?.snapshot || payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Cannot load Google Sheets Web App"));
    };
    script.src = `${url}${separator}action=read&callback=${callbackName}&ts=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function isValidSheetsSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.salesData) &&
      Array.isArray(snapshot.inventory) &&
      Array.isArray(snapshot.employees) &&
      snapshot.dailyRecords &&
      typeof snapshot.dailyRecords === "object",
  );
}

function getSnapshotSignature(snapshot) {
  return JSON.stringify({
    salesData: snapshot.salesData || [],
    inventory: snapshot.inventory || [],
    employees: snapshot.employees || [],
    dailyRecords: snapshot.dailyRecords || {},
    settings: {
      salesTarget: snapshot.settings?.salesTarget,
    },
  });
}

const MKM_DB_NAME = "mkm-pos-durable-store";
const MKM_DB_VERSION = 1;
const MKM_DB_STORE = "records";
const STORAGE_ENVELOPE = "__mkmStoredValue";

function packStoredValue(value, updatedAt = Date.now()) {
  return { [STORAGE_ENVELOPE]: true, version: 1, updatedAt, value };
}

function unpackStoredValue(parsed, initialValue) {
  if (parsed && parsed[STORAGE_ENVELOPE]) {
    return {
      value: parsed.value ?? initialValue,
      updatedAt: Number(parsed.updatedAt || 0),
    };
  }
  return {
    value: parsed ?? initialValue,
    updatedAt: 0,
  };
}

function readLocalRecord(key, initialValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { value: initialValue, updatedAt: 0 };
    return unpackStoredValue(JSON.parse(raw), initialValue);
  } catch {
    return { value: initialValue, updatedAt: 0 };
  }
}

function openDurableDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(MKM_DB_NAME, MKM_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MKM_DB_STORE)) {
        db.createObjectStore(MKM_DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function durableGet(key) {
  const db = await openDurableDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MKM_DB_STORE, "readonly");
    const request = tx.objectStore(MKM_DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function durableSet(key, value, updatedAt = Date.now()) {
  const db = await openDurableDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MKM_DB_STORE, "readwrite");
    tx.objectStore(MKM_DB_STORE).put({ key, value, updatedAt });
    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    return readLocalRecord(key, initialValue).value;
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    durableGet(key)
      .then((record) => {
        if (!mounted || !record) return;
        const localRecord = readLocalRecord(key, initialValue);
        if (Number(record.updatedAt || 0) > Number(localRecord.updatedAt || 0)) {
          setValue(record.value ?? initialValue);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(packStoredValue(value, updatedAt)));
    durableSet(key, value, updatedAt).catch(() => undefined);
  }, [key, value, hydrated]);

  return [value, setValue];
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(39,37,62,0.07)] ${className}`}
    >
      {children}
    </section>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm font-extrabold text-[#454554] transition hover:border-[#d1d5db] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose, footer, className = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <Card className={`w-full max-w-xl p-6 ${className}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </Card>
    </div>
  );
}

function ConfirmModal({ confirm, onCancel, onConfirm }) {
  if (!confirm) return null;
  return (
    <Modal
      title={confirm.title}
      onClose={onCancel}
      footer={
        <>
          <SecondaryButton onClick={onCancel}>ยกเลิก</SecondaryButton>
          <PrimaryButton onClick={() => onConfirm(confirm)}>{confirm.action || "ยืนยัน"}</PrimaryButton>
        </>
      }
    >
      <p className="text-gray-600">{confirm.message}</p>
    </Modal>
  );
}

function SuccessOverlay({ show, text }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 rounded-[32px] bg-white px-12 py-10 shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
        <div className="rounded-full bg-emerald-50 p-5 text-emerald-500">
          <CheckCircle size={72} strokeWidth={1.8} />
        </div>
        <p className="text-2xl font-extrabold text-gray-900">{text}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-full border border-[#e5e7eb] bg-white px-4 py-3 text-base font-bold text-[#1b1b23] outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
      />
    </label>
  );
}

function StatusTag({ status }) {
  const success = status === "success";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
        success ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      }`}
    >
      {success ? "สำเร็จ" : "ยกเลิก"}
    </span>
  );
}

function SparkLineGauge({ value, target }) {
  const percent = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  const radius = 78;
  const circumference = Math.PI * radius;
  const dash = (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="h-32 w-full">
        <path
          d="M22 100a78 78 0 0 1 156 0"
          fill="none"
          stroke="#eef2f7"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M22 100a78 78 0 0 1 156 0"
          fill="none"
          stroke="url(#gaugeBlue)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <defs>
          <linearGradient id="gaugeBlue" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-8 text-center">
        <p className="text-3xl font-extrabold text-gray-900">{percent}%</p>
        <p className="text-sm font-bold text-gray-400">ของเป้าหมาย</p>
      </div>
    </div>
  );
}

function buildChartData(sales, range) {
  const now = new Date();
  const days = range === "1D" ? 1 : range === "1W" ? 7 : range === "1M" ? 30 : 12;
  if (range === "1Y") {
    return Array.from({ length: 12 }).map((_, index) => {
      const month = new Date(now.getFullYear(), index, 1);
      const key = `${now.getFullYear()}-${String(index + 1).padStart(2, "0")}`;
      const rows = sales.filter((sale) => monthKey(sale.timestamp) === key && sale.status === "success");
      return {
        label: month.toLocaleDateString("th-TH", { month: "short" }),
        total: rows.reduce((sum, sale) => sum + sale.total, 0),
        cash: rows.reduce((sum, sale) => sum + sale.cash, 0),
        transfer: rows.reduce((sum, sale) => sum + sale.transfer, 0),
      };
    });
  }
  return Array.from({ length: days }).map((_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (days - index - 1));
    const key = dateKey(day);
    const rows = sales.filter((sale) => dateKey(sale.timestamp) === key && sale.status === "success");
    return {
      label: range === "1D" ? "วันนี้" : day.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
      total: rows.reduce((sum, sale) => sum + sale.total, 0),
      cash: rows.reduce((sum, sale) => sum + sale.cash, 0),
      transfer: rows.reduce((sum, sale) => sum + sale.transfer, 0),
    };
  });
}

function WidgetHeader({ icon: Icon, title, action }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3f4f6] text-[#454554]">
          <Icon size={18} />
        </div>
        <h2 className="truncate text-lg font-extrabold text-[#1b1b23]">{title}</h2>
      </div>
      {action || (
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554]">
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  );
}

function compactMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `฿${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `฿${amount.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function RevenueMiniChart({ data = [], tone = "green", label = "Revenue trend" }) {
  const stroke = tone === "green" ? "#6aa989" : "#ff8b70";
  const fillId = tone === "green" ? "revGreen" : "revCoral";
  const values = data.length ? data : [0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const spread = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 82 : 8 + (index / (values.length - 1)) * 148;
    const y = 84 - ((value - min) / spread) * 62;
    return { x, y, value };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)} 96 L${points[0].x.toFixed(1)} 96 Z`;
  const activePoint = points.reduce((best, point) => (point.value >= best.value ? point : best), points[0]);

  return (
    <svg viewBox="0 0 164 96" className="mt-3 h-20 w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[24, 48, 72].map((y) => (
        <line key={y} x1="8" x2="156" y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={activePoint.x} x2={activePoint.x} y1={activePoint.y} y2="92" stroke={stroke} strokeOpacity="0.18" strokeWidth="8" />
      <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="white" stroke={stroke} strokeWidth="3" />
    </svg>
  );
}

function SalesChart({ sales, showSuccess }) {
  const [range, setRange] = useState("1W");
  const [activeIndex, setActiveIndex] = useState(null);
  const data = useMemo(() => {
    const rows = buildChartData(sales, range);
    if (range === "1M") return rows.slice(-10);
    if (range === "1Y") return rows;
    return rows;
  }, [sales, range]);
  const maxValue = Math.max(...data.map((row) => row.total), 1);
  const yMax = Math.max(1000, Math.ceil(maxValue / 1000) * 1000);
  const yTicks = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0];
  const hasSales = data.some((row) => row.total > 0);
  const highlightIndex = data.reduce((bestIndex, row, index) => (row.total >= data[bestIndex].total ? index : bestIndex), 0);
  const activeRow = activeIndex == null ? null : data[activeIndex];
  const exportChart = () => {
    const headers = ["label", "total", "cash", "transfer"];
    const rows = data.map((row) => [row.label, row.total, row.cash, row.transfer].map(csvValue).join(","));
    downloadTextFile(`mkm-total-sales-${range}-${todayKey()}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
    showSuccess?.("ดาวน์โหลดกราฟแล้ว");
  };

  return (
    <Card className="overflow-visible p-6 lg:col-span-8">
      <WidgetHeader
        icon={Wallet}
        title="Total Sales"
        action={
          <div className="flex items-center rounded-full border border-[#e5e7eb] bg-white p-1">
            {[
              ["1D", "1D"],
              ["1W", "1W"],
              ["1M", "1M"],
              ["1Y", "1Y"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setRange(id);
                  setActiveIndex(null);
                }}
                className={`h-9 rounded-full px-3 text-xs font-extrabold transition ${
                  range === id ? "bg-[#2563eb] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]" : "text-[#767686] hover:text-[#1b1b23]"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={exportChart}
              title="ดาวน์โหลดข้อมูลกราฟ"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              <Download size={17} />
            </button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-extrabold text-[#767686]">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
          เงินโอน
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6d4d]" />
          เงินสด
        </span>
        <span className="ml-auto text-[#454554]">สูงสุด {compactMoney(maxValue)}</span>
      </div>
      <div className="grid h-[330px] grid-cols-[54px_1fr] gap-3">
        <div className="relative h-[260px]">
          {yTicks.map((tick, index) => (
            <div
              key={tick}
              className="absolute right-0 translate-y-1/2 text-[11px] font-extrabold text-[#a4a1b1]"
              style={{ bottom: `${100 - index * 25}%` }}
            >
              {compactMoney(tick)}
            </div>
          ))}
        </div>
        <div className="relative min-w-0">
          <div className="absolute inset-x-0 top-0 h-[260px]">
            {[0, 25, 50, 75, 100].map((line) => (
              <div key={line} className="absolute left-0 right-0 border-t border-dashed border-[#e5e7eb]" style={{ bottom: `${line}%` }} />
            ))}
          </div>
          {!hasSales && (
            <div className="absolute inset-x-0 top-12 z-10 rounded-[24px] border border-dashed border-[#d1d5db] bg-white/70 p-5 text-center text-sm font-bold text-[#767686]">
              ยังไม่มีข้อมูลยอดขายในช่วงนี้
            </div>
          )}
          <div className="relative z-20 flex h-[302px] items-end gap-2 sm:gap-3">
            {data.map((row, index) => {
              const totalHeight = row.total ? Math.max(10, (row.total / yMax) * 100) : 4;
              const cashPercent = row.total ? (row.cash / row.total) * 100 : 0;
              const transferPercent = row.total ? (row.transfer / row.total) * 100 : 0;
              const isHot = index === highlightIndex && row.total > 0;
              const isActive = activeIndex === index;
              return (
                <div
                  key={`${row.label}-${index}`}
                  className="group relative flex min-w-0 flex-1 flex-col items-center gap-3"
                >
                  {isActive && row.total > 0 && (
                    <div className="absolute bottom-[58px] left-1/2 z-50 w-40 -translate-x-1/2 rounded-[18px] bg-[#11131f] p-3 text-xs font-extrabold text-white shadow-[0_18px_45px_rgba(17,19,31,0.22)]">
                      <p className="mb-1 text-white/70">{row.label}</p>
                      <p>รวม {money(row.total)}</p>
                      <p className="text-[#ffb68f]">เงินสด {money(row.cash)}</p>
                      <p className="text-[#bfdbfe]">เงินโอน {money(row.transfer)}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveIndex((current) => (current === index ? null : index))}
                    className="flex h-[260px] w-full items-end justify-center rounded-none bg-transparent p-0 outline-none"
                    aria-label={`ดูยอดขาย ${row.label}`}
                  >
                    <span
                      className={`relative flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-t-[18px] rounded-b-lg bg-[#f3f4f6] transition duration-300 ${
                        isActive ? "scale-105 shadow-[0_16px_30px_rgba(37,99,235,0.16)]" : ""
                      }`}
                      style={{ height: `${totalHeight}%` }}
                    >
                      {row.total > 0 ? (
                        <>
                          <div className="bg-[#2563eb]" style={{ height: `${transferPercent}%` }} />
                          <div className="bg-[#ff6d4d]" style={{ height: `${cashPercent}%` }} />
                        </>
                      ) : (
                        <div className="h-full bg-[repeating-linear-gradient(135deg,#f3f4f6_0,#f3f4f6_6px,#f3f4f6_6px,#f3f4f6_10px)]" />
                      )}
                      {isHot && <div className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 rounded-full bg-white/90" />}
                    </span>
                  </button>
                  <span className="w-full truncate text-center text-[11px] font-extrabold text-[#767686]">{row.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Dashboard({ salesData, inventory, settings, setSettings, setActiveTab, showSuccess }) {
  const [recentRange, setRecentRange] = useState("1W");
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState(settings.salesTarget || 0);
  const today = todayKey();
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  const successful = salesData.filter((sale) => sale.status === "success");
  const todaySales = successful
    .filter((sale) => dateKey(sale.timestamp) === today)
    .reduce((sum, sale) => sum + sale.total, 0);
  const yesterdaySales = successful
    .filter((sale) => dateKey(sale.timestamp) === yesterday)
    .reduce((sum, sale) => sum + sale.total, 0);
  const diff = yesterdaySales ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : todaySales ? 100 : 0;
  const cash = successful
    .filter((sale) => dateKey(sale.timestamp) === today)
    .reduce((sum, sale) => sum + sale.cash, 0);
  const transfer = successful
    .filter((sale) => dateKey(sale.timestamp) === today)
    .reduce((sum, sale) => sum + sale.transfer, 0);
  const todayBills = successful.filter((sale) => dateKey(sale.timestamp) === today);
  const todayBillCount = todayBills.length;
  const averageBill = todayBillCount ? todaySales / todayBillCount : 0;
  const paidToday = cash + transfer;
  const transferShare = paidToday ? Math.round((transfer / paidToday) * 100) : 0;
  const cashShare = paidToday ? 100 - transferShare : 0;
  const latest = [...salesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  const recentOptions = [
    ["1D", "วันนี้"],
    ["1W", "7 วัน"],
    ["ALL", "ทั้งหมด"],
  ];
  const recentLabel = recentOptions.find(([id]) => id === recentRange)?.[1] || "7 วัน";
  const recentCutoff = recentRange === "1D" ? 1 : recentRange === "1W" ? 7 : null;
  const recentSales = latest.filter((sale) => {
    if (!recentCutoff) return true;
    return Date.now() - new Date(sale.timestamp).getTime() <= recentCutoff * MS_PER_DAY;
  });
  const cycleRecentRange = () => {
    const index = recentOptions.findIndex(([id]) => id === recentRange);
    setRecentRange(recentOptions[(index + 1) % recentOptions.length][0]);
  };
  const saveTarget = () => {
    setSettings?.((prev) => ({ ...prev, salesTarget: numberOnly(targetDraft) || prev.salesTarget }));
    setTargetOpen(false);
    showSuccess?.("อัปเดตเป้าหมายแล้ว");
  };

  const inventoryGroups = Object.entries(
    inventory.reduce((acc, item) => {
      const category = normalizeInventoryCategory(item.category);
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {}),
  ).slice(0, 5);
  const growthPercent = Math.min(99, Math.max(8, Math.round((todaySales / Math.max(settings.salesTarget, 1)) * 100)));
  const revenueTrend = useMemo(() => buildChartData(salesData, "1W"), [salesData]);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <SalesChart sales={salesData} showSuccess={showSuccess} />

      <Card className="self-start p-5 lg:col-span-4">
        <WidgetHeader
          icon={Receipt}
          title="Sales Revenue"
          action={
            <button
              type="button"
              onClick={() => setActiveTab?.("history")}
              title="เปิดประวัติรายรับ"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              <History size={17} />
            </button>
          }
        />
        <div className="grid divide-y divide-[#e5e7eb] md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="pb-3 md:pb-0 md:pr-4">
            <div className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-600">
              <ArrowUp size={14} />
              {Math.max(0, diff).toFixed(0)}% for 1 day
            </div>
            <p className="mt-1 text-3xl font-extrabold tracking-normal text-[#1b1b23]">{money(transfer)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#767686]">
              <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
              Received Amount
            </p>
            <RevenueMiniChart data={revenueTrend.map((row) => row.transfer)} tone="green" label="Transfer revenue trend" />
          </div>
          <div className="pt-3 md:pl-4 md:pt-0">
            <div className="inline-flex items-center gap-1 text-sm font-extrabold text-[#ff6d4d]">
              <ArrowDown size={14} />
              {cash > transfer ? "8" : "4"}%
            </div>
            <p className="mt-1 text-3xl font-extrabold tracking-normal text-[#1b1b23]">{money(cash)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-[#767686]">
              <span className="h-2 w-2 rounded-full bg-[#ff6d4d]" />
              Cash Amount
            </p>
            <RevenueMiniChart data={revenueTrend.map((row) => row.cash)} tone="coral" label="Cash revenue trend" />
          </div>
        </div>
        <div className="mt-4 rounded-[24px] bg-[#f9fafb] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-[#1b1b23]">Today Summary</p>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {diff >= 0 ? "+" : ""}{diff.toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold text-[#767686]">จำนวนบิล</p>
              <p className="mt-1 text-xl font-extrabold text-[#1b1b23]">{todayBillCount}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#767686]">เฉลี่ย/บิล</p>
              <p className="mt-1 text-xl font-extrabold text-[#1b1b23]">{money(averageBill)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-[#767686]">
              <span>เงินโอน {transferShare}%</span>
              <span>เงินสด {cashShare}%</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-[#f3f4f6]">
              <div className="bg-[#2563eb]" style={{ width: `${transferShare}%` }} />
              <div className="bg-[#ff6d4d]" style={{ width: `${cashShare}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex h-[380px] flex-col p-6 lg:col-span-6">
        <WidgetHeader
          icon={Activity}
          title="Recent sales"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleRecentRange}
                title="เปลี่ยนช่วงเวลาบิลล่าสุด"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
              >
                <Filter size={17} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.("history")}
                title="เปิดหน้าประวัติ"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
              >
                <History size={17} />
              </button>
              <button
                type="button"
                onClick={cycleRecentRange}
                className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-extrabold text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
              >
                {recentLabel}
              </button>
            </div>
          }
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          {recentSales.slice(0, 4).map((sale, index) => (
            <div key={sale.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-[22px] px-2 py-2 transition hover:bg-[#f9fafb]">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f3f4f6] text-sm font-extrabold text-[#454554]">
                {sale.table}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-[#1b1b23]">{sale.id}</p>
                <p className="text-xs font-bold text-[#767686]">{index === 0 ? "Today" : `${index + 1} Days Ago`}</p>
              </div>
              <StatusTag status={sale.status} />
              <p className="text-right text-base font-extrabold text-[#1b1b23]">+{money(sale.total)}</p>
            </div>
          ))}
          {!recentSales.length && (
            <div className="rounded-[22px] border border-dashed border-[#e5e7eb] p-5 text-center text-sm font-bold text-[#767686]">
              ไม่มีบิลในช่วง {recentLabel}
            </div>
          )}
        </div>
      </Card>

      <Card className="flex h-[380px] flex-col p-6 lg:col-span-3">
        <WidgetHeader
          icon={Sparkles}
          title="Growth"
          action={
            <button
              type="button"
              onClick={() => {
                setTargetDraft(settings.salesTarget || 0);
                setTargetOpen(true);
              }}
              title="แก้เป้าหมายยอดขาย"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[#454554] transition hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              <Edit3 size={17} />
            </button>
          }
        />
        <div className="grid min-h-0 flex-1 place-items-center">
          <div className="relative h-64 w-64 max-w-full">
            <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
              <circle cx="110" cy="110" r="76" fill="none" stroke="#f3f4f6" strokeWidth="32" strokeLinecap="round" />
              <circle
                cx="110"
                cy="110"
                r="76"
                fill="none"
                stroke="#2563eb"
                strokeWidth="32"
                strokeLinecap="round"
                strokeDasharray={`${(growthPercent / 100) * 477} 477`}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-4xl font-extrabold text-[#1b1b23]">+{growthPercent}%</p>
                <p className="text-base font-bold text-[#767686]">Growth rate</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex h-[380px] flex-col p-6 lg:col-span-3">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f4f6] text-[#454554]">
              <Package size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-[#1b1b23]">วัตถุดิบ</h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab?.("inventory")}
            className="rounded-full bg-[#f3f4f6] px-3 py-2 text-xs font-extrabold text-[#454554] transition hover:bg-[#e5e7eb]"
          >
            {inventory.length} รายการ
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
          {inventoryGroups.map(([category, items]) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveTab?.("inventory")}
              className="flex w-full items-center justify-between gap-3 rounded-[22px] bg-[#f9fafb] px-4 py-3 text-left transition hover:bg-[#f3f4f6]"
            >
              <div className="min-w-0">
                <p className="truncate font-extrabold text-[#1b1b23]">{category}</p>
                <p className="truncate text-xs font-bold text-[#767686]">{items.slice(0, 2).map((item) => item.name).join(", ")}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-gray-500">{items.length}</span>
            </button>
          ))}
        </div>
      </Card>
      {targetOpen && (
        <Modal
          title="ตั้งเป้าหมายยอดขาย"
          onClose={() => setTargetOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setTargetOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={saveTarget}>บันทึกเป้าหมาย</PrimaryButton>
            </>
          }
        >
          <Field label="เป้าหมายยอดขายต่อวัน" type="number" value={targetDraft} onChange={setTargetDraft} />
        </Modal>
      )}
    </div>
  );
}

function Billing({ salesData, setSalesData, showSuccess }) {
  const [form, setForm] = useState({ table: "", total: "", received: "", method: "" });
  const [calcInput, setCalcInput] = useState("");
  const [calcItems, setCalcItems] = useState([]);
  const total = numberOnly(form.total);
  const received = numberOnly(form.received);
  const balance = received - total;
  const isReady = Boolean(form.table.trim()) && total > 0 && received >= total && Boolean(form.method);
  const tablePresets = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "กลับบ้าน"];
  const quickAmounts = [280, 350, 500, 1000];
  const calcTotal = calcItems.reduce((sum, item) => sum + item, 0);
  const latestBills = [...salesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const evaluateCalc = () => {
    const expression = calcInput.replace(/×/g, "*").replace(/÷/g, "/");
    if (!expression || !/^[\d+\-*/. ]+$/.test(expression)) return 0;
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return Number.isFinite(result) ? Math.round(result * 100) / 100 : 0;
    } catch {
      return 0;
    }
  };
  const handleCalcKey = (key) => {
    if (key === "C") return setCalcInput("");
    if (key === "←") return setCalcInput((prev) => prev.slice(0, -1));
    if (key === "=") {
      const result = evaluateCalc();
      if (result) setCalcInput(String(result));
      return;
    }
    if (key === "+บิล") return addCalcItem();
    if (["+", "-", "×", "÷"].includes(key)) {
      setCalcInput((prev) => {
        if (!prev) return key === "-" ? "-" : prev;
        return /[+\-×÷]$/.test(prev) ? `${prev.slice(0, -1)}${key}` : `${prev}${key}`;
      });
      return;
    }
    if (key === "." && calcInput.split(/[+\-×÷]/).at(-1)?.includes(".")) return;
    setCalcInput((prev) => `${prev}${key}`);
  };
  const addCalcItem = () => {
    const amount = evaluateCalc() || numberOnly(calcInput);
    if (!amount) return;
    const nextItems = [...calcItems, amount];
    const nextTotal = nextItems.reduce((sum, item) => sum + item, 0);
    setCalcItems(nextItems);
    setCalcInput("");
    setField("total", String(nextTotal));
  };
  const clearCalculator = () => {
    setCalcInput("");
    setCalcItems([]);
    setField("total", "");
  };
  const removeCalcItem = (index) => {
    const nextItems = calcItems.filter((_, itemIndex) => itemIndex !== index);
    const nextTotal = nextItems.reduce((sum, item) => sum + item, 0);
    setCalcItems(nextItems);
    setField("total", nextTotal ? String(nextTotal) : "");
  };

  const save = (methodOverride = form.method, receivedOverride = received) => {
    if (!form.table || total <= 0 || receivedOverride < total || !methodOverride) return;
    const bill = {
      id: `BILL-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      table: form.table,
      total,
      cash: methodOverride === "cash" ? total : 0,
      transfer: methodOverride === "transfer" ? total : 0,
      grab: methodOverride === "grab" ? total : 0,
      paymentMethod: methodOverride,
      status: "success",
    };
    setSalesData((prev) => [bill, ...prev]);
    setForm({ table: "", total: "", received: "", method: "" });
    setCalcInput("");
    setCalcItems([]);
    showSuccess("บันทึกสำเร็จ");
  };

  const selectPaymentMethod = (method) => {
    if (!total) return;
    const nextReceived = received > 0 ? received : total;
    if (form.table.trim() && nextReceived === total) {
      save(method, nextReceived);
      return;
    }
    setForm((prev) => ({
      ...prev,
      method,
      received: prev.received || String(total),
    }));
  };

  return (
    <div className="mx-auto max-w-[1420px]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">รับชำระเงิน</h1>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-gray-100 text-gray-600">
              <Banknote size={32} />
            </div>
          </div>

          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(430px,1.08fr)_minmax(320px,0.84fr)]">
            <div className="flex min-h-[720px] flex-col rounded-[32px] border border-gray-100 bg-gray-50 p-5">
              <div className="mb-4 flex justify-end">
                <SecondaryButton onClick={clearCalculator} className="h-12 px-7 text-base">
                  ล้าง
                </SecondaryButton>
              </div>
              <div className="mb-4 flex h-28 items-center justify-end rounded-[24px] border border-gray-200 bg-white px-6 text-right">
                <p className="min-w-0 truncate text-6xl font-black leading-none text-gray-950">{calcInput || "0"}</p>
              </div>
              <div className="grid flex-1 grid-cols-4 gap-3">
                {["C", "←", "÷", "×", "7", "8", "9", "-", "4", "5", "6", "+", "1", "2", "3", "=", "0", "00", ".", "+บิล"].map((key) => {
                  const isAction = ["=", "+บิล"].includes(key);
                  const isOperator = ["C", "←", "÷", "×", "-", "+"].includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleCalcKey(key)}
                      className={`min-h-0 rounded-[22px] text-2xl font-black transition ${
                        isAction
                          ? "bg-[#2563eb] text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)]"
                          : isOperator
                            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[24px] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-lg font-black text-gray-400">รายการบวก</p>
                  <p className="text-2xl font-black text-gray-950">{money(calcTotal)}</p>
                </div>
                {calcItems.length ? (
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                    {calcItems.map((item, index) => (
                      <button key={`${item}-${index}`} onClick={() => removeCalcItem(index)} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-extrabold text-gray-600">
                        {money(item)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-10" />
                )}
              </div>
            </div>

            <div className="flex h-full flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-500">เลขโต๊ะ</label>
                <input
                  value={form.table}
                  onChange={(event) => setField("table", event.target.value)}
                  className="h-16 w-full rounded-[24px] border border-gray-200 bg-white px-5 text-3xl font-black text-gray-950 outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                />
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {tablePresets.map((table) => (
                    <button
                      key={table}
                      onClick={() => setField("table", table)}
                      className={`h-11 rounded-full text-sm font-black transition ${
                        form.table === table ? "bg-[#2563eb] text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {table}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-500">ยอดบิลสุทธิ</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">฿</span>
                  <input
                    value={form.total}
                    onChange={(event) => setField("total", event.target.value)}
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    className="h-20 w-full rounded-[28px] border border-gray-200 bg-gray-50 px-14 text-right text-5xl font-black text-gray-950 outline-none transition focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-100"
                  />
                </div>
              </div>
              <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-gray-500">จำนวนเงินที่รับมา</p>
                  <Banknote size={18} className="text-gray-400" />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-300">฿</span>
                  <input
                    value={form.received}
                    onChange={(event) => setField("received", event.target.value)}
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    className="h-16 w-full rounded-2xl border border-gray-200 bg-white px-10 text-right text-4xl font-black text-gray-950 outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                  />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setField("received", String(amount))}
                      className={`h-11 rounded-full text-sm font-black transition ${
                        received === amount ? "bg-[#2563eb] text-white shadow-[0_10px_22px_rgba(37,99,235,0.20)]" : "bg-white text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  ["cash", "เงินสด", Banknote],
                  ["transfer", "เงินโอน", Wallet],
                  ["grab", "Grab", Package],
                ].map(([method, label, Icon]) => (
                  <button
                    key={method}
                    onClick={() => selectPaymentMethod(method)}
                    disabled={!total}
                    className={`flex h-16 items-center justify-center gap-2 rounded-[22px] border text-base font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      form.method === method ? "border-[#2563eb] bg-[#2563eb] text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>
              <SecondaryButton onClick={() => setForm((prev) => ({ ...prev, received: "", method: "" }))} className="w-full px-3 py-3 text-sm">
                ล้างยอดรับ
              </SecondaryButton>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="flex flex-col p-5">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-950">{form.table || "ยังไม่เลือกโต๊ะ"}</h2>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-500">
                <Receipt size={22} />
              </div>
            </div>

            <div className="space-y-3 py-5">
              {[
                ["ยอดบิล", money(total)],
                ["รับมา", money(received)],
                ["ช่องทาง", form.method === "cash" ? "เงินสด" : form.method === "transfer" ? "เงินโอน" : form.method === "grab" ? "Grab" : "-"],
                ["บันทึกเป็นรายรับ", money(received >= total ? total : 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-extrabold text-gray-500">{label}</span>
                  <span className="text-base font-black text-gray-950">{value}</span>
                </div>
              ))}
            </div>

            <div className={`rounded-[28px] p-5 ${balance >= 0 ? "bg-gray-950 text-white" : "bg-rose-50 text-rose-600"}`}>
              <p className="text-sm font-extrabold opacity-80">{balance >= 0 ? "เงินทอน" : "ยอดที่ยังขาด"}</p>
              <p className="mt-2 text-4xl font-black">{money(Math.abs(balance))}</p>
            </div>

            <PrimaryButton onClick={save} className="mt-5 w-full py-4 text-lg" disabled={!isReady}>
              <CheckCircle size={22} />
              บันทึกบิล
            </PrimaryButton>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-950">บิลล่าสุด</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-500">{latestBills.length}</span>
            </div>
            <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1">
              {latestBills.length ? (
                latestBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-gray-950">{bill.table}</p>
                      <p className="truncate text-xs font-bold text-gray-400">
                        {new Date(bill.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {bill.paymentMethod === "grab" ? "Grab" : bill.transfer ? "เงินโอน" : "เงินสด"}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-black text-gray-950">{money(bill.total)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-gray-50 p-5 text-center text-sm font-bold text-gray-400">ยังไม่มีบิลล่าสุด</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function summarizeSales(rows, mode) {
  if (mode === "bill") return rows;
  const groups = rows.reduce((acc, sale) => {
    const key = mode === "day" ? dateKey(sale.timestamp) : mode === "month" ? monthKey(sale.timestamp) : yearKey(sale.timestamp);
    acc[key] ||= { id: key, timestamp: sale.timestamp, table: key, total: 0, cash: 0, transfer: 0, grab: 0, status: "success", count: 0 };
    if (sale.status === "success") {
      acc[key].total += sale.total;
      acc[key].cash += sale.cash;
      acc[key].transfer += sale.transfer;
      acc[key].grab += sale.grab || 0;
      acc[key].count += 1;
    }
    return acc;
  }, {});
  return Object.values(groups).sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

function HistoryTab({ salesData, setSalesData, showSuccess }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState("bill");
  const [visibleCount, setVisibleCount] = useState(50);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfill, setBackfill] = useState({ date: todayKey(), total: "", cash: "", transfer: "" });

  const filtered = useMemo(() => {
    const rows = salesData
      .filter((sale) => {
        const text = `${sale.id} ${sale.table}`.toLowerCase();
        const day = dateKey(sale.timestamp);
        return (
          text.includes(query.toLowerCase()) &&
          (status === "all" || sale.status === status) &&
          (!start || day >= start) &&
          (!end || day <= end)
        );
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return summarizeSales(rows, mode);
  }, [salesData, query, status, start, end, mode]);

  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(50);
  }, [query, status, start, end, mode]);

  const exportCsv = () => {
    const headers = ["id", "date", "table", "total", "cash", "transfer", "grab", "status"];
    const body = filtered.map((sale) =>
      [sale.id, dateKey(sale.timestamp), sale.table, sale.total, sale.cash, sale.transfer, sale.grab || 0, sale.status].map(csvValue).join(","),
    );
    downloadTextFile(`mkm-pos-${mode}-${todayKey()}.csv`, [headers.join(","), ...body].join("\n"), "text/csv;charset=utf-8");
  };

  const addBackfill = () => {
    const bill = {
      id: `BACK-${Date.now().toString().slice(-6)}`,
      timestamp: new Date(backfill.date).toISOString(),
      table: "ย้อนหลัง",
      total: numberOnly(backfill.total),
      cash: numberOnly(backfill.cash),
      transfer: numberOnly(backfill.transfer),
      grab: 0,
      status: "success",
    };
    setSalesData((prev) => [bill, ...prev]);
    setBackfillOpen(false);
    showSuccess("เพิ่มยอดย้อนหลังแล้ว");
  };

  return (
    <div className="space-y-5">
      <Card className="hidden">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto_auto]">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาบิลหรือโต๊ะ"
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-gray-200 px-4 font-bold outline-none">
            <option value="all">ทุกสถานะ</option>
            <option value="success">สำเร็จ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="rounded-full border border-gray-200 px-4 font-bold outline-none" />
          <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="rounded-full border border-gray-200 px-4 font-bold outline-none" />
          <SecondaryButton onClick={() => setBackfillOpen(true)}>
            <Plus size={18} />
            เพิ่มย้อนหลัง
          </SecondaryButton>
          <PrimaryButton onClick={exportCsv}>
            <Download size={18} />
            Excel
          </PrimaryButton>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["bill", "รายบิล"],
            ["day", "สรุปรายวัน"],
            ["month", "สรุปรายเดือน"],
            ["year", "สรุปรายปี"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`rounded-full px-4 py-2 text-sm font-extrabold ${
                mode === id ? "bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]" : "bg-gray-100 text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {visibleRows.map((sale) => (
          <Card key={sale.id} className="p-4">
            <div className="flex items-center gap-4">
              <div
                className={`rounded-full p-3 ${
                  sale.status === "cancelled" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {sale.status === "cancelled" ? <XCircle size={22} /> : <ArrowDown size={22} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-gray-900">{mode === "bill" ? sale.id : sale.table}</p>
                  {mode === "bill" && <StatusTag status={sale.status} />}
                </div>
                <p className="text-sm font-bold text-gray-400">
                  {mode === "bill" ? `โต๊ะ ${sale.table} · ${new Date(sale.timestamp).toLocaleString("th-TH")}` : `${sale.count || 0} บิล`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-gray-900">{money(sale.total)}</p>
                <p className="text-sm font-bold text-gray-400">สด {money(sale.cash)} · โอน {money(sale.transfer)}{sale.grab ? ` · Grab ${money(sale.grab)}` : ""}</p>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length > visibleCount && (
          <div className="flex justify-center pt-2">
            <SecondaryButton onClick={() => setVisibleCount((count) => count + 50)}>
              <Plus size={18} />
              โหลดเพิ่มอีก 50 รายการ
            </SecondaryButton>
          </div>
        )}
      </div>

      {backfillOpen && (
        <Modal
          title="เพิ่มยอดย้อนหลัง"
          onClose={() => setBackfillOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setBackfillOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={addBackfill}>บันทึก</PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="วันที่" type="date" value={backfill.date} onChange={(value) => setBackfill((prev) => ({ ...prev, date: value }))} />
            <Field label="ยอดรวม" type="number" value={backfill.total} onChange={(value) => setBackfill((prev) => ({ ...prev, total: value }))} />
            <Field label="เงินสด" type="number" value={backfill.cash} onChange={(value) => setBackfill((prev) => ({ ...prev, cash: value }))} />
            <Field label="เงินโอน" type="number" value={backfill.transfer} onChange={(value) => setBackfill((prev) => ({ ...prev, transfer: value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmployeesTab({ employees, setEmployees, dailyRecords, setDailyRecords, showSuccess }) {
  const [subTab, setSubTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [calendarMonth, setCalendarMonth] = useState(todayKey().slice(0, 7));
  const [calendarEmployeeId, setCalendarEmployeeId] = useState("all");
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [payrollRuns, setPayrollRuns] = useLocalStorage("mkm.payrollRuns", []);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payrollMode, setPayrollMode] = useState("firstWeek");
  const [payrollStart, setPayrollStart] = useState(todayKey());
  const [payrollEnd, setPayrollEnd] = useState(todayKey());
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeDetailId, setEmployeeDetailId] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    role: "",
    baseWage: "",
    bankAcc: "",
    bankName: "",
  });
  const records = dailyRecords[selectedDate] || {};
  const presentCount = employees.filter((employee) => records[employee.id]?.status === "present").length;
  const offCount = employees.filter((employee) => records[employee.id]?.status === "off").length;
  const leaveCount = employees.filter((employee) => records[employee.id]?.status === "leave").length;
  const absentCount = employees.filter((employee) => records[employee.id]?.status === "absent").length;
  const cycleDates = useMemo(() => {
    return Array.from({ length: 15 }).map((_, index) => {
      const day = new Date(selectedDate);
      day.setDate(day.getDate() - (14 - index));
      return dateKey(day);
    });
  }, [selectedDate]);

  const getPayrollPeriod = () => {
    if (payrollMode === "custom") {
      return {
        label: "ตัดก่อนกำหนด",
        start: payrollStart,
        end: payrollEnd || payrollStart,
      };
    }
    const base = new Date(`${selectedDate}T00:00:00`);
    const year = base.getFullYear();
    const month = base.getMonth();
    if (payrollMode === "firstWeek") {
      return {
        label: "Week แรก",
        start: localDateKey(new Date(year, month, 1)),
        end: localDateKey(new Date(year, month, 7)),
      };
    }
    const isFirstHalf = base.getDate() <= 15;
    return {
      label: "รอบ 15 วัน",
      start: localDateKey(new Date(year, month, isFirstHalf ? 1 : 16)),
      end: localDateKey(new Date(year, month + (isFirstHalf ? 0 : 1), isFirstHalf ? 15 : 0)),
    };
  };

  const payrollPeriod = getPayrollPeriod();
  const payrollDates = useMemo(() => {
    const start = new Date(`${payrollPeriod.start}T00:00:00`);
    const end = new Date(`${payrollPeriod.end}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const days = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      days.push(localDateKey(new Date(date)));
    }
    return days;
  }, [payrollPeriod.start, payrollPeriod.end]);

  const calendarEmployees = useMemo(() => {
    if (calendarEmployeeId === "all") return employees;
    return employees.filter((employee) => employee.id === calendarEmployeeId);
  }, [employees, calendarEmployeeId]);

  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => localDateKey(new Date(year, month - 1, index + 1))),
    ];
  }, [calendarMonth]);

  const monthDates = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => localDateKey(new Date(year, month - 1, index + 1)));
  }, [calendarMonth]);

  const calendarCells = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        day: localDateKey(date),
        inMonth: date.getMonth() === month - 1,
      };
    });
  }, [calendarMonth]);

  const getDayStats = (day, sourceEmployees = calendarEmployees) => {
    const dayRecords = dailyRecords[day] || {};
    return sourceEmployees.reduce(
      (acc, employee) => {
        const status = dayRecords[employee.id]?.status || "none";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { present: 0, late: 0, off: 0, leave: 0, absent: 0, none: 0 },
    );
  };

  const monthStats = useMemo(() => {
    return calendarDays.filter(Boolean).reduce(
      (acc, day) => {
        const stats = getDayStats(day, employees);
        acc.present += stats.present;
        acc.off += stats.off;
        acc.leave += stats.leave;
        acc.absent += stats.absent;
        acc.none += stats.none;
        if (employees.length && stats.off === employees.length) acc.closedDays += 1;
        return acc;
      },
      { present: 0, off: 0, leave: 0, absent: 0, none: 0, closedDays: 0 },
    );
  }, [calendarDays, dailyRecords, employees]);

  const changeCalendarMonth = (delta) => {
    const [year, month] = calendarMonth.split("-").map(Number);
    setCalendarMonth(localDateKey(new Date(year, month - 1 + delta, 1)).slice(0, 7));
  };

  const openCalendarDay = (day) => {
    setSelectedDate(day);
    setDayModalOpen(true);
  };

  const statusMeta = {
    present: { label: "มาทำงาน", short: "มา", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    late: { label: "มาสาย", short: "สาย", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    off: { label: "วันหยุด", short: "หยุด", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
    leave: { label: "ลา", short: "ลา", tone: "bg-gray-100 text-gray-600", dot: "bg-gray-1000" },
    absent: { label: "ขาดงาน", short: "ขาด", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
    none: { label: "ยังไม่เช็ค", short: "ยังไม่เช็ค", tone: "bg-gray-100 text-gray-500", dot: "bg-gray-300" },
  };

  const selectedDayRows = employees
    .map((employee) => ({
      employee,
      record: dailyRecords[selectedDate]?.[employee.id],
    }))
    .sort((a, b) => {
      const priority = { absent: 0, late: 1, present: 2, leave: 3, off: 4, none: 5 };
      const aStatus = a.record?.status || "none";
      const bStatus = b.record?.status || "none";
      return (priority[aStatus] ?? 5) - (priority[bStatus] ?? 5);
    });
  const selectedDayStats = getDayStats(selectedDate, employees);
  const selectedDone = employees.length - selectedDayStats.none;
  const selectedDonePercent = employees.length ? Math.round((selectedDone / employees.length) * 100) : 0;

  const hasLateRecord = (day, sourceEmployees = calendarEmployees) => {
    const dayRecords = dailyRecords[day] || {};
    return sourceEmployees.some((employee) => dayRecords[employee.id]?.status === "late" || (dayRecords[employee.id]?.status === "present" && numberOnly(dayRecords[employee.id]?.late) > 0));
  };

  const getCalendarDayTone = (day, stats) => {
    if (calendarEmployees.length && stats.off === calendarEmployees.length) return "border-slate-200 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 text-slate-500";
    if (stats.absent > 0) return "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100 to-red-200 text-rose-700";
    if (hasLateRecord(day)) return "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-100 to-orange-200 text-amber-800";
    if (stats.leave > 0) return "border-gray-200 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-600";
    if (calendarEmployees.length && stats.present === calendarEmployees.length) return "border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-100 to-teal-200 text-emerald-700";
    return "border-gray-100 bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-500";
  };

  const monthTitle = new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthRangeText = (() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const getRecordTime = (record, fallback = "09:00") => record?.time || record?.checkIn || fallback;

  const getCalendarEvents = (day, sourceEmployees = calendarEmployees) => {
    const stats = getDayStats(day, sourceEmployees);
    if (sourceEmployees.length && stats.off === sourceEmployees.length) {
      return [{ id: `${day}-closed`, status: "closed", label: "วันหยุดร้าน", time: "", tone: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-500" }];
    }
    const events = [];
    sourceEmployees.forEach((employee) => {
      const record = dailyRecords[day]?.[employee.id];
      if (!record?.status) return;
      const late = numberOnly(record?.late);
      if (record?.status === "absent") {
        events.push({ id: `${day}-${employee.id}-absent`, status: "absent", label: `${employee.name} ขาด`, time: getRecordTime(record), tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" });
      } else if (record?.status === "leave") {
        events.push({ id: `${day}-${employee.id}-leave`, status: "leave", label: `${employee.name} ลา`, time: getRecordTime(record), tone: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" });
      } else if (record?.status === "off") {
        events.push({ id: `${day}-${employee.id}-off`, status: "off", label: `${employee.name} หยุด`, time: getRecordTime(record), tone: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" });
      } else if (record?.status === "late" || (record?.status === "present" && late > 0)) {
        events.push({ id: `${day}-${employee.id}-late`, status: "late", label: `${employee.name} มาสาย`, time: getRecordTime(record, "09:30"), tone: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" });
      } else if (record?.status === "present") {
        events.push({ id: `${day}-${employee.id}-present`, status: "present", label: employee.name, time: getRecordTime(record), tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" });
      }
    });
    return events;
  };

  const getCalendarPreviewEvents = (events) => {
    if (calendarEmployeeId !== "all") return events.slice(0, 2);
    const importantEvents = events.filter((event) => ["absent", "leave", "late", "closed"].includes(event.status));
    return importantEvents.slice(0, 2);
  };

  const employeeMonthSummaries = useMemo(() => {
    return employees.map((employee) => {
      const summary = monthDates.reduce(
        (acc, day) => {
          const record = dailyRecords[day]?.[employee.id];
          const status = record?.status || "none";
          acc.days.push({ day, record });
          if (status === "present") acc.present += 1;
          if (status === "late") acc.late += 1;
          if (status === "absent") acc.absent += 1;
          if (status === "leave") acc.leave += 1;
          if (status === "off") acc.off += 1;
          acc.lateMoney += numberOnly(record?.late);
          acc.advance += numberOnly(record?.advance);
          acc.deduct += numberOnly(record?.meal);
          return acc;
        },
        { present: 0, late: 0, absent: 0, leave: 0, off: 0, lateMoney: 0, advance: 0, deduct: 0, days: [] },
      );
      const workDays = summary.present + summary.late;
      const gross = workDays * numberOnly(employee.baseWage);
      const totalDeduct = summary.lateMoney + summary.advance + summary.deduct;
      const attendancePercent = monthDates.length ? Math.round((workDays / monthDates.length) * 100) : 0;
      return {
        employee,
        ...summary,
        workDays,
        gross,
        totalDeduct,
        net: gross - totalDeduct,
        attendancePercent,
        bonusReady: attendancePercent === 100 && monthDates.length > 0,
      };
    });
  }, [employees, monthDates, dailyRecords]);

  const selectedEmployeeSummary = employeeMonthSummaries.find((summary) => summary.employee.id === employeeDetailId);

  const getStatusTrackClass = (record) => {
    const status = record?.status || "none";
    if (status === "present") return "bg-gray-950";
    if (status === "late" || (status === "present" && numberOnly(record?.late) > 0)) return "bg-amber-400";
    if (status === "absent") return "bg-rose-400";
    if (status === "leave") return "bg-gray-400";
    if (status === "off") return "bg-slate-300";
    return "bg-gray-100";
  };

  const getProgressFillClass = (percent) => {
    if (percent >= 100) return "bg-blue-600";
    if (percent >= 60) return "bg-blue-500";
    return "bg-blue-400";
  };

  const payrollRows = useMemo(() => {
    return employees.map((employee) => {
      const summary = payrollDates.reduce(
        (acc, day) => {
          const record = dailyRecords[day]?.[employee.id];
          if (record?.status === "present" || record?.status === "late") acc.days += 1;
          if (record?.status === "absent") acc.absent += 1;
          if (record?.status === "off") acc.off += 1;
          if (record?.status === "leave") acc.leave += 1;
          acc.late += numberOnly(record?.late);
          acc.advance += numberOnly(record?.advance);
          acc.meal += numberOnly(record?.meal);
          return acc;
        },
        { days: 0, absent: 0, off: 0, leave: 0, late: 0, advance: 0, meal: 0 },
      );
      const gross = summary.days * numberOnly(employee.baseWage);
      const deduct = summary.late + summary.advance + summary.meal;
      return {
        employee,
        ...summary,
        gross,
        deduct,
        net: gross - deduct,
      };
    });
  }, [employees, payrollDates, dailyRecords]);

  const payrollTotal = payrollRows.reduce((sum, row) => sum + row.net, 0);

  const updateRecord = (employeeId, patch) => {
    setDailyRecords((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        [employeeId]: {
          status: "present",
          time: currentTimeValue(),
          late: 0,
          advance: 0,
          meal: 0,
          ...(prev[selectedDate]?.[employeeId] || {}),
          ...patch,
        },
      },
    }));
  };

  const setHoliday = () => {
    setDailyRecords((prev) => ({
      ...prev,
      [selectedDate]: employees.reduce((acc, emp) => {
        acc[emp.id] = { status: "off", time: prev[selectedDate]?.[emp.id]?.time || currentTimeValue(), late: 0, advance: 0, meal: 0 };
        return acc;
      }, {}),
    }));
    showSuccess("ตั้งเป็นวันหยุดร้านแล้ว");
  };

  const setAllPresent = () => {
    setDailyRecords((prev) => ({
      ...prev,
      [selectedDate]: employees.reduce((acc, emp) => {
        acc[emp.id] = {
          status: "present",
          time: prev[selectedDate]?.[emp.id]?.time || currentTimeValue(),
          late: prev[selectedDate]?.[emp.id]?.late || 0,
          advance: prev[selectedDate]?.[emp.id]?.advance || 0,
          meal: prev[selectedDate]?.[emp.id]?.meal || 0,
        };
        return acc;
      }, {}),
    }));
    showSuccess("เช็คชื่อมาทำงานครบแล้ว");
  };

  const saveAttendance = () => {
    setDailyRecords((prev) => ({
      ...prev,
      [selectedDate]: employees.reduce((acc, emp) => {
        acc[emp.id] = {
          status: "present",
          time: currentTimeValue(),
          late: 0,
          advance: 0,
          meal: 0,
          ...(prev[selectedDate]?.[emp.id] || {}),
        };
        return acc;
      }, {}),
    }));
    showSuccess("บันทึกเช็คชื่อแล้ว");
  };

  const addEmployee = () => {
    if (!employeeForm.name.trim()) return;
    const employee = {
      id: uid("emp"),
      name: employeeForm.name.trim(),
      role: employeeForm.role.trim() || "พนักงาน",
      baseWage: numberOnly(employeeForm.baseWage),
      bankAcc: employeeForm.bankAcc.trim(),
      bankName: employeeForm.bankName.trim(),
    };
    setEmployees((prev) => [...prev, employee]);
    setEmployeeForm({ name: "", role: "", baseWage: "", bankAcc: "", bankName: "" });
    setEmployeeModalOpen(false);
    showSuccess("เพิ่มพนักงานแล้ว");
  };

  const removeEmployee = (employeeId) => {
    setEmployees((prev) => prev.filter((employee) => employee.id !== employeeId));
    showSuccess("ลบพนักงานแล้ว");
  };

  const employeeSummary = (employee) => {
    return cycleDates.reduce(
      (acc, day) => {
        const record = dailyRecords[day]?.[employee.id];
        if (record?.status === "present" || record?.status === "late") acc.days += 1;
        acc.late += numberOnly(record?.late);
        acc.advance += numberOnly(record?.advance);
        acc.meal += numberOnly(record?.meal);
        return acc;
      },
      { days: 0, late: 0, advance: 0, meal: 0 },
    );
  };

  const copySlip = async (employee) => {
    const summary = employeeSummary(employee);
    const gross = summary.days * employee.baseWage;
    const deduct = summary.late + summary.advance + summary.meal;
    const text = [`ชื่อ: ${employee.name}`, `ยอดเงิน: ${money(gross - deduct)}`, `ธนาคาร: ${employee.bankName || "-"}`, `เลขบัญชี: ${employee.bankAcc || "-"}`].join("\n");
    await navigator.clipboard.writeText(text);
    showSuccess("คัดลอกสลิปแล้ว");
  };

  const payrollText = () => {
    return payrollRows
      .map((row) =>
        [`ชื่อ: ${row.employee.name}`, `ยอดเงิน: ${money(row.net)}`, `ธนาคาร: ${row.employee.bankName || "-"}`, `เลขบัญชี: ${row.employee.bankAcc || "-"}`].join("\n"),
      )
      .join("\n\n");
  };

  const copyPayroll = async () => {
    await navigator.clipboard.writeText(payrollText());
    showSuccess("คัดลอกสรุปตัดยอดแล้ว");
  };

  const savePayrollRun = () => {
    const run = {
      id: uid("payroll"),
      createdAt: new Date().toISOString(),
      mode: payrollMode,
      label: payrollPeriod.label,
      start: payrollPeriod.start,
      end: payrollPeriod.end,
      total: payrollTotal,
      rows: payrollRows.map((row) => ({
        employeeId: row.employee.id,
        name: row.employee.name,
        role: row.employee.role,
        bankName: row.employee.bankName,
        bankAcc: row.employee.bankAcc,
        days: row.days,
        absent: row.absent,
        off: row.off,
        leave: row.leave,
        gross: row.gross,
        late: row.late,
        advance: row.advance,
        meal: row.meal,
        deduct: row.deduct,
        net: row.net,
      })),
    };
    setPayrollRuns((prev) => [run, ...prev].slice(0, 24));
    setPayrollOpen(false);
    showSuccess("บันทึกรอบตัดยอดแล้ว");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-gray-400">Employees</p>
            <h1 className="text-3xl font-extrabold text-gray-900">ปฏิทินพนักงาน</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => setSubTab(subTab === "summary" ? "calendar" : "summary")} className="py-2.5">
              <Clipboard size={17} />
              สรุปค่าแรง
            </SecondaryButton>
            <PrimaryButton onClick={() => setEmployeeModalOpen(true)} className="py-2.5">
              <Plus size={18} />
              เพิ่มพนักงาน
            </PrimaryButton>
            <PrimaryButton onClick={() => setPayrollOpen(true)} className="py-2.5">
              <Wallet size={18} />
              ตัดยอด
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
                <span className="text-[11px] font-extrabold uppercase text-gray-500">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span>
                <span className="text-2xl font-black leading-none text-gray-950">{Number(selectedDate.slice(-2))}</span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-950">{monthTitle}</h1>
                <p className="mt-1 text-sm font-bold text-gray-500">{monthRangeText}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100" aria-label="ค้นหา">
                <Search size={20} />
              </button>
              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button onClick={() => changeCalendarMonth(-1)} className="flex h-11 w-12 items-center justify-center border-r border-gray-200 text-gray-500 transition hover:bg-gray-50" aria-label="เดือนก่อนหน้า">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setCalendarMonth(todayKey().slice(0, 7))} className="h-11 border-r border-gray-200 px-5 text-sm font-extrabold text-gray-900">
                  Today
                </button>
                <button onClick={() => changeCalendarMonth(1)} className="flex h-11 w-12 items-center justify-center text-gray-500 transition hover:bg-gray-50" aria-label="เดือนถัดไป">
                  <ChevronRight size={18} />
                </button>
              </div>
              <select
                value={calendarEmployeeId}
                onChange={(event) => setCalendarEmployeeId(event.target.value)}
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-800 outline-none"
              >
                <option value="all">Month view</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
              <SecondaryButton onClick={() => setSubTab(subTab === "summary" ? "calendar" : "summary")} className="hidden py-2.5 lg:inline-flex">
                <Clipboard size={17} />
                สรุป
              </SecondaryButton>
              <button
                onClick={() => openCalendarDay(selectedDate)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] transition hover:bg-gray-800"
              >
                <Plus size={18} />
                เช็คชื่อวันนี้
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-7 border-b border-gray-100 bg-white text-center text-sm font-bold text-gray-600">
                {["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
                  <div key={weekday} className="border-r border-gray-100 py-4 last:border-r-0">{weekday}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map(({ day, inMonth }) => {
                  const events = getCalendarEvents(day);
                  const stats = getDayStats(day);
                  const visibleEvents = getCalendarPreviewEvents(events);
                  const hiddenCount = Math.max(0, events.length - visibleEvents.length);
                  const totalDone = stats.present + stats.late + stats.off + stats.leave + stats.absent;
                  const totalPeople = calendarEmployees.length;
                  const isToday = day === todayKey();
                  const isSelected = day === selectedDate;
                  return (
                    <button
                      key={day}
                      onClick={() => openCalendarDay(day)}
                      className={`min-h-[138px] border-b border-r border-gray-100 p-3 text-left transition hover:bg-gray-50 ${
                        !inMonth ? "bg-gray-50/60 text-gray-400" : "bg-white text-gray-950"
                      } ${isSelected ? "relative z-10 ring-2 ring-gray-900/80" : ""}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-extrabold ${isToday ? "bg-gray-950 text-white" : ""}`}>
                          {Number(day.slice(-2))}
                        </span>
                        {totalPeople > 0 && (
                          <span className="rounded-full bg-gray-50 px-2 py-1 text-[11px] font-extrabold text-gray-400">
                            {totalDone}/{totalPeople}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {calendarEmployeeId === "all" && events.some((event) => event.status === "present") && (
                          <div className="flex min-h-7 items-center justify-between rounded-md border border-gray-100 bg-white px-2 text-xs font-extrabold text-gray-500 shadow-sm">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                              <span className="truncate">มาทำงาน</span>
                            </span>
                            <span className="shrink-0 font-black text-gray-900">{stats.present}</span>
                          </div>
                        )}
                        {visibleEvents.map((event) => (
                          <div key={event.id} className={`flex min-h-7 items-center justify-between gap-2 rounded-md border px-2 text-xs font-extrabold shadow-sm ${event.tone}`}>
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${event.dot}`} />
                              <span className="truncate">{event.label}</span>
                            </span>
                            {event.time && <span className="shrink-0 font-bold opacity-80">{event.time}</span>}
                          </div>
                        ))}
                        {calendarEmployeeId === "all" && (stats.absent > 0 || stats.leave > 0 || stats.off > 0) && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {[
                              ["ขาด", stats.absent],
                              ["ลา", stats.leave],
                              ["หยุด", stats.off],
                            ]
                              .filter(([, value]) => value > 0)
                              .slice(0, 3)
                              .map(([label, value]) => (
                                <span key={label} className="rounded-full border border-gray-100 bg-white px-2 py-0.5 text-[11px] font-extrabold text-gray-500">
                                  {label} {value}
                                </span>
                              ))}
                          </div>
                        )}
                        {hiddenCount > 0 && <p className="px-1 text-xs font-bold text-gray-500">+{hiddenCount} รายการ</p>}
                        {!events.length && <div className="h-7" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-gray-400">รายพนักงาน</p>
                <p className="text-xl font-extrabold text-gray-900">{new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</p>
              </div>
              <SecondaryButton onClick={() => setEmployeeModalOpen(true)} className="h-10 w-10 px-0 py-0" aria-label="เพิ่มพนักงาน">
                <Plus size={17} />
              </SecondaryButton>
            </div>
            <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {employeeMonthSummaries.map((summary) => (
                <button
                  key={summary.employee.id}
                  onClick={() => setEmployeeDetailId(summary.employee.id)}
                  className="w-full rounded-[22px] border border-gray-100 bg-gray-50/80 p-4 text-left transition hover:border-gray-200 hover:bg-white hover:shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-gray-950">{summary.employee.name}</p>
                      <p className="truncate text-xs font-bold text-gray-400">{summary.employee.role} · {money(summary.employee.baseWage)}/วัน</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-extrabold text-gray-400">สุทธิ</p>
                      <p className="text-base font-black text-gray-950">+{money(summary.net)}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-full bg-gray-100 p-1">
                    <div className="relative h-4 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${getProgressFillClass(summary.attendancePercent)} transition-all`}
                        style={{ width: `${summary.attendancePercent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-wide text-white">
                        {summary.attendancePercent}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-gray-500">มา {summary.workDays}</span>
                    {summary.bonusReady && <span className="rounded-full bg-gray-950 px-2.5 py-1 text-[11px] font-black text-white">โบนัสพร้อม</span>}
                    {summary.late > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-gray-500">สาย {summary.late}</span>}
                    {summary.absent > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-gray-500">ขาด {summary.absent}</span>}
                    {summary.leave > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-gray-500">ลา {summary.leave}</span>}
                    {summary.totalDeduct > 0 && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-rose-500">-{money(summary.totalDeduct)}</span>}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {subTab === "summary" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <h2 className="text-xl font-extrabold text-gray-900">สรุปค่าแรง 15 วัน</h2>
            <SecondaryButton onClick={() => setSubTab("calendar")} className="py-2">
              <X size={16} />
              ปิด
            </SecondaryButton>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.8fr_auto] gap-3 border-b border-gray-100 px-6 py-4 text-sm font-extrabold text-gray-400">
              <span>พนักงาน</span>
              <span>บัญชีรับเงิน</span>
              <span>วันทำงาน</span>
              <span>ค่าแรงรวม</span>
              <span>หักรวม</span>
              <span>ยอดรับสุทธิ</span>
              <span></span>
            </div>
            {employees.map((employee) => {
              const summary = employeeSummary(employee);
              const gross = summary.days * employee.baseWage;
              const deduct = summary.late + summary.advance + summary.meal;
              return (
                <div key={employee.id} className="grid min-w-[900px] grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_0.8fr_0.8fr_auto] gap-3 px-6 py-4 font-bold text-gray-700">
                  <div>
                    <p className="font-extrabold text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-400">{employee.role}</p>
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900">{employee.bankName || "-"}</p>
                    <p className="text-sm text-gray-400">{employee.bankAcc || "ยังไม่มีเลขบัญชี"}</p>
                  </div>
                  <span>{summary.days} วัน</span>
                  <span>{money(gross)}</span>
                  <span className="text-rose-500">{money(deduct)}</span>
                  <span className="text-xl font-extrabold text-gray-950">{money(gross - deduct)}</span>
                  <SecondaryButton onClick={() => copySlip(employee)} className="px-4 py-2">
                    <Clipboard size={16} />
                  </SecondaryButton>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {subTab === "daily" && (
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-gray-900">เช็คชื่อแบบตาราง</h2>
            <SecondaryButton onClick={() => setSubTab("calendar")} className="py-2">
              <X size={16} />
              ปิด
            </SecondaryButton>
          </div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <Field label="วันที่" type="date" value={selectedDate} onChange={setSelectedDate} className="w-56" />
            <div className="flex flex-wrap gap-3">
              <SecondaryButton onClick={setAllPresent}>
                <Check size={18} />
                มาทำงานทุกคน
              </SecondaryButton>
              <SecondaryButton onClick={setHoliday}>
                <CalendarDays size={18} />
                ตั้งเป็นวันหยุดร้าน
              </SecondaryButton>
              <PrimaryButton onClick={saveAttendance}>
                <CheckCircle size={18} />
                บันทึกเช็คชื่อ
              </PrimaryButton>
            </div>
          </div>
          <div className="space-y-3">
            {employees.map((employee) => {
              const record = records[employee.id] || { status: "none", time: "09:00", late: 0, advance: 0, meal: 0 };
              return (
                <div key={employee.id} className="grid gap-3 rounded-[24px] bg-gray-50 p-4 lg:grid-cols-[1fr_0.9fr_0.7fr_0.7fr_0.7fr_0.7fr]">
                  <div>
                    <p className="font-extrabold text-gray-900">{employee.name}</p>
                    <p className="text-sm font-bold text-gray-400">{employee.role}</p>
                    <p className="mt-1 text-xs font-bold text-gray-400">{employee.bankName || "-"} {employee.bankAcc || ""}</p>
                  </div>
                  <select value={record.status} onChange={(event) => updateRecord(employee.id, { status: event.target.value })} className="rounded-2xl border border-gray-200 px-4 font-bold outline-none">
                    <option value="none">ยังไม่เช็ค</option>
                    <option value="present">มาทำงาน</option>
                    <option value="late">มาสาย</option>
                    <option value="off">วันหยุด</option>
                    <option value="leave">ลา</option>
                    <option value="absent">ขาดงาน</option>
                  </select>
                  <Field label="เวลา" type="time" value={getRecordTime(record)} onChange={(value) => updateRecord(employee.id, { time: value })} />
                  <Field label="หักสาย" type="number" value={record.late} onChange={(value) => updateRecord(employee.id, { late: numberOnly(value) })} />
                  <Field label="เบิกเงิน" type="number" value={record.advance} onChange={(value) => updateRecord(employee.id, { advance: numberOnly(value) })} />
                  <Field label="หักเงิน" type="number" value={record.meal} onChange={(value) => updateRecord(employee.id, { meal: numberOnly(value) })} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {dayModalOpen && (
        <Modal
          title={`เช็คชื่อ ${selectedDate}`}
          onClose={() => setDayModalOpen(false)}
          className="max-w-4xl"
          footer={
            <>
              <SecondaryButton onClick={() => setDayModalOpen(false)}>ปิด</SecondaryButton>
              <SecondaryButton onClick={setAllPresent}>
                <Check size={18} />
                มาทำงานทุกคน
              </SecondaryButton>
              <SecondaryButton onClick={setHoliday}>
                <CalendarDays size={18} />
                วันหยุดร้าน
              </SecondaryButton>
              <PrimaryButton
                onClick={() => {
                  setDayModalOpen(false);
                  showSuccess("บันทึกเช็คชื่อแล้ว");
                }}
              >
                <CheckCircle size={18} />
                บันทึก
              </PrimaryButton>
            </>
          }
        >
          <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
            {employees.map((employee) => {
              const record = dailyRecords[selectedDate]?.[employee.id] || { status: "none", time: "09:00", late: 0, advance: 0, meal: 0 };
              return (
                <div key={employee.id} className="rounded-[24px] bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-gray-900">{employee.name}</p>
                      <p className="text-sm font-bold text-gray-400">{employee.role} · {money(employee.baseWage)} / วัน</p>
                    </div>
                    <select
                      value={record.status}
                      onChange={(event) => updateRecord(employee.id, { status: event.target.value })}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold outline-none"
                    >
                      <option value="none">ยังไม่เช็ค</option>
                      <option value="present">มาทำงาน</option>
                      <option value="late">มาสาย</option>
                      <option value="off">วันหยุด</option>
                      <option value="leave">ลา</option>
                      <option value="absent">ขาดงาน</option>
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="เวลา" type="time" value={getRecordTime(record)} onChange={(value) => updateRecord(employee.id, { time: value })} />
                    <Field label="หักสาย" type="number" value={record.late} onChange={(value) => updateRecord(employee.id, { late: numberOnly(value) })} />
                    <Field label="เบิกเงิน" type="number" value={record.advance} onChange={(value) => updateRecord(employee.id, { advance: numberOnly(value) })} />
                    <Field label="หักเงิน" type="number" value={record.meal} onChange={(value) => updateRecord(employee.id, { meal: numberOnly(value) })} />
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {selectedEmployeeSummary && (
        <Modal
          title={`รายละเอียด ${selectedEmployeeSummary.employee.name}`}
          onClose={() => setEmployeeDetailId(null)}
          className="max-w-3xl"
          footer={<SecondaryButton onClick={() => setEmployeeDetailId(null)}>ปิด</SecondaryButton>}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">วันทำงาน</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{selectedEmployeeSummary.workDays}</p>
              </div>
              <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">เปอร์เซ็นต์ทำงาน</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{selectedEmployeeSummary.attendancePercent}%</p>
              </div>
              <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">ยอดรับสะสม</p>
                <p className="mt-1 text-2xl font-black text-gray-950">+{money(selectedEmployeeSummary.net)}</p>
              </div>
            </div>

            <div className="rounded-[26px] border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-gray-950">ความคืบหน้าการทำงาน</p>
                {selectedEmployeeSummary.bonusReady && <span className="rounded-full bg-gray-950 px-3 py-1 text-xs font-black text-white">โบนัสพร้อมสิ้นเดือน</span>}
              </div>
              <div className="rounded-full bg-gray-100 p-1.5">
                <div className="relative h-7 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full ${getProgressFillClass(selectedEmployeeSummary.attendancePercent)} transition-all`}
                    style={{ width: `${selectedEmployeeSummary.attendancePercent}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black tracking-wide text-white">
                    {selectedEmployeeSummary.attendancePercent}%
                  </div>
                </div>
              </div>
              <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
                {selectedEmployeeSummary.days.map(({ day, record }) => (
                  <span key={day} className={`min-w-[3px] flex-1 rounded-full ${getStatusTrackClass(record)}`} />
                ))}
              </div>
            </div>

            {selectedEmployeeSummary.totalDeduct > 0 && (
              <div className="grid gap-2 sm:grid-cols-3">
                {selectedEmployeeSummary.lateMoney > 0 && (
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-extrabold text-gray-400">หักสาย</p>
                    <p className="font-black text-rose-500">-{money(selectedEmployeeSummary.lateMoney)}</p>
                  </div>
                )}
                {selectedEmployeeSummary.advance > 0 && (
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-extrabold text-gray-400">เบิกเงิน</p>
                    <p className="font-black text-rose-500">-{money(selectedEmployeeSummary.advance)}</p>
                  </div>
                )}
                {selectedEmployeeSummary.deduct > 0 && (
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-extrabold text-gray-400">หักเงิน</p>
                    <p className="font-black text-rose-500">-{money(selectedEmployeeSummary.deduct)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {selectedEmployeeSummary.days.filter(({ record }) => record?.status).length ? (
                selectedEmployeeSummary.days
                  .filter(({ record }) => record?.status)
                  .map(({ day, record }) => {
                    const meta = statusMeta[record.status] || statusMeta.none;
                    const deduct = numberOnly(record.late) + numberOnly(record.advance) + numberOnly(record.meal);
                    return (
                      <div key={day} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                        <div>
                          <p className="font-extrabold text-gray-950">{day}</p>
                          <p className="text-xs font-bold text-gray-400">{getRecordTime(record)}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {deduct > 0 && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-500">-{money(deduct)}</span>}
                          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${meta.tone}`}>{meta.label}</span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-[24px] bg-gray-50 p-6 text-center font-bold text-gray-400">ยังไม่มีบันทึกในเดือนนี้</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {payrollOpen && (
        <Modal
          title="ตัดยอดค่าแรงพนักงาน"
          onClose={() => setPayrollOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setPayrollOpen(false)}>ปิด</SecondaryButton>
              <SecondaryButton onClick={copyPayroll}>
                <Clipboard size={18} />
                คัดลอกสรุป
              </SecondaryButton>
              <PrimaryButton onClick={savePayrollRun}>
                <CheckCircle size={18} />
                บันทึกรอบจ่าย
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 rounded-[24px] bg-gray-50 p-2">
              {[
                ["firstWeek", "Week แรก"],
                ["halfMonth", "รอบละ 15 วัน"],
                ["custom", "ตัดก่อนกำหนด"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPayrollMode(id)}
                  className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                    payrollMode === id ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {payrollMode === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="เริ่มวันที่" type="date" value={payrollStart} onChange={setPayrollStart} />
                <Field label="ถึงวันที่" type="date" value={payrollEnd} onChange={setPayrollEnd} />
              </div>
            ) : (
              <div className="rounded-[24px] bg-gray-100 p-4 text-sm font-bold text-gray-600">
                ใช้วันที่อ้างอิงจากช่องวันที่ในหน้าเช็คชื่อ: {selectedDate}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">รอบ</p>
                <p className="mt-1 font-extrabold text-gray-900">{payrollPeriod.label}</p>
              </div>
              <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">ช่วงวันที่</p>
                <p className="mt-1 font-extrabold text-gray-900">{payrollPeriod.start} - {payrollPeriod.end}</p>
              </div>
              <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                <p className="text-xs font-extrabold text-gray-400">ยอดจ่ายรวม</p>
                <p className="mt-1 text-xl font-black text-gray-950">{money(payrollTotal)}</p>
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-[24px] border border-gray-100">
              <table className="w-full min-w-[760px] text-left">
                <thead className="sticky top-0 bg-white text-xs font-extrabold text-gray-400">
                  <tr>
                    <th className="px-4 py-3">พนักงาน</th>
                    <th className="px-4 py-3">วันทำงาน</th>
                    <th className="px-4 py-3">ค่าแรง</th>
                    <th className="px-4 py-3">หัก</th>
                    <th className="px-4 py-3">สุทธิ</th>
                    <th className="px-4 py-3">บัญชี</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRows.map((row) => (
                    <tr key={row.employee.id} className="border-t border-gray-100 text-sm font-bold text-gray-600">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-gray-900">{row.employee.name}</p>
                        <p className="text-xs text-gray-400">{row.employee.role}</p>
                      </td>
                      <td className="px-4 py-3">{row.days} วัน</td>
                      <td className="px-4 py-3">{money(row.gross)}</td>
                      <td className="px-4 py-3 text-rose-500">{money(row.deduct)}</td>
                      <td className="px-4 py-3 text-lg font-extrabold text-gray-950">{money(row.net)}</td>
                      <td className="px-4 py-3">
                        <p>{row.employee.bankName || "-"}</p>
                        <p className="text-xs text-gray-400">{row.employee.bankAcc || "ยังไม่มีเลขบัญชี"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {payrollRuns.length > 0 && (
              <div className="rounded-[24px] bg-gray-50 p-4">
                <p className="mb-3 text-sm font-extrabold text-gray-900">รอบที่เคยบันทึกล่าสุด</p>
                <div className="space-y-2">
                  {payrollRuns.slice(0, 3).map((run) => (
                    <div key={run.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-500">
                      <span>{run.label} · {run.start} - {run.end}</span>
                      <span className="font-extrabold text-gray-900">{money(run.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {employeeModalOpen && (
        <Modal
          title="เพิ่มพนักงาน"
          onClose={() => setEmployeeModalOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setEmployeeModalOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={addEmployee}>บันทึกพนักงาน</PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อพนักงาน" value={employeeForm.name} onChange={(value) => setEmployeeForm((prev) => ({ ...prev, name: value }))} placeholder="เช่น แก้ว" />
            <Field label="ตำแหน่ง" value={employeeForm.role} onChange={(value) => setEmployeeForm((prev) => ({ ...prev, role: value }))} placeholder="เช่น ครัว / เสิร์ฟ / แคชเชียร์" />
            <Field label="ค่าแรงต่อวัน" type="number" value={employeeForm.baseWage} onChange={(value) => setEmployeeForm((prev) => ({ ...prev, baseWage: value }))} />
            <Field label="ธนาคาร" value={employeeForm.bankName} onChange={(value) => setEmployeeForm((prev) => ({ ...prev, bankName: value }))} placeholder="เช่น กสิกร" />
            <Field label="เลขบัญชี" value={employeeForm.bankAcc} onChange={(value) => setEmployeeForm((prev) => ({ ...prev, bankAcc: value }))} className="sm:col-span-2" placeholder="000-0-00000-0" />
          </div>
        </Modal>
      )}
    </div>
  );
}

function InventoryTab({ inventory, setInventory, showSuccess }) {
  const [form, setForm] = useState({ name: "", category: INVENTORY_CATEGORIES[0] });
  const [bulkForm, setBulkForm] = useState({ text: "", category: INVENTORY_CATEGORIES[0] });
  const [orderDraft, setOrderDraft] = useLocalStorage("mkm.inventoryOrderDraft", {});
  const [activeCategory, setActiveCategory] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const categories = useMemo(() => {
    const grouped = inventory.reduce((acc, item) => {
      const category = normalizeInventoryCategory(item.category);
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {});
    return INVENTORY_CATEGORIES.map((category) => [category, grouped[category] || []]);
  }, [inventory]);

  useEffect(() => {
    if (!categories.length) return;
    if (!categories.some(([category]) => category === activeCategory)) {
      setActiveCategory(categories[0][0]);
    }
  }, [categories, activeCategory]);

  const activeCategoryIndex = Math.max(0, categories.findIndex(([category]) => category === activeCategory));
  const activeCategoryEntry = categories[activeCategoryIndex] || ["", []];
  const [activeCategoryName, activeCategoryItems] = activeCategoryEntry;

  const goCategory = (direction) => {
    if (!categories.length) return;
    const nextIndex = (activeCategoryIndex + direction + categories.length) % categories.length;
    setActiveCategory(categories[nextIndex][0]);
  };

  const selectedItems = useMemo(() => {
    return inventory
      .filter((item) => orderDraft[item.id]?.checked)
      .map((item) => ({
        ...item,
        qty: orderDraft[item.id]?.qty || "1",
      }));
  }, [inventory, orderDraft]);

  const summaryByCategory = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const category = normalizeInventoryCategory(item.category);
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {});
  }, [selectedItems]);

  const summaryCategories = useMemo(() => Object.entries(summaryByCategory).sort(([a], [b]) => a.localeCompare(b, "th")), [summaryByCategory]);

  const toggleItem = (itemId) => {
    setOrderDraft((prev) => {
      const current = prev[itemId] || {};
      return {
        ...prev,
        [itemId]: {
          checked: !current.checked,
          qty: current.qty || "1",
        },
      };
    });
  };

  const updateQty = (itemId, qty) => {
    setOrderDraft((prev) => ({
      ...prev,
      [itemId]: {
        checked: true,
        qty,
      },
    }));
  };

  const addItem = () => {
    if (!form.name.trim()) return;
    const category = normalizeInventoryCategory(form.category);
    setInventory((prev) => [
      ...prev,
      {
        id: uid("inv"),
        name: form.name.trim(),
        category,
      },
    ]);
    setForm({ name: "", category });
    setActiveCategory(category);
    setAddItemOpen(false);
  };

  const addBulkItems = () => {
    const category = normalizeInventoryCategory(bulkForm.category);
    const existingNames = new Set(inventory.map((item) => item.name.trim().toLocaleLowerCase("th-TH")));
    const names = bulkForm.text
      .split(/\n|,/)
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, list) => list.findIndex((item) => item.toLocaleLowerCase("th-TH") === name.toLocaleLowerCase("th-TH")) === index)
      .filter((name) => !existingNames.has(name.toLocaleLowerCase("th-TH")));
    if (!names.length) return;
    setInventory((prev) => [
      ...prev,
      ...names.map((name) => ({
        id: uid("inv"),
        name,
        category,
      })),
    ]);
    setBulkForm({ text: "", category });
    setActiveCategory(category);
    setBulkOpen(false);
    showSuccess?.(`เพิ่มวัตถุดิบ ${names.length} รายการ`);
  };

  const removeItem = (itemId) => {
    setInventory((prev) => prev.filter((item) => item.id !== itemId));
    setOrderDraft((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const clearDraft = () => {
    setOrderDraft({});
  };

  const orderText = () => {
    if (!selectedItems.length) return "";
    const lines = ["รายการวัตถุดิบ"];
    Object.entries(summaryByCategory)
      .sort(([a], [b]) => a.localeCompare(b, "th"))
      .forEach(([category, items]) => {
        lines.push("", category);
        items.forEach((item) => {
          lines.push(`- ${item.name} ${item.qty}`);
        });
      });
    return lines.join("\n");
  };

  const copyOrder = async () => {
    await navigator.clipboard.writeText(orderText());
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-400">Inventory</p>
            <h1 className="text-3xl font-extrabold text-gray-900">รายการวัตถุดิบ</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              onClick={() => {
                setForm((prev) => ({ ...prev, category: normalizeInventoryCategory(prev.category || activeCategoryName) }));
                setAddItemOpen(true);
              }}
            >
              <Plus size={18} />
              เพิ่มวัตถุดิบ
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setBulkForm((prev) => ({ ...prev, category: normalizeInventoryCategory(prev.category || activeCategoryName) }));
                setBulkOpen(true);
              }}
            >
              <Clipboard size={18} />
              เพิ่มหลายรายการ
            </SecondaryButton>
            <SecondaryButton onClick={clearDraft} disabled={!selectedItems.length}>
              <X size={18} />
              ล้างรายการ
            </SecondaryButton>
            <PrimaryButton onClick={() => setSummaryOpen(true)} disabled={!selectedItems.length}>
              <Receipt size={18} />
              สรุป
            </PrimaryButton>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map(([category, items]) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                activeCategoryName === category ? "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.20)]" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {category} · {items.length}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-gray-400">หมวดที่ {activeCategoryIndex + 1} / {Math.max(categories.length, 1)}</p>
                  <h2 className="text-xl font-extrabold text-gray-900">{activeCategoryName || "ยังไม่มีหมวดหมู่"}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton onClick={() => goCategory(-1)} disabled={categories.length < 2} className="h-10 w-10 px-0 py-0">
                    <ChevronLeft size={16} />
                  </SecondaryButton>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-500">{activeCategoryItems.length} รายการ</span>
                  <SecondaryButton onClick={() => goCategory(1)} disabled={categories.length < 2} className="h-10 w-10 px-0 py-0">
                    <ChevronRight size={16} />
                  </SecondaryButton>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6">
                {activeCategoryItems.map((item) => {
                  const draft = orderDraft[item.id] || {};
                  const checked = Boolean(draft.checked);
                  return (
                    <div
                      key={item.id}
                      className={`group relative aspect-square overflow-hidden rounded-[18px] border p-2.5 transition ${
                        checked ? "border-blue-300 bg-blue-50 shadow-[0_10px_25px_rgba(37,99,235,0.10)]" : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <button onClick={() => toggleItem(item.id)} className="flex h-full w-full flex-col text-left">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border shadow-sm ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-transparent"}`}>
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className={`mt-3 block min-h-0 flex-1 overflow-hidden text-[16px] font-extrabold leading-[1.35] tracking-normal text-gray-950 ${checked ? "max-h-[64px]" : "max-h-[86px]"}`}>
                          {item.name}
                        </span>
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-gray-300 opacity-0 shadow-sm transition hover:text-rose-600 group-hover:opacity-100"
                        aria-label={`ลบ ${item.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className={`absolute inset-x-2 bottom-2 transition ${checked ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                        <input
                          value={draft.qty || ""}
                          onChange={(event) => updateQty(item.id, event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="จำนวน"
                          className="h-8 w-full rounded-full border border-gray-200 bg-white px-2 text-center text-sm font-extrabold text-[#1b1b23] outline-none transition focus:border-gray-300 focus:ring-4 focus:ring-gray-100"
                        />
                      </div>
                    </div>
                  );
                })}
                {!activeCategoryItems.length && (
                  <div className="col-span-full rounded-[24px] bg-gray-50 p-8 text-center font-bold text-gray-400">เพิ่มวัตถุดิบในหมวดนี้ก่อน</div>
                )}
              </div>
            </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-gray-400">Order Summary</p>
                <h2 className="text-xl font-extrabold text-gray-900">สรุปรายการ</h2>
              </div>
              <span className="rounded-full border border-gray-100 bg-white px-3 py-1 text-sm font-black text-gray-900 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">
                {selectedItems.length}
              </span>
            </div>
            {selectedItems.length ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
                    <p className="text-[11px] font-extrabold text-gray-400">วัตถุดิบทั้งหมด</p>
                    <p className="mt-1 text-xl font-black text-gray-950">{inventory.length}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.03)]">
                    <p className="text-[11px] font-extrabold text-gray-400">วัตถุดิบที่เลือก</p>
                    <p className="mt-1 text-xl font-black text-gray-950">{selectedItems.length}</p>
                  </div>
                </div>
                <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  {summaryCategories.map(([category, items]) => (
                    <div key={category} className="rounded-[18px] border border-gray-100 bg-gray-50/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-extrabold text-gray-900">{category}</p>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-500">{items.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.slice(0, 4).map((item) => (
                          <span key={item.id} className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-gray-600">
                            {item.name} · {item.qty}
                          </span>
                        ))}
                        {items.length > 4 && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-gray-400">+{items.length - 4}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <PrimaryButton onClick={() => setSummaryOpen(true)} className="w-full">
                  <Receipt size={18} />
                  สรุป
                </PrimaryButton>
              </div>
            ) : (
              <div className="rounded-[24px] bg-gray-50 p-6 text-center font-bold text-gray-400">ติ๊กวัตถุดิบที่ต้องการ แล้วใส่จำนวน</div>
            )}
          </Card>
        </div>
      </div>

      {summaryOpen && (
        <Modal title="สรุปรายการสั่งวัตถุดิบ" onClose={() => setSummaryOpen(false)} className="max-w-2xl">
          <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <p className="text-sm font-extrabold text-gray-400">MKM.POS</p>
                <h2 className="mt-1 text-2xl font-black text-gray-950">รายการสั่งวัตถุดิบ</h2>
                <p className="mt-1 text-sm font-bold text-gray-500">{todayKey()} · {selectedItems.length} รายการ · {summaryCategories.length} หมวดหมู่</p>
              </div>
              <SecondaryButton onClick={copyOrder} className="h-12 w-12 shrink-0 border-gray-950 bg-gray-950 px-0 py-0 text-white hover:border-gray-800 hover:bg-gray-800" aria-label="Copy รายการ">
                <Clipboard size={20} strokeWidth={2.5} />
              </SecondaryButton>
            </div>
            <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5">
              {summaryCategories.map(([category, items]) => (
                <div key={category} className="rounded-[22px] border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-gray-950">{category}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-500 shadow-sm">{items.length} รายการ</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
                        <span className="min-w-0 truncate text-base font-extrabold text-gray-900">{item.name}</span>
                        <span className="shrink-0 rounded-full border border-gray-100 px-3 py-1 text-sm font-black text-gray-950">{item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {addItemOpen && (
        <Modal
          title="เพิ่มวัตถุดิบ"
          onClose={() => setAddItemOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setAddItemOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={addItem}>
                <Plus size={18} />
                บันทึกวัตถุดิบ
              </PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อวัตถุดิบ" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="เช่น หมูสามชั้น" />
            <div>
              <label className="mb-2 block text-sm font-bold text-[#767686]">หมวดหมู่</label>
              <select
                value={normalizeInventoryCategory(form.category)}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-extrabold text-[#454554] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-50"
              >
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {bulkOpen && (
        <Modal
          title="เพิ่มวัตถุดิบหลายรายการ"
          onClose={() => setBulkOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setBulkOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={addBulkItems} disabled={!bulkForm.text.trim()}>
                <Plus size={18} />
                บันทึกทั้งหมด
              </PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#767686]">หมวดหมู่</label>
              <select
                value={normalizeInventoryCategory(bulkForm.category)}
                onChange={(event) => setBulkForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-extrabold text-[#454554] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-50"
              >
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#767686]">รายชื่อวัตถุดิบ</label>
              <textarea
                value={bulkForm.text}
                onChange={(event) => setBulkForm((prev) => ({ ...prev, text: event.target.value }))}
                rows={10}
                placeholder={"หมูสไลซ์\nเบคอน\nเต้าหู้ปลา\nผักบุ้ง"}
                className="w-full resize-none rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 text-base font-extrabold leading-7 text-[#1b1b23] outline-none transition placeholder:text-[#a4a1b1] focus:border-[#2563eb] focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DatabaseTab({ salesData, inventory, employees, dailyRecords, settings, setSettings, syncNow, archiveOldSales, showSuccess, onRestoreBackup }) {
  const [archiveDays, setArchiveDays] = useState(90);
  const [firebaseOpen, setFirebaseOpen] = useState(false);
  const [firebaseDraft, setFirebaseDraft] = useState({
    firebaseConfig: settings.firebaseConfig || "",
    firebaseCollection: settings.firebaseCollection || "mkm_pos",
    firebaseDocId: settings.firebaseDocId || "main",
    firebaseSyncEnabled: settings.firebaseSyncEnabled === true,
  });
  const importInputRef = useRef(null);
  const successfulSales = salesData.filter((sale) => sale.status === "success");
  const latestSales = [...salesData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);
  const totalSales = successfulSales.reduce((sum, sale) => sum + sale.total, 0);
  const inventoryCategoryCount = new Set(inventory.map((item) => normalizeInventoryCategory(item.category))).size;
  const cutoffMs = Date.now() - archiveDays * MS_PER_DAY;
  const oldSalesCount = salesData.filter((sale) => new Date(sale.timestamp).getTime() < cutoffMs).length;
  const storageKb = getStorageSizeKb(["mkm.salesData", "mkm.inventory", "mkm.employees", "mkm.dailyRecords", "mkm.settings"]);

  const exportSalesCsv = () => {
    const headers = ["id", "timestamp", "table", "total", "cash", "transfer", "grab", "status"];
    const rows = salesData.map((sale) =>
      [sale.id, sale.timestamp, sale.table, sale.total, sale.cash, sale.transfer, sale.grab || 0, sale.status].map(csvValue).join(","),
    );
    downloadTextFile(`mkm-sales-${todayKey()}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
  };

  const exportBackup = () => {
    const backup = {
      schema: "mkm-pos-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      savedInBrowser: true,
      googleSheetUrl: SHEETS_DOCUMENT_URL,
      salesData,
      inventory,
      employees,
      dailyRecords,
      settings,
    };
    downloadTextFile(`mkm-pos-backup-${todayKey()}.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onRestoreBackup(JSON.parse(String(reader.result || "{}")));
      } catch {
        showSuccess("ไฟล์ backup อ่านไม่ได้");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const copySheetLink = async () => {
    await navigator.clipboard.writeText(SHEETS_DOCUMENT_URL);
    showSuccess("คัดลอกลิงก์ Sheet แล้ว");
  };
  const copyBackendLink = async (path, label) => {
    await navigator.clipboard.writeText(`${getEffectiveBackendUrl(settings)}${path}`);
    showSuccess(`คัดลอกลิงก์ ${label} แล้ว`);
  };
  const openFirebaseSettings = () => {
    setFirebaseDraft({
      firebaseConfig: settings.firebaseConfig || "",
      firebaseCollection: settings.firebaseCollection || "mkm_pos",
      firebaseDocId: settings.firebaseDocId || "main",
      firebaseSyncEnabled: settings.firebaseSyncEnabled === true,
    });
    setFirebaseOpen(true);
  };
  const saveFirebaseSettings = () => {
    if (firebaseDraft.firebaseSyncEnabled && !parseFirebaseConfig(firebaseDraft)) {
      showSuccess("Firebase config ต้องเป็น JSON");
      return;
    }
    setSettings((prev) => ({ ...prev, ...firebaseDraft }));
    setFirebaseOpen(false);
    showSuccess(firebaseDraft.firebaseSyncEnabled ? "เปิด Firebase Sync แล้ว" : "บันทึก Firebase แล้ว");
  };

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#767686]">Data Center</p>
            <h1 className="text-3xl font-extrabold text-[#1b1b23]">ข้อมูลถูกบันทึกไว้ที่นี่</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[#767686]">
              ข้อมูลจะถูกบันทึกใน Backend บนเครื่องนี้เป็นฐานหลัก พร้อมสำรองใน browser และยังส่งเข้า Google Sheet ด้านหลังได้
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`${getEffectiveBackendUrl(settings)}/`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm font-extrabold text-[#454554] transition hover:border-[#d1d5db] hover:bg-[#f9fafb]">
              <Database size={18} />
              เปิดศูนย์ข้อมูล
            </a>
            <a href={SHEETS_DOCUMENT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
              <Database size={18} />
              เปิด Google Sheet
            </a>
            <SecondaryButton onClick={copySheetLink}>
              <Clipboard size={18} />
              คัดลอกลิงก์
            </SecondaryButton>
            <PrimaryButton onClick={openFirebaseSettings}>
              <Database size={18} />
              ตั้งค่า Firebase
            </PrimaryButton>
            <PrimaryButton onClick={syncNow}>
              <RefreshCw size={18} />
              ส่งเข้า Sheet ตอนนี้
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-4">
        {[
          ["บิลในเครื่อง", salesData.length, "localStorage"],
          ["ยอดขายสะสม", money(totalSales), "Sales"],
          ["วัตถุดิบ", inventory.length, `${inventoryCategoryCount} หมวดหมู่`],
          ["พื้นที่ในเครื่อง", `${storageKb} KB`, "browser + IndexedDB"],
        ].map(([label, value, caption]) => (
          <Card key={label} className="p-5">
            <p className="text-sm font-extrabold text-[#767686]">{label}</p>
            <p className="mt-3 text-3xl font-extrabold text-[#1b1b23]">{value}</p>
            <p className="mt-2 text-sm font-bold text-[#a4a1b1]">{caption}</p>
          </Card>
        ))}
      </div>

      <Card className="border-blue-100 bg-blue-50/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#2563eb]">Firebase Setup</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#1b1b23]">เชื่อมฐานข้อมูลกลางออนไลน์</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#64748b]">
              {settings.firebaseSyncEnabled && hasFirebaseConfig(settings)
                ? `เชื่อมอยู่ที่ Realtime Database > ${settings.firebaseCollection || "mkm_pos"} / ${settings.firebaseDocId || "main"}`
                : "กดตั้งค่า แล้ววาง firebaseConfig จาก Firebase Console"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm font-extrabold text-[#454554] transition hover:border-[#d1d5db] hover:bg-[#f9fafb]">
              <Database size={18} />
              เปิด Firebase Console
            </a>
            <PrimaryButton onClick={openFirebaseSettings}>
              <Edit3 size={18} />
              ตั้งค่า Firebase
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#1b1b23]">บิลล่าสุดที่บันทึกในเครื่อง</h2>
              <p className="text-sm font-bold text-[#767686]">ส่วนนี้คือข้อมูลที่แอปใช้แสดงผลทันที</p>
            </div>
            <SecondaryButton onClick={exportSalesCsv}>
              <Download size={18} />
              CSV บิล
            </SecondaryButton>
          </div>
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="sticky top-0 bg-white text-xs font-extrabold uppercase text-[#a4a1b1]">
                <tr>
                  <th className="px-5 py-4">บิล</th>
                  <th className="px-5 py-4">โต๊ะ</th>
                  <th className="px-5 py-4">เวลา</th>
                  <th className="px-5 py-4 text-right">ยอดรวม</th>
                  <th className="px-5 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {latestSales.map((sale) => (
                  <tr key={sale.id} className="border-t border-gray-100 text-sm font-bold text-[#454554]">
                    <td className="px-5 py-4 font-extrabold text-[#1b1b23]">{sale.id}</td>
                    <td className="px-5 py-4">{sale.table}</td>
                    <td className="px-5 py-4">{new Date(sale.timestamp).toLocaleString("th-TH")}</td>
                    <td className="px-5 py-4 text-right font-extrabold text-[#1b1b23]">{money(sale.total)}</td>
                    <td className="px-5 py-4"><StatusTag status={sale.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-extrabold text-[#1b1b23]">ดูผ่าน Excel / Sheet</h2>
          <div className="mt-5 space-y-3">
            {[
              ["วัตถุดิบ", "/tables/inventory", "/api/tables/inventory.csv"],
              ["พนักงาน", "/tables/employees", "/api/tables/employees.csv"],
              ["รายรับ", "/tables/sales", "/api/tables/sales.csv"],
            ].map(([label, viewPath, csvPath]) => (
              <div key={viewPath} className="rounded-[24px] border border-[#f3f4f6] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-[#1b1b23]">{label}</p>
                    <p className="mt-1 break-all text-xs font-bold leading-5 text-[#767686]">{getEffectiveBackendUrl(settings)}{viewPath}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`${getEffectiveBackendUrl(settings)}${viewPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]">
                      <Database size={16} />
                      ดู
                    </a>
                    <a href={`${getEffectiveBackendUrl(settings)}${csvPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-[#454554] shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
                      <Download size={16} />
                      CSV
                    </a>
                    <SecondaryButton onClick={() => copyBackendLink(viewPath, label)} className="px-4 py-2.5 text-xs">
                      <Clipboard size={16} />
                      คัดลอก
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-6 text-xl font-extrabold text-[#1b1b23]">แผนสำรองที่จัดการง่าย</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-[24px] bg-[#f9fafb] p-4">
              <p className="font-extrabold text-[#1b1b23]">1. จัดการผ่าน Google Sheet</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[#767686]">เปิดไฟล์ MKM Database แล้วแก้ข้อมูลในแท็บ Sales ได้ตรง ๆ</p>
            </div>
            <div className="rounded-[24px] bg-[#f9fafb] p-4">
              <p className="font-extrabold text-[#1b1b23]">2. เก็บสำรองเป็นไฟล์</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[#767686]">ถ้าไม่อยากรอ Sheet ให้ดาวน์โหลด JSON backup เก็บไว้ได้ทันที</p>
            </div>
            <div className="rounded-[24px] bg-[#f9fafb] p-4">
              <p className="font-extrabold text-[#1b1b23]">3. ข้อมูลหลักตอนเปิดแอป</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[#767686]">แอปอ่านจาก localStorage ของ browser นี้ก่อน แล้วค่อย sync กับ Sheet ด้านหลัง</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
            <div className="rounded-[24px] border border-[#f3f4f6] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[#1b1b23]">Archive บิลเก่าออกจาก iPad</p>
                  <p className="mt-1 text-sm font-bold text-[#767686]">พบ {oldSalesCount} บิลที่เก่ากว่า {archiveDays} วัน</p>
                </div>
                <select
                  value={archiveDays}
                  onChange={(event) => setArchiveDays(numberOnly(event.target.value))}
                  className="rounded-full border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-extrabold text-[#454554] outline-none"
                >
                  <option value="30">30 วัน</option>
                  <option value="60">60 วัน</option>
                  <option value="90">90 วัน</option>
                  <option value="180">180 วัน</option>
                </select>
              </div>
              <SecondaryButton onClick={() => archiveOldSales(archiveDays)} disabled={!oldSalesCount} className="mt-4 w-full">
                <Download size={18} />
                ดาวน์โหลด CSV แล้วลบจากเครื่อง
              </SecondaryButton>
            </div>
            <PrimaryButton onClick={exportBackup}>
              <Download size={18} />
              ดาวน์โหลด backup JSON
            </PrimaryButton>
            <SecondaryButton onClick={() => importInputRef.current?.click()}>
              <Database size={18} />
              นำเข้า backup JSON
            </SecondaryButton>
            <SecondaryButton onClick={exportSalesCsv}>
              <Download size={18} />
              ดาวน์โหลดบิลเป็น CSV
            </SecondaryButton>
          </div>
        </Card>
      </div>

      {firebaseOpen && (
        <Modal
          title="ตั้งค่า Firebase"
          onClose={() => setFirebaseOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setFirebaseOpen(false)}>ยกเลิก</SecondaryButton>
              <PrimaryButton onClick={saveFirebaseSettings}>บันทึก Firebase</PrimaryButton>
            </>
          }
          className="max-w-3xl"
        >
          <div className="grid gap-4">
            <label className="flex items-center justify-between gap-4 rounded-[22px] border border-[#e5e7eb] bg-white px-4 py-3">
              <span className="font-extrabold text-[#1b1b23]">เปิด Firebase Sync</span>
              <input
                type="checkbox"
                checked={firebaseDraft.firebaseSyncEnabled}
                onChange={(event) => setFirebaseDraft((prev) => ({ ...prev, firebaseSyncEnabled: event.target.checked }))}
                className="h-5 w-5 accent-[#2563eb]"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Collection" value={firebaseDraft.firebaseCollection} onChange={(value) => setFirebaseDraft((prev) => ({ ...prev, firebaseCollection: value }))} />
              <Field label="Document ID" value={firebaseDraft.firebaseDocId} onChange={(value) => setFirebaseDraft((prev) => ({ ...prev, firebaseDocId: value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#767686]">Firebase config JSON</label>
              <textarea
                value={firebaseDraft.firebaseConfig}
                onChange={(event) => setFirebaseDraft((prev) => ({ ...prev, firebaseConfig: event.target.value }))}
                rows={10}
                placeholder={'{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'}
                className="w-full resize-none rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 font-mono text-xs font-bold leading-6 text-[#1b1b23] outline-none transition placeholder:text-[#a4a1b1] focus:border-[#2563eb] focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [salesData, setSalesData] = useLocalStorage("mkm.salesData", initialSales);
  const [inventory, setInventory] = useLocalStorage("mkm.inventory", initialInventory);
  const [employees, setEmployees] = useLocalStorage("mkm.employees", initialEmployees);
  const [dailyRecords, setDailyRecords] = useLocalStorage("mkm.dailyRecords", initialDailyRecords);
  const [settings, setSettings] = useLocalStorage("mkm.settings", defaultSettings);
  const [successText, setSuccessText] = useState("");
  const [confirm, setConfirm] = useState(null);
  const initialLocalSignature = useMemo(
    () => getSnapshotSignature({ salesData, inventory, employees, dailyRecords, settings }),
    [],
  );
  const syncTimer = useRef(null);
  const syncRetryTimer = useRef(null);
  const backendSyncTimer = useRef(null);
  const backendRetryTimer = useRef(null);
  const firebaseSyncTimer = useRef(null);
  const firebaseRetryTimer = useRef(null);
  const isPushing = useRef(false);
  const isPushingBackend = useRef(false);
  const isPushingFirebase = useRef(false);
  const isApplyingRemote = useRef(false);
  const lastLocalSignature = useRef(initialLocalSignature);
  const lastRemoteSignature = useRef("");
  const lastBackendSignature = useRef("");
  const lastFirebaseSignature = useRef("");
  const pendingLocalWrite = useRef(false);
  const queuedLocalSignature = useRef("");
  const queuedBackendSignature = useRef("");
  const queuedFirebaseSignature = useRef("");
  const autoSyncEnabled = settings.autoSyncEnabled !== false;
  const backendSyncEnabled = settings.backendSyncEnabled !== false;
  const firebaseSyncEnabled = settings.firebaseSyncEnabled === true && hasFirebaseConfig(settings);
  const autoPullIntervalSec = Math.max(5, numberOnly(settings.autoPullIntervalSec) || 15);
  const effectiveSheetsWebhook = getEffectiveSheetsWebhook(settings);
  const effectiveBackendUrl = getEffectiveBackendUrl(settings);

  const buildCurrentSnapshot = () =>
    buildSheetsSnapshot({
      salesData,
      inventory: inventory.map((item) => ({ ...item, category: normalizeInventoryCategory(item.category) })),
      employees,
      dailyRecords,
      settings: { ...settings, sheetsWebhook: effectiveSheetsWebhook, backendUrl: effectiveBackendUrl },
    });

  const pushFirebaseSnapshot = async (snapshot, signature, attempt = 0) => {
    try {
      await postFirebaseSnapshot(settings, snapshot);
      const remoteSnapshot = await readFirebaseSnapshot(settings);
      if (!remoteSnapshot || getSnapshotSignature(remoteSnapshot) !== signature) {
        throw new Error("Firebase verification mismatch");
      }
      lastFirebaseSignature.current = signature;
      return true;
    } catch {
      if (attempt < 2) {
        await wait(1600);
        return pushFirebaseSnapshot(snapshot, signature, attempt + 1);
      }
    }
    return false;
  };

  const scheduleFirebasePush = (snapshot, signature, delay = 0) => {
    window.clearTimeout(firebaseRetryTimer.current);
    firebaseRetryTimer.current = window.setTimeout(async () => {
      if (!firebaseSyncEnabled || isApplyingRemote.current) return;
      if (queuedFirebaseSignature.current !== signature) return;
      if (isPushingFirebase.current) {
        scheduleFirebasePush(snapshot, signature, 1400);
        return;
      }
      isPushingFirebase.current = true;
      const synced = await pushFirebaseSnapshot(snapshot, signature);
      isPushingFirebase.current = false;
      if (!synced && queuedFirebaseSignature.current === signature) {
        scheduleFirebasePush(snapshot, signature, 6500);
      }
    }, delay);
  };

  const pushBackendSnapshot = async (snapshot, signature, attempt = 0) => {
    try {
      await postBackendSnapshot(effectiveBackendUrl, snapshot);
      const remoteSnapshot = await readBackendSnapshot(effectiveBackendUrl);
      if (!remoteSnapshot || getSnapshotSignature(remoteSnapshot) !== signature) {
        throw new Error("Backend verification mismatch");
      }
      lastBackendSignature.current = signature;
      return true;
    } catch {
      if (attempt < 2) {
        await wait(1200);
        return pushBackendSnapshot(snapshot, signature, attempt + 1);
      }
    }
    return false;
  };

  const scheduleBackendPush = (snapshot, signature, delay = 0) => {
    window.clearTimeout(backendRetryTimer.current);
    backendRetryTimer.current = window.setTimeout(async () => {
      if (!backendSyncEnabled || isApplyingRemote.current) return;
      if (queuedBackendSignature.current !== signature) return;
      if (isPushingBackend.current) {
        scheduleBackendPush(snapshot, signature, 1200);
        return;
      }
      isPushingBackend.current = true;
      const synced = await pushBackendSnapshot(snapshot, signature);
      isPushingBackend.current = false;
      if (!synced && queuedBackendSignature.current === signature) {
        scheduleBackendPush(snapshot, signature, 5000);
      }
    }, delay);
  };

  const pushLocalSnapshot = async (snapshot, signature, attempt = 0) => {
    try {
      await postSheetsSnapshot(effectiveSheetsWebhook, snapshot);
      await wait(1800);
      const remoteSnapshot = await readSheetsSnapshot(effectiveSheetsWebhook);
      const remoteSignature = getSnapshotSignature(remoteSnapshot);
      if (remoteSignature === signature) {
        lastRemoteSignature.current = signature;
        if (queuedLocalSignature.current === signature) {
          pendingLocalWrite.current = false;
        }
        return true;
      }
      if (attempt < 2) {
        await wait(1500);
        return pushLocalSnapshot(snapshot, signature, attempt + 1);
      }
    } catch {
      if (attempt < 2) {
        await wait(2500);
        return pushLocalSnapshot(snapshot, signature, attempt + 1);
      }
    }
    return false;
  };

  const scheduleLocalPush = (snapshot, signature, delay = 0) => {
    window.clearTimeout(syncRetryTimer.current);
    syncRetryTimer.current = window.setTimeout(async () => {
      if (!autoSyncEnabled || !effectiveSheetsWebhook || isApplyingRemote.current) return;
      if (queuedLocalSignature.current !== signature) return;
      if (isPushing.current) {
        scheduleLocalPush(snapshot, signature, 1500);
        return;
      }
      isPushing.current = true;
      const synced = await pushLocalSnapshot(snapshot, signature);
      isPushing.current = false;
      if (!synced && queuedLocalSignature.current === signature) {
        pendingLocalWrite.current = true;
        scheduleLocalPush(snapshot, signature, 5000);
      }
    }, delay);
  };

  useEffect(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (!autoSyncEnabled || isApplyingRemote.current || !effectiveSheetsWebhook) return;
      const snapshot = buildSheetsSnapshot({
        salesData,
        inventory,
        employees,
        dailyRecords,
        settings: { ...settings, sheetsWebhook: effectiveSheetsWebhook },
      });
      const signature = getSnapshotSignature(snapshot);
      if (signature === lastLocalSignature.current) return;
      lastLocalSignature.current = signature;
      queuedLocalSignature.current = signature;
      pendingLocalWrite.current = true;
      scheduleLocalPush(snapshot, signature);
    }, 900);
    return () => clearTimeout(syncTimer.current);
  }, [salesData, inventory, employees, dailyRecords, settings, autoSyncEnabled, effectiveSheetsWebhook]);

  useEffect(() => {
    if (!autoSyncEnabled || !effectiveSheetsWebhook) return undefined;
    const retry = window.setInterval(() => {
      if (!pendingLocalWrite.current || isPushing.current || isApplyingRemote.current) return;
      const snapshot = buildSheetsSnapshot({
        salesData,
        inventory,
        employees,
        dailyRecords,
        settings: { ...settings, sheetsWebhook: effectiveSheetsWebhook },
      });
      const signature = getSnapshotSignature(snapshot);
      queuedLocalSignature.current = signature;
      lastLocalSignature.current = signature;
      scheduleLocalPush(snapshot, signature);
    }, 5000);
    return () => window.clearInterval(retry);
  }, [salesData, inventory, employees, dailyRecords, settings, autoSyncEnabled, effectiveSheetsWebhook]);

  useEffect(() => {
    window.clearTimeout(backendSyncTimer.current);
    backendSyncTimer.current = window.setTimeout(() => {
      if (!backendSyncEnabled || isApplyingRemote.current || !effectiveBackendUrl) return;
      const snapshot = buildCurrentSnapshot();
      const signature = getSnapshotSignature(snapshot);
      if (signature === lastBackendSignature.current) return;
      queuedBackendSignature.current = signature;
      scheduleBackendPush(snapshot, signature);
    }, 650);
    return () => window.clearTimeout(backendSyncTimer.current);
  }, [salesData, inventory, employees, dailyRecords, settings, backendSyncEnabled, effectiveBackendUrl]);

  useEffect(() => {
    if (!backendSyncEnabled || !effectiveBackendUrl) return undefined;
    let cancelled = false;
    const poll = async () => {
      if (isPushingBackend.current || isApplyingRemote.current) return;
      try {
        const snapshot = await readBackendSnapshot(effectiveBackendUrl);
        if (cancelled || isPushingBackend.current || isApplyingRemote.current) return;
        if (!snapshot) {
          const localSnapshot = buildCurrentSnapshot();
          const localSignature = getSnapshotSignature(localSnapshot);
          queuedBackendSignature.current = localSignature;
          scheduleBackendPush(localSnapshot, localSignature);
          return;
        }
        if (!isValidSheetsSnapshot(snapshot)) return;
        const signature = getSnapshotSignature(snapshot);
        const localSignature = getSnapshotSignature(buildCurrentSnapshot());
        if (signature !== localSignature) {
          const changed = applyRemoteSnapshot(snapshot);
          if (changed) showSuccess("ข้อมูลจาก Backend อัปเดตแล้ว");
        }
      } catch {
        return undefined;
      }
    };
    const timer = window.setInterval(poll, Math.max(5000, autoPullIntervalSec * 1000));
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [backendSyncEnabled, effectiveBackendUrl, autoPullIntervalSec, salesData, inventory, employees, dailyRecords, settings]);

  useEffect(() => {
    window.clearTimeout(firebaseSyncTimer.current);
    firebaseSyncTimer.current = window.setTimeout(() => {
      if (!firebaseSyncEnabled || isApplyingRemote.current) return;
      const snapshot = buildCurrentSnapshot();
      const signature = getSnapshotSignature(snapshot);
      if (signature === lastFirebaseSignature.current) return;
      queuedFirebaseSignature.current = signature;
      scheduleFirebasePush(snapshot, signature);
    }, 900);
    return () => window.clearTimeout(firebaseSyncTimer.current);
  }, [salesData, inventory, employees, dailyRecords, settings, firebaseSyncEnabled]);

  useEffect(() => {
    if (!firebaseSyncEnabled) return undefined;
    let cancelled = false;
    let unsubscribe = null;

    const handleRemoteSnapshot = (snapshot) => {
      if (cancelled || isApplyingRemote.current) return;
      if (!snapshot) {
        const localSnapshot = buildCurrentSnapshot();
        const localSignature = getSnapshotSignature(localSnapshot);
        queuedFirebaseSignature.current = localSignature;
        scheduleFirebasePush(localSnapshot, localSignature);
        return;
      }
      if (!isValidSheetsSnapshot(snapshot)) return;
      const signature = getSnapshotSignature(snapshot);
      const localSignature = getSnapshotSignature(buildCurrentSnapshot());
      if (signature !== localSignature) {
        const changed = applyRemoteSnapshot(snapshot);
        if (changed) showSuccess("ข้อมูลจาก Firebase อัปเดตแล้ว");
        return;
      }
      lastFirebaseSignature.current = signature;
    };

    subscribeFirebaseSnapshot(settings, handleRemoteSnapshot, () => undefined)
      .then((stop) => {
        if (cancelled) {
          stop?.();
          return;
        }
        unsubscribe = stop;
      })
      .catch(() => undefined);

    const fallbackPoll = async () => {
      if (isPushingFirebase.current || isApplyingRemote.current) return;
      try {
        const snapshot = await readFirebaseSnapshot(settings);
        if (cancelled || isPushingFirebase.current || isApplyingRemote.current) return;
        handleRemoteSnapshot(snapshot);
      } catch {
        return undefined;
      }
    };
    const timer = window.setInterval(fallbackPoll, Math.max(12000, autoPullIntervalSec * 1000));
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unsubscribe?.();
    };
  }, [firebaseSyncEnabled, autoPullIntervalSec, salesData, inventory, employees, dailyRecords, settings]);

  const showSuccess = (text) => {
    setSuccessText(text);
    setTimeout(() => setSuccessText(""), 1200);
  };

  const markLocalMutation = () => {
    if (!isApplyingRemote.current) {
      pendingLocalWrite.current = true;
    }
  };

  const updateSalesData = (updater) => {
    markLocalMutation();
    setSalesData(updater);
  };

  const updateInventory = (updater) => {
    markLocalMutation();
    setInventory(updater);
  };

  const updateEmployees = (updater) => {
    markLocalMutation();
    setEmployees(updater);
  };

  const updateDailyRecords = (updater) => {
    markLocalMutation();
    setDailyRecords(updater);
  };

  const updateSettings = (updater) => {
    markLocalMutation();
    setSettings(updater);
  };

  const syncNow = () => {
    const snapshot = buildCurrentSnapshot();
    const signature = getSnapshotSignature(snapshot);
    lastLocalSignature.current = signature;
    queuedLocalSignature.current = signature;
    queuedBackendSignature.current = signature;
    queuedFirebaseSignature.current = signature;
    pendingLocalWrite.current = true;
    scheduleLocalPush(snapshot, signature);
    scheduleBackendPush(snapshot, signature);
    scheduleFirebasePush(snapshot, signature);
    showSuccess("กำลังบันทึกข้อมูล");
  };

  const archiveOldSales = (days = 90) => {
    const cutoffMs = Date.now() - days * MS_PER_DAY;
    const oldSales = salesData.filter((sale) => new Date(sale.timestamp).getTime() < cutoffMs);
    if (!oldSales.length) {
      showSuccess("ยังไม่มีบิลเก่าที่ต้อง Archive");
      return;
    }
    setConfirm({
      title: "Archive บิลเก่า",
      message: `ระบบจะดาวน์โหลด CSV ของบิลเก่ากว่า ${days} วัน จำนวน ${oldSales.length} บิล แล้วลบออกจากข้อมูลในเครื่องนี้เพื่อลดภาระ iPad`,
      action: "Archive",
      run: () => {
        downloadTextFile(`mkm-sales-archive-${days}d-${todayKey()}.csv`, salesCsvContent(oldSales), "text/csv;charset=utf-8");
        updateSalesData((prev) => prev.filter((sale) => new Date(sale.timestamp).getTime() >= cutoffMs));
        showSuccess("Archive บิลเก่าแล้ว");
      },
    });
  };

  const restoreBackup = (payload) => {
    const snapshot = payload?.snapshot || payload?.data || payload;
    if (!isValidSheetsSnapshot(snapshot)) {
      showSuccess("ไฟล์ backup ไม่ถูกต้อง");
      return;
    }
    setConfirm({
      title: "นำเข้า backup",
      message: `ระบบจะแทนที่ข้อมูลในเครื่องนี้ด้วยไฟล์ backup: ${snapshot.salesData.length} บิล, ${snapshot.inventory.length} วัตถุดิบ, ${snapshot.employees.length} พนักงาน`,
      action: "นำเข้า",
      run: () => {
        updateSalesData(snapshot.salesData);
        updateInventory(snapshot.inventory.map((item) => ({ ...item, category: normalizeInventoryCategory(item.category) })));
        updateEmployees(snapshot.employees);
        updateDailyRecords(snapshot.dailyRecords);
        if (snapshot.settings) {
          updateSettings((prev) => ({
            ...prev,
            ...snapshot.settings,
            geminiKey: prev.geminiKey || snapshot.settings.geminiKey,
            sheetsWebhook: prev.sheetsWebhook || snapshot.settings.sheetsWebhook,
          }));
        }
        showSuccess("นำเข้า backup แล้ว");
      },
    });
  };

  const resetDemo = () => {
    setConfirm({
      title: "รีเซ็ตข้อมูลตัวอย่าง",
      message: "ข้อมูลในเครื่องจะกลับไปเป็นชุดเริ่มต้นของ MKM.POS",
      action: "รีเซ็ต",
      run: () => {
        updateSalesData(initialSales);
        updateInventory(initialInventory);
        updateEmployees(initialEmployees);
        updateDailyRecords(initialDailyRecords);
        showSuccess("รีเซ็ตข้อมูลแล้ว");
      },
    });
  };

  const applyRemoteSnapshot = (snapshot, options = {}) => {
    if (!isValidSheetsSnapshot(snapshot)) throw new Error("Invalid snapshot");
    const signature = getSnapshotSignature(snapshot);
    if (signature === lastRemoteSignature.current && !options.force) return false;
    isApplyingRemote.current = true;
    lastRemoteSignature.current = signature;
    lastLocalSignature.current = signature;
    lastBackendSignature.current = signature;
    lastFirebaseSignature.current = signature;
    setSalesData(snapshot.salesData);
    setInventory(snapshot.inventory.map((item) => ({ ...item, category: normalizeInventoryCategory(item.category) })));
    setEmployees(snapshot.employees);
    setDailyRecords(snapshot.dailyRecords);
    setSettings((prev) => ({
      ...prev,
      ...(snapshot.settings || {}),
      sheetsWebhook: prev.sheetsWebhook,
      geminiKey: prev.geminiKey,
      backendUrl: prev.backendUrl,
      backendSyncEnabled: prev.backendSyncEnabled,
      firebaseConfig: prev.firebaseConfig,
      firebaseSyncEnabled: prev.firebaseSyncEnabled,
      firebaseCollection: prev.firebaseCollection,
      firebaseDocId: prev.firebaseDocId,
      autoSyncEnabled: prev.autoSyncEnabled,
      autoPullIntervalSec: prev.autoPullIntervalSec,
    }));
    window.setTimeout(() => {
      isApplyingRemote.current = false;
    }, 1200);
    return true;
  };

  useEffect(() => {
    if (!autoSyncEnabled || !effectiveSheetsWebhook) return undefined;
    let cancelled = false;
    const intervalMs = autoPullIntervalSec * 1000;

    const poll = async () => {
      if (pendingLocalWrite.current) return;
      try {
        const snapshot = await readSheetsSnapshot(effectiveSheetsWebhook);
        if (cancelled || pendingLocalWrite.current || !isValidSheetsSnapshot(snapshot)) return;
        const changed = applyRemoteSnapshot(snapshot);
        if (changed) showSuccess("ข้อมูลจาก Sheet อัปเดตแล้ว");
      } catch {
        return undefined;
      }
    };

    const timer = window.setInterval(poll, intervalMs);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [effectiveSheetsWebhook, autoSyncEnabled, autoPullIntervalSec]);

  const renderTab = () => {
    if (activeTab === "dashboard") {
      return (
        <Dashboard
          salesData={salesData}
          inventory={inventory}
          settings={settings}
          setSettings={updateSettings}
          setActiveTab={setActiveTab}
          showSuccess={showSuccess}
        />
      );
    }
    if (activeTab === "billing") return <Billing salesData={salesData} setSalesData={updateSalesData} showSuccess={showSuccess} />;
    if (activeTab === "history") return <HistoryTab salesData={salesData} setSalesData={updateSalesData} showSuccess={showSuccess} />;
    if (activeTab === "employees") {
      return (
        <EmployeesTab
          employees={employees}
          setEmployees={updateEmployees}
          dailyRecords={dailyRecords}
          setDailyRecords={updateDailyRecords}
          showSuccess={showSuccess}
        />
      );
    }
    if (activeTab === "database") {
      return (
        <DatabaseTab
          salesData={salesData}
          inventory={inventory}
          employees={employees}
          dailyRecords={dailyRecords}
          settings={settings}
          setSettings={updateSettings}
          syncNow={syncNow}
          archiveOldSales={archiveOldSales}
          showSuccess={showSuccess}
          onRestoreBackup={restoreBackup}
        />
      );
    }
    return <InventoryTab inventory={inventory} setInventory={updateInventory} settings={settings} showSuccess={showSuccess} />;
  };

  const currentDate = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-[#1b1b23]">
      <SuccessOverlay show={Boolean(successText)} text={successText} />
      <ConfirmModal
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={(item) => {
          item.run?.();
          setConfirm(null);
        }}
      />

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[76px] flex-col items-center justify-between px-3 py-6 md:flex">
        <div className="flex flex-col items-center gap-6">
          <button className="text-5xl font-black leading-none text-[#11131f]" aria-label="MKM.POS">
            *
          </button>
          <nav className="flex flex-col gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`grid h-12 w-12 place-items-center rounded-full transition ${
                    activeTab === tab.id
                      ? "bg-[#2563eb] text-white shadow-[0_14px_30px_rgba(37,99,235,0.30)]"
                      : "bg-white text-[#1b1b23] shadow-[0_10px_30px_rgba(39,37,62,0.06)] hover:text-[#2563eb]"
                  }`}
                >
                  <Icon size={19} />
                </button>
              );
            })}
          </nav>
        </div>
        <button
          onClick={resetDemo}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1b1b23] shadow-[0_10px_30px_rgba(39,37,62,0.06)]"
          aria-label="รีเซ็ตเดโม"
        >
          <RefreshCw size={19} />
        </button>
      </aside>

      <div className="md:pl-[76px]">
        <header className="sticky top-0 z-30 bg-[#f3f4f6] px-3 py-4 sm:px-5">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#767686]" size={19} />
                  <input
                    className="h-14 w-full rounded-full border border-white/80 bg-white px-14 text-sm font-bold text-[#1b1b23] shadow-[0_12px_35px_rgba(39,37,62,0.05)] outline-none placeholder:text-[#767686]"
                    aria-label="ค้นหา"
                  />
                </div>
                <nav className="flex max-w-full gap-2 overflow-x-auto rounded-full bg-white p-2 shadow-[0_12px_35px_rgba(39,37,62,0.05)] md:hidden">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-extrabold transition ${
                          activeTab === tab.id ? "bg-[#2563eb] text-white" : "text-[#454554]"
                        }`}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={() => setActiveTab("billing")}>
                  <Receipt size={18} />
                  Add Bill
                </PrimaryButton>
                <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1b1b23] shadow-[0_12px_35px_rgba(39,37,62,0.05)]">
                  <Bell size={19} />
                </button>
                <div className="flex h-12 items-center gap-3 rounded-full bg-white px-4 text-sm font-extrabold text-[#1b1b23] shadow-[0_12px_35px_rgba(39,37,62,0.05)]">
                  {currentDate}
                  <span className="rounded-full bg-[#ff6d4d] px-2 py-1 text-xs text-white">{salesData.length}</span>
                </div>
                <div className="h-12 w-12 overflow-hidden rounded-full bg-[linear-gradient(135deg,#e5e7eb,#9ca3af)] p-1">
                  <div className="grid h-full w-full place-items-center rounded-full bg-[#11131f] text-sm font-extrabold text-white">MK</div>
                </div>
                <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1b1b23] shadow-[0_12px_35px_rgba(39,37,62,0.05)]">
                  <Moon size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-3 pb-5 sm:px-5">{renderTab()}</main>
      </div>
    </div>
  );
}
