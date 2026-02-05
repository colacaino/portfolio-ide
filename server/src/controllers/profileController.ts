import { Request, Response } from 'express';
import pool from '../config/db';
import type { AuthedRequest } from '../middleware/auth';

const ensureProfileTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      title VARCHAR(120) NOT NULL,
      bio TEXT NOT NULL,
      location VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      website VARCHAR(255) NOT NULL,
      github VARCHAR(255) NOT NULL,
      linkedin VARCHAR(255) NOT NULL,
      avatar_data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const defaultProfile = {
  name: 'Carlos Gonzalez',
  title: 'Full Stack Developer',
  bio: 'Construyo experiencias web con foco en producto, rendimiento y DX.',
  location: 'Chile',
  email: 'carlos@email.com',
  website: 'https://carlos.dev',
  github: 'https://github.com/carlos',
  linkedin: 'https://linkedin.com/in/carlos',
  avatar_data: '',
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    await ensureProfileTable();
    const userId = (req as AuthedRequest).user?.userId ?? 1;
    const result = await pool.query(
      'SELECT user_id, name, title, bio, location, email, website, github, linkedin, avatar_data FROM profiles WHERE user_id = $1',
      [userId]
    );
    if (result.rowCount && result.rowCount > 0) {
      return res.json(result.rows[0]);
    }
    return res.json({ user_id: userId, ...defaultProfile });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

export const upsertProfile = async (req: AuthedRequest, res: Response) => {
  try {
    await ensureProfileTable();
    const userId = req.user?.userId ?? 1;
    const {
      name,
      title,
      bio,
      location,
      email,
      website,
      github,
      linkedin,
      avatar_data,
    } = req.body as Record<string, string>;

    const payload = {
      name: name ?? defaultProfile.name,
      title: title ?? defaultProfile.title,
      bio: bio ?? defaultProfile.bio,
      location: location ?? defaultProfile.location,
      email: email ?? defaultProfile.email,
      website: website ?? defaultProfile.website,
      github: github ?? defaultProfile.github,
      linkedin: linkedin ?? defaultProfile.linkedin,
      avatar_data: avatar_data ?? defaultProfile.avatar_data,
    };

    const result = await pool.query(
      `
      INSERT INTO profiles (user_id, name, title, bio, location, email, website, github, linkedin, avatar_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE
      SET name = EXCLUDED.name,
          title = EXCLUDED.title,
          bio = EXCLUDED.bio,
          location = EXCLUDED.location,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          github = EXCLUDED.github,
          linkedin = EXCLUDED.linkedin,
          avatar_data = EXCLUDED.avatar_data,
          updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, name, title, bio, location, email, website, github, linkedin, avatar_data
      `,
      [
        userId,
        payload.name,
        payload.title,
        payload.bio,
        payload.location,
        payload.email,
        payload.website,
        payload.github,
        payload.linkedin,
        payload.avatar_data,
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al guardar perfil' });
  }
};

export const uploadAvatar = async (req: AuthedRequest, res: Response) => {
  try {
    await ensureProfileTable();
    const userId = req.user?.userId ?? 1;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ message: 'Archivo requerido' });
    }
    const avatarUrl = `/uploads/${file.filename}`;

    const result = await pool.query(
      `
      INSERT INTO profiles (user_id, name, title, bio, location, email, website, github, linkedin, avatar_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE
      SET avatar_data = EXCLUDED.avatar_data,
          updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, name, title, bio, location, email, website, github, linkedin, avatar_data
      `,
      [
        userId,
        defaultProfile.name,
        defaultProfile.title,
        defaultProfile.bio,
        defaultProfile.location,
        defaultProfile.email,
        defaultProfile.website,
        defaultProfile.github,
        defaultProfile.linkedin,
        avatarUrl,
      ]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al subir avatar' });
  }
};
