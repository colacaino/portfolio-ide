import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db';
import fileRoutes from './routes/fileRoutes';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import { initWebSocket } from './realtime/ws';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares basicos
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

app.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      mensaje: 'Servidor y BDD funcionando',
      tiempo_bdd: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al conectar con la BDD' });
  }
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
