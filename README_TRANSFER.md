# MKM.POS Transfer Notes

## Run on the new notebook

```bash
npm install
npm run dev
```

Open another terminal:

```bash
npm run dev:api
```

Frontend:

```text
http://127.0.0.1:5173/?chart=usable
```

Backend data center:

```text
http://127.0.0.1:8787/
```

## Important files

- App code: `src/App.jsx`
- Backend: `server.mjs`
- Local backend database: `data/mkm-pos-db.json`
- Firebase data path: `Realtime Database > mkm_pos > main`

## Notes

- `node_modules/` is not included. Run `npm install` after moving.
- `dist/` is not included. Run `npm run build` when needed.
- If Firebase settings do not appear on the new notebook, open app menu `ข้อมูล` > `ตั้งค่า Firebase` and paste the Firebase config again.
