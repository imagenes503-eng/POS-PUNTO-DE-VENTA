/**
 * realtime.js — "Mini-Supabase Local": Canal de Tiempo Real
 * ============================================================
 * Implementa el patrón Observador (Observer Pattern) en código puro.
 * Cualquier parte de tu app puede suscribirse a una tabla y recibir
 * notificaciones automáticas cuando db.js hace INSERT / UPDATE / DELETE.
 *
 * BONUS (100% nativo, sin librerías): usa `BroadcastChannel`, una API
 * estándar del navegador que permite notificar a OTRAS PESTAÑAS o
 * instancias de la app abiertas en el MISMO dispositivo/origen — por
 * ejemplo, si tienes la web abierta en el navegador Y en la app
 * instalada al mismo tiempo, ambas se enterarán del cambio al instante.
 *
 * LIMITACIÓN HONESTA: BroadcastChannel solo funciona DENTRO del mismo
 * dispositivo/navegador. NO sincroniza entre un teléfono y otro — para
 * eso sí necesitarías un servidor (como Supabase Realtime).
 */

class CanalTiempoReal {
  constructor() {
    // Mapa: nombre de tabla -> Set de funciones suscriptoras (observadores)
    this._suscriptores = new Map();

    // Canal nativo del navegador para notificar entre pestañas/instancias
    // del mismo origen en este mismo dispositivo.
    this._canalNavegador = ('BroadcastChannel' in window)
      ? new BroadcastChannel('mini_supabase_realtime')
      : null;

    if (this._canalNavegador) {
      this._canalNavegador.onmessage = (evento) => {
        const { tabla, tipoEvento, fila } = evento.data;
        this._notificarLocal(tabla, tipoEvento, fila, /* remoto = */ true);
      };
    }
  }

  /**
   * Suscribe una función callback a los cambios de una tabla.
   * Devuelve una función para cancelar la suscripción (unsubscribe).
   */
  suscribir(tabla, callback) {
    if (!this._suscriptores.has(tabla)) this._suscriptores.set(tabla, new Set());
    this._suscriptores.get(tabla).add(callback);

    // Función de cancelación — patrón estándar de "unsubscribe"
    return () => {
      const set = this._suscriptores.get(tabla);
      if (set) set.delete(callback);
    };
  }

  /**
   * Publica un cambio (INSERT/UPDATE/DELETE) — llamado automáticamente
   * por db.js después de cada operación de escritura.
   */
  publicar(tabla, tipoEvento, fila) {
    this._notificarLocal(tabla, tipoEvento, fila, /* remoto = */ false);
    // Avisa también a otras pestañas/instancias del mismo dispositivo
    if (this._canalNavegador) {
      this._canalNavegador.postMessage({ tabla, tipoEvento, fila });
    }
  }

  _notificarLocal(tabla, tipoEvento, fila, remoto) {
    const suscriptores = this._suscriptores.get(tabla);
    if (!suscriptores || suscriptores.size === 0) return;
    for (const callback of suscriptores) {
      try {
        callback({ tabla, tipoEvento, fila, remoto });
      } catch (e) {
        console.error(`[realtime] Error en suscriptor de "${tabla}":`, e);
      }
    }
  }
}

// Instancia única (singleton), accesible globalmente para que db.js
// pueda publicar cambios sin necesidad de importar este módulo (evita
// dependencias circulares entre db.js y realtime.js).
export const realtime = new CanalTiempoReal();
if (typeof window !== 'undefined') window.miniSupabaseRealtime = realtime;
