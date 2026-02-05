import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar las variables del archivo .env
dotenv.config();

// Crear el "pool" de conexiones (un grupo de conexiones listas para usar)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Evento para confirmar conexión exitosa
pool.on('connect', () => {
    console.log('✅ Conectado a la Base de Datos PostgreSQL');
});

// Evento para manejar errores inesperados
pool.on('error', (err: unknown) => {
    console.error('❌ Error inesperado en el cliente de BDD', err);
    process.exit(-1);
});

export default pool;
