# Portfolio IDE (Monorepo)

Browser IDE style portfolio inspired by VS Code. Visitors browse files, admins can edit and manage content in real-time.

## Stack
- Frontend: React + Vite + Monaco Editor
- Backend: Node.js + Express + PostgreSQL
- Realtime: WebSocket (ws)

## Monorepo structure
- `client/` Frontend
- `server/` Backend

## Getting Started

### 1) Backend
```bash
cd server
npm install
npm run dev
```

Set `.env` in `server/`:
```env
PORT=3000
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/portfolio_db
JWT_SECRET=your_secret
```

### 2) Frontend
```bash
cd client
npm install
npm run dev
```

## Notes
- `uploads/` is used to store uploaded files (PDFs, images, etc.).
- Admin login is required to create/edit/delete files.

## Scripts
- `server`: `npm run dev`
- `client`: `npm run dev`

## License
MIT
