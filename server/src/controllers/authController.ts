import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

type DbUserRow = {
  id: number;
  username: string;
  password_hash: string;
  is_admin?: boolean | null;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }

    const result = await pool.query<DbUserRow>(
      'SELECT id, username, password_hash, is_admin FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    const user = result.rows[0];
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isAdmin = Boolean(user.is_admin);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET no configurado' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin },
      secret,
      { expiresIn: '12h' }
    );

    return res.json({ token, user: { id: user.id, username: user.username, isAdmin } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error en login' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [username, email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ message: 'Usuario o email ya existe' });
    }

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_admin',
      [username, email, password, false]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Error en registro' });
  }
};
