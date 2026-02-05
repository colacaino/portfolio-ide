import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import pool from '../config/db';
import type { AuthedRequest } from '../middleware/auth';
import { broadcast } from '../realtime/ws';

export const getFiles = async (_req: Request, res: Response) => {
  try {
    const userId = 1;

    const result = await pool.query(
      'SELECT id, name, content, language FROM files WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los archivos' });
  }
};

export const updateFile = async (req: Request, res: Response) => {
  try {
    const fileId = Number(req.params.id);
    const { content, name } = req.body as { content?: string; name?: string };
    const userId = (req as AuthedRequest).user?.userId ?? 1;

    if (!fileId || Number.isNaN(fileId)) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    if (typeof content !== 'string') {
      return res.status(400).json({ message: 'Contenido invalido' });
    }

    if (name && typeof name === 'string') {
      if (!isValidName(name)) {
        return res.status(400).json({ message: 'Nombre de archivo invalido' });
      }
      const existing = await pool.query(
        'SELECT id FROM files WHERE user_id = $1 AND name = $2 AND id <> $3 LIMIT 1',
        [userId, name, fileId]
      );
      if ((existing.rowCount ?? 0) > 0) {
        return res.status(409).json({ message: 'Ya existe un archivo con ese nombre' });
      }
    }

    let result;
    if (name && typeof name === 'string') {
      const language = getLanguageFromFilename(name);
      result = await pool.query(
        'UPDATE files SET name = $1, language = $2, content = $3 WHERE id = $4 RETURNING id, name, content, language',
        [name, language, content, fileId]
      );
    } else {
      result = await pool.query(
        'UPDATE files SET content = $1 WHERE id = $2 RETURNING id, name, content, language',
        [content, fileId]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const updated = result.rows[0];
    broadcast({ type: 'file.updated', payload: updated });
    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al guardar el archivo' });
  }
};

const getLanguageFromFilename = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.html')) return 'html';
  return 'plaintext';
};

const isValidName = (name: string) => {
  if (name.trim().length === 0) return false;
  if (name.startsWith('/') || name.endsWith('/')) return false;
  if (name.includes('..')) return false;
  if (name.includes('\\')) return false;
  return true;
};

export const createFile = async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.userId ?? 1;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (file) {
      const rawPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
      if (rawPath && !isValidName(rawPath)) {
        return res.status(400).json({ message: 'Nombre de carpeta invalido' });
      }
      const name = rawPath ? `${rawPath}/${file.originalname}` : file.originalname;
      const existing = await pool.query(
        'SELECT id FROM files WHERE user_id = $1 AND name = $2 LIMIT 1',
        [userId, name]
      );
      if ((existing.rowCount ?? 0) > 0) {
        return res.status(409).json({ message: 'Ya existe un archivo con ese nombre' });
      }

      const uploadUrl = `/uploads/${file.filename}`;
      const lower = file.originalname.toLowerCase();
      const language =
        lower.endsWith('.pdf') ? 'pdf' :
        /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower) ? 'image' :
        /\.(mp4|webm|ogg)$/i.test(lower) ? 'video' :
        /\.(mp3|wav|ogg)$/i.test(lower) ? 'audio' :
        /\.(docx|xlsx|pptx)$/i.test(lower) ? 'office' :
        'binary';
      const result = await pool.query(
        'INSERT INTO files (name, content, language, user_id) VALUES ($1, $2, $3, $4) RETURNING id, name, content, language',
        [file.originalname, uploadUrl, language, userId]
      );
      const created = result.rows[0];
      broadcast({ type: 'file.created', payload: created });
      return res.status(201).json(created);
    }

    const { name, content } = req.body as { name?: string; content?: string };
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Nombre de archivo invalido' });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ message: 'Nombre de archivo invalido' });
    }

    const existing = await pool.query(
      'SELECT id FROM files WHERE user_id = $1 AND name = $2 LIMIT 1',
      [userId, name]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ message: 'Ya existe un archivo con ese nombre' });
    }

    const language = getLanguageFromFilename(name);
    const safeContent = typeof content === 'string' ? content : '';

    const result = await pool.query(
      'INSERT INTO files (name, content, language, user_id) VALUES ($1, $2, $3, $4) RETURNING id, name, content, language',
      [name, safeContent, language, userId]
    );

    const created = result.rows[0];
    broadcast({ type: 'file.created', payload: created });
    return res.status(201).json(created);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al crear el archivo' });
  }
};

export const deleteFile = async (req: AuthedRequest, res: Response) => {
  try {
    const fileId = Number(req.params.id);
    if (!fileId || Number.isNaN(fileId)) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    const existing = await pool.query(
      'SELECT id, content, language FROM files WHERE id = $1',
      [fileId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

    const row = existing.rows[0] as { content?: string; language?: string };
    if (row.language === 'pdf' && row.content?.startsWith('/uploads/')) {
      const filename = row.content.replace('/uploads/', '');
      const absolutePath = path.join(__dirname, '..', '..', 'uploads', filename);
      await fs.unlink(absolutePath).catch(() => undefined);
    }

    broadcast({ type: 'file.deleted', payload: { id: fileId } });
    return res.json({ id: fileId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al eliminar el archivo' });
  }
};
