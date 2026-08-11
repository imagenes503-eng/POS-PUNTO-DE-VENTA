/**
 * auth.js — "Mini-Supabase Local": Autenticación
 * ============================================================
 * Registro / login / sesión, 100% local. Usa la Web Crypto API nativa
 * del navegador (`crypto.subtle`) para el hashing de contraseñas — es
 * el mismo tipo de API criptográfica que usan los navegadores para
 * HTTPS, no es una librería externa.
 *
 * ADVERTENCIA HONESTA sobre "almacenamiento seguro":
 * A diferencia de una app nativa (que sí tiene acceso al Keychain de
 * iOS o al KeyStore de Android), un navegador web NO tiene acceso a
 * ese almacenamiento cifrado a nivel de sistema operativo. Lo más
 * cercano disponible es `localStorage`, que:
 *   - persiste entre reinicios de la app/navegador ✔
 *   - NO está cifrado a nivel de sistema — cualquiera con acceso físico
 *     al teléfono y herramientas de depuración podría inspeccionarlo.
 * Para un POS de una sola tienda esto suele ser un riesgo aceptable,
 * pero es importante que lo sepas.
 */

import { db } from './db.js';

const SESION_STORAGE_KEY = 'mini_supabase_sesion';

/** Genera un salt aleatorio criptográficamente seguro. */
function _generarSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hashea una contraseña + salt usando SHA-256 (Web Crypto API nativa). */
async function _hashearPassword(password, salt) {
  const datos      = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', datos);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Registra un usuario nuevo. Lanza error si el username ya existe. */
async function registrar(username, password) {
  if (!username || !password) throw new Error('Usuario y contraseña son obligatorios.');
  if (password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');

  const existentes = await db.seleccionarPorIndice('usuarios', 'por_username', username);
  if (existentes.length > 0) throw new Error(`El usuario "${username}" ya existe.`);

  const salt         = _generarSalt();
  const passwordHash = await _hashearPassword(password, salt);

  const usuario = await db.insertar('usuarios', {
    username,
    passwordHash,
    salt
    // Nunca se guarda la contraseña en texto plano — solo el hash + salt.
  });

  return { id: usuario.id, username: usuario.username };
}

/** Inicia sesión. Devuelve un token de sesión si las credenciales son correctas. */
async function iniciarSesion(username, password) {
  const encontrados = await db.seleccionarPorIndice('usuarios', 'por_username', username);
  const usuario = encontrados[0];
  if (!usuario) throw new Error('Usuario o contraseña incorrectos.');

  const hashIntento = await _hashearPassword(password, usuario.salt);
  if (hashIntento !== usuario.passwordHash) throw new Error('Usuario o contraseña incorrectos.');

  const sesion = {
    token: crypto.randomUUID(),
    usuarioId: usuario.id,
    username: usuario.username,
    creadoEn: Date.now(),
    expiraEn: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 días
  };
  localStorage.setItem(SESION_STORAGE_KEY, JSON.stringify(sesion));
  return sesion;
}

/** Devuelve la sesión activa (si existe y no ha expirado), o null. */
function obtenerSesion() {
  const raw = localStorage.getItem(SESION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const sesion = JSON.parse(raw);
    if (Date.now() > sesion.expiraEn) {
      localStorage.removeItem(SESION_STORAGE_KEY);
      return null;
    }
    return sesion;
  } catch {
    return null;
  }
}

/** Cierra la sesión actual. */
function cerrarSesion() {
  localStorage.removeItem(SESION_STORAGE_KEY);
}

export const auth = {
  registrar,
  iniciarSesion,
  obtenerSesion,
  cerrarSesion
};
