# MKM.POS Dashboard

เว็บ Dashboard/POS สำหรับร้านหมูกระทะ ใช้ React, Tailwind CSS และ Firebase Realtime Database สำหรับเชื่อมข้อมูลกลางระหว่างหน้าขาย POS กับ Dashboard

## Development

```bash
npm install
npm run dev
```

เปิดเว็บที่ `http://127.0.0.1:5173`

## Build

```bash
npm run build
```

ไฟล์สำหรับ deploy จะอยู่ใน `dist/`

## Deploy

ตั้งค่าบน Netlify หรือ Vercel:

- Build command: `npm run build`
- Publish directory: `dist`

สำหรับ GitHub Pages ให้ใช้ workflow ที่อยู่ใน `.github/workflows/pages.yml`

หลังอัปไฟล์ขึ้น GitHub แล้วเข้า `Settings` > `Pages` แล้วตั้งค่า:

- Source: `GitHub Actions`

ไม่ใช้ `Deploy from a branch` แบบ `main / root` เพราะ Vite React ต้อง build ก่อน ไม่อย่างนั้นหน้าเว็บจะจอขาว

## Firebase

ระบบตั้งค่า Firebase Realtime Database เป็นค่าเริ่มต้นแล้ว โดยใช้ path หลัก:

```text
mkm_pos/main
```

ข้อมูลหลัก:

- `salesData`
- `inventory`
- `employees`
- `dailyRecords`
- `settings`

เมื่อ deploy แล้ว Dashboard จะอ่านและเขียนข้อมูลกับ Firebase อัตโนมัติ ถ้า POS อีกแอพใช้ Firebase project และ path เดียวกัน ข้อมูลบิลจะเชื่อมกันทันที
