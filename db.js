/**
 * db.js — "Mini-Supabase Local": Motor de Base de Datos
 * ============================================================
 * Equivalente local a Postgres/SQLite, usando IndexedDB — el motor de
 * base de datos NATIVO de los navegadores (Chrome, Safari, Edge, etc.).
 * No requiere ninguna librería externa: IndexedDB es una API estándar
 * del navegador, disponible sin instalar nada.
 *
 * Conceptos equivalentes:
 *   - "Tabla"        -> Object Store de IndexedDB
 *   - "Llave primaria"-> keyPath (ej: 'id')
 *   - "Índice/FK"     -> createIndex (permite buscar rápido por esa
 *                        columna y sirve de base para validar
 *                        relaciones, ver `_validarFK` más abajo)
 *   - "Fila"          -> Objeto JS guardado en el store
 *
 * Todas las operaciones son asíncronas (Promesas), igual que con
 * Supabase.
 */

const DB_NAME    = 'mini_supabase_local';
const DB_VERSION = 1;

// ── Definición del "esquema" (tablas + índices) ──────────────────────
// Aquí defines tus tablas, tal como harías con CREATE TABLE en SQL.
const ESQUEMA = {
  usuarios: {
    keyPath: 'id',
    indices: [
      { nombre: 'por_username', campo: 'username', opciones: { unique: true } }
    ]
  },
  tareas: {
    keyPath: 'id',
    indices: [
      // "Llave foránea" hacia usuarios.id — no es una FK real (IndexedDB
      // no las soporta de forma nativa), pero el índice permite buscar
      // rápido y _validarFK() la hace cumplir en el código.
      { nombre: 'por_usuario_id', campo: 'usuario_id', opciones: { unique: false } },
      { nombre: 'por_completada', campo: 'completada', opciones: { unique: false } }
    ]
  },
  archivos: {
    keyPath: 'id',
    indices: [
      { nombre: 'por_usuario_id', campo: 'usuario_id', opciones: { unique: false } }
    ]
  }
};

// Relaciones tipo "llave foránea" que se validan en código antes de
// insertar (ya que IndexedDB no las aplica automáticamente).
const RELACIONES_FK = {
  tareas:   { campo: 'usuario_id', tablaReferenciada: 'usuarios' },
  archivos: { campo: 'usuario_id', tablaReferenciada: 'usuarios' }
};

let _dbPromise = null;

/** Abre (o crea, si no existe) la base de datos y sus tablas/índices. */
function _abrirDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      for (const [tabla, def] of Object.entries(ESQUEMA)) {
        if (!db.objectStoreNames.contains(tabla)) {
          const store = db.createObjectStore(tabla, { keyPath: def.keyPath });
          for (const idx of def.indices) {
            store.createIndex(idx.nombre, idx.campo, idx.opciones);
          }
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('DB bloqueada: cierra otras pestañas de la app e intenta de nuevo.'));
  });
  return _dbPromise;
}

/** Valida que la llave foránea referenciada exista (si aplica a esta tabla). */
async function _validarFK(tabla, fila) {
  const rel = RELACIONES_FK[tabla];
  if (!rel) return; // esta tabla no tiene FK definida
  const valor = fila[rel.campo];
  if (valor === undefined || valor === null) return; // FK opcional
  const existe = await seleccionarPorId(rel.tablaReferenciada, valor);
  if (!existe) {
    throw new Error(`Violación de llave foránea: no existe ${rel.tablaReferenciada}.id = "${valor}"`);
  }
}

/**
 * INSERT — inserta una fila nueva en la tabla indicada.
 * Genera un id único (uuid) si la fila no trae uno.
 */
async function insertar(tabla, fila) {
  if (!ESQUEMA[tabla]) throw new Error(`La tabla "${tabla}" no existe en el esquema.`);
  const registro = { ...fila };
  if (!registro.id) registro.id = crypto.randomUUID();
  registro.creado_en = registro.creado_en || new Date().toISOString();

  await _validarFK(tabla, registro);

  const db = await _abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(tabla, 'readwrite');
    tx.objectStore(tabla).add(registro);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });

  // Notifica al canal de tiempo real (ver realtime.js) — se conecta
  // automáticamente si ese módulo fue cargado en la página.
  if (typeof window !== 'undefined' && window.miniSupabaseRealtime) {
    window.miniSupabaseRealtime.publicar(tabla, 'INSERT', registro);
  }
  return registro;
}

/** SELECT — devuelve todas las filas de una tabla, opcionalmente filtradas. */
async function seleccionar(tabla, filtro = null) {
  const db = await _abrirDB();
  const filas = await new Promise((resolve, reject) => {
    const tx  = db.transaction(tabla, 'readonly');
    const req = tx.objectStore(tabla).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  if (!filtro) return filas;
  return filas.filter(fila => Object.entries(filtro).every(([k, v]) => fila[k] === v));
}

/** SELECT por índice — más eficiente que filtrar todo (ej: buscar por usuario_id). */
async function seleccionarPorIndice(tabla, nombreIndice, valor) {
  const db = await _abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(tabla, 'readonly');
    const req = tx.objectStore(tabla).index(nombreIndice).getAll(valor);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** SELECT por llave primaria (id). */
async function seleccionarPorId(tabla, id) {
  const db = await _abrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(tabla, 'readonly');
    const req = tx.objectStore(tabla).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
}

/** UPDATE — actualiza (parcialmente) una fila existente por id. */
async function actualizar(tabla, id, cambios) {
  const db = await _abrirDB();
  const actualizado = await new Promise((resolve, reject) => {
    const tx    = db.transaction(tabla, 'readwrite');
    const store = tx.objectStore(tabla);
    const req   = store.get(id);
    req.onsuccess = () => {
      const actual = req.result;
      if (!actual) { reject(new Error(`No existe ${tabla}.id = "${id}"`)); return; }
      const nuevo = { ...actual, ...cambios, actualizado_en: new Date().toISOString() };
      store.put(nuevo);
      resolve(nuevo);
    };
    req.onerror = () => reject(req.error);
  });

  if (typeof window !== 'undefined' && window.miniSupabaseRealtime) {
    window.miniSupabaseRealtime.publicar(tabla, 'UPDATE', actualizado);
  }
  return actualizado;
}

/** DELETE — elimina una fila por id. */
async function eliminar(tabla, id) {
  const db = await _abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(tabla, 'readwrite');
    tx.objectStore(tabla).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });

  if (typeof window !== 'undefined' && window.miniSupabaseRealtime) {
    window.miniSupabaseRealtime.publicar(tabla, 'DELETE', { id });
  }
  return true;
}

export const db = {
  insertar,
  seleccionar,
  seleccionarPorIndice,
  seleccionarPorId,
  actualizar,
  eliminar
};
