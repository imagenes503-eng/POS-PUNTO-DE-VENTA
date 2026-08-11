/**
 * storage.js — "Mini-Supabase Local": Almacenamiento de Archivos
 * ============================================================
 * Simula "buckets" de Supabase Storage usando OPFS (Origin Private
 * File System) — la API de sistema de archivos NATIVA del navegador,
 * sandboxed y privada para tu app. Soportada en Chrome/Edge/Android
 * WebView modernos y Safari 16.4+. Es 100% nativa, sin librerías.
 *
 * Si el navegador no soporta OPFS (WebViews muy antiguos), cae
 * automáticamente a guardar el archivo como Blob dentro de IndexedDB
 * — sigue siendo 100% local y nativo, solo un poco menos eficiente
 * para archivos muy grandes.
 *
 * En la base de datos (db.js) solo se guarda el STRING de referencia
 * al archivo (bucket + nombre), nunca el archivo completo — igual que
 * harías con una URL de Supabase Storage.
 */

let _raizOPFS = null;
let _opfsDisponible = null;

async function _hayOPFS() {
  if (_opfsDisponible !== null) return _opfsDisponible;
  try {
    _opfsDisponible = ('storage' in navigator) && ('getDirectory' in navigator.storage);
  } catch {
    _opfsDisponible = false;
  }
  return _opfsDisponible;
}

async function _obtenerRaiz() {
  if (_raizOPFS) return _raizOPFS;
  _raizOPFS = await navigator.storage.getDirectory();
  return _raizOPFS;
}

async function _obtenerCarpetaBucket(bucket) {
  const raiz = await _obtenerRaiz();
  return raiz.getDirectoryHandle(bucket, { create: true });
}

// ── Fallback para navegadores sin OPFS: IndexedDB como "disco" ──────
const FALLBACK_DB_NAME = 'mini_supabase_storage_fallback';
function _abrirFallbackDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FALLBACK_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('archivos', { keyPath: 'ruta' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * guardarArchivo — copia un Blob/File a la carpeta segura de la app.
 * @param {string} bucket   nombre del "bucket" (ej: 'fotos-productos')
 * @param {string} nombreArchivo nombre único (ej: `${crypto.randomUUID()}.jpg`)
 * @param {Blob|File} archivo   el archivo/foto a guardar
 * @returns {Promise<string>}  la "ruta" local para guardar en la base de datos
 */
async function guardarArchivo(bucket, nombreArchivo, archivo) {
  const ruta = `${bucket}/${nombreArchivo}`;

  if (await _hayOPFS()) {
    const carpeta = await _obtenerCarpetaBucket(bucket);
    const handle  = await carpeta.getFileHandle(nombreArchivo, { create: true });
    const writable = await handle.createWritable();
    await writable.write(archivo);
    await writable.close();
  } else {
    const db = await _abrirFallbackDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('archivos', 'readwrite');
      tx.objectStore('archivos').put({ ruta, blob: archivo, tipo: archivo.type });
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  }
  return ruta;
}

/**
 * obtenerRutaArchivo — recupera el archivo guardado y devuelve una URL
 * utilizable directamente en <img src="..."> o similar.
 */
async function obtenerRutaArchivo(ruta) {
  const [bucket, nombreArchivo] = ruta.split('/');

  if (await _hayOPFS()) {
    const carpeta = await _obtenerCarpetaBucket(bucket);
    const handle  = await carpeta.getFileHandle(nombreArchivo);
    const archivo = await handle.getFile();
    return URL.createObjectURL(archivo); // URL local temporal, lista para usar en <img>
  } else {
    const db = await _abrirFallbackDB();
    const registro = await new Promise((resolve, reject) => {
      const tx  = db.transaction('archivos', 'readonly');
      const req = tx.objectStore('archivos').get(ruta);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
    if (!registro) throw new Error(`No se encontró el archivo: ${ruta}`);
    return URL.createObjectURL(registro.blob);
  }
}

/** eliminarArchivo — borra el archivo del almacenamiento local. */
async function eliminarArchivo(ruta) {
  const [bucket, nombreArchivo] = ruta.split('/');

  if (await _hayOPFS()) {
    const carpeta = await _obtenerCarpetaBucket(bucket);
    await carpeta.removeEntry(nombreArchivo).catch(() => {});
  } else {
    const db = await _abrirFallbackDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('archivos', 'readwrite');
      tx.objectStore('archivos').delete(ruta);
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  }
  return true;
}

export const storage = {
  guardarArchivo,
  obtenerRutaArchivo,
  eliminarArchivo
};
