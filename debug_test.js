/* =====================================================================
   🐞 PANEL DE DIAGNÓSTICO — SOLO PARA PRUEBAS
   No modifica ninguna lógica de la app. Se puede quitar borrando
   la línea <script src="debug_test.js"></script> de index.html.

   Qué hace:
   1) Muestra en pantalla (sin necesitar consola de Chrome) todos los
      console.log / console.warn / console.error y errores no capturados.
   2) Muestra en vivo el estado de sync (tienda_id, canal realtime activo,
      cantidad de datos locales, caja calculada).
   3) Corre una batería de checks automáticos (funciones críticas, cliente
      Supabase, etc.) y marca ✅/❌.
   4) Prueba de "ping" en tiempo real entre los dos teléfonos: uno presiona
      "Escuchar" y el otro "Enviar" — así se confirma si el broadcast
      realmente viaja de un teléfono a otro (la causa raíz de Reiniciar Mes).
   ===================================================================== */

(function () {
  // ---------- 1. Panel flotante ----------
  const btn = document.createElement('button');
  btn.textContent = '🐞';
  btn.style.cssText = 'position:fixed;bottom:14px;right:14px;z-index:999999;width:48px;height:48px;border-radius:50%;background:#111;color:#fff;font-size:20px;border:none;box-shadow:0 4px 12px rgba(0,0,0,.4);';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;z-index:999998;background:#0b0f19;color:#e5e7eb;font:12px/1.4 monospace;display:none;flex-direction:column;';
  panel.innerHTML = `
    <div style="display:flex;gap:6px;padding:8px;background:#111827;flex-wrap:wrap;">
      <button id="dgClose"  style="padding:8px 10px;background:#374151;color:#fff;border:none;border-radius:6px;">✕ Cerrar</button>
      <button id="dgTest"   style="padding:8px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;">▶ Ejecutar Diagnóstico</button>
      <button id="dgClear"  style="padding:8px 10px;background:#4b5563;color:#fff;border:none;border-radius:6px;">🗑 Limpiar</button>
      <button id="dgCopy"   style="padding:8px 10px;background:#059669;color:#fff;border:none;border-radius:6px;">📋 Copiar log</button>
      <button id="dgListen" style="padding:8px 10px;background:#7c3aed;color:#fff;border:none;border-radius:6px;">👂 Escuchar Ping</button>
      <button id="dgSend"   style="padding:8px 10px;background:#db2777;color:#fff;border:none;border-radius:6px;">📡 Enviar Ping</button>
      <button id="dgAuth"   style="padding:8px 10px;background:#ea580c;color:#fff;border:none;border-radius:6px;">🔍 Ver Auth Real</button>
      <button id="dgCola"   style="padding:8px 10px;background:#0891b2;color:#fff;border:none;border-radius:6px;">🔎 Ver Cola Atascada</button>
      <button id="dgColaClear" style="padding:8px 10px;background:#b91c1c;color:#fff;border:none;border-radius:6px;">🧹 Vaciar Cola Atascada</button>
    </div>
    <div id="dgStatus" style="padding:8px;background:#111827;border-bottom:1px solid #1f2937;white-space:pre-wrap;"></div>
    <div id="dgLog" style="flex:1;overflow-y:auto;padding:8px;white-space:pre-wrap;"></div>
  `;
  document.body.appendChild(panel);

  btn.onclick = () => { panel.style.display = 'flex'; renderEstado(); };
  panel.querySelector('#dgClose').onclick = () => { panel.style.display = 'none'; };
  panel.querySelector('#dgClear').onclick = () => { logEl.textContent = ''; };
  panel.querySelector('#dgCopy').onclick = () => {
    const text = logEl.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => log('info', '📋 Log copiado al portapapeles.'));
    } else {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      log('info', '📋 Log copiado (fallback).');
    }
  };

  const logEl = panel.querySelector('#dgLog');
  const statusEl = panel.querySelector('#dgStatus');

  function ts() {
    const d = new Date();
    return d.toLocaleTimeString('es-SV', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  const colores = { log: '#9ca3af', warn: '#f59e0b', error: '#ef4444', info: '#38bdf8', ok: '#22c55e', fail: '#ef4444' };
  function log(tipo, ...args) {
    const linea = document.createElement('div');
    linea.style.color = colores[tipo] || '#e5e7eb';
    const texto = args.map(a => {
      if (a instanceof Error) return a.message + ' | ' + (a.stack || '');
      if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
      return String(a);
    }).join(' ');
    linea.textContent = `[${ts()}] ${texto}`;
    logEl.appendChild(linea);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ---------- 2. Interceptar console y errores ----------
  const _origLog = console.log, _origWarn = console.warn, _origError = console.error;
  console.log = function (...a) { _origLog.apply(console, a); log('log', ...a); };
  console.warn = function (...a) { _origWarn.apply(console, a); log('warn', '⚠', ...a); };
  console.error = function (...a) { _origError.apply(console, a); log('error', '❌', ...a); };

  window.addEventListener('error', (e) => {
    log('error', '💥 ERROR NO CAPTURADO:', e.message, '@', e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', (e) => {
    log('error', '💥 PROMESA RECHAZADA:', e.reason);
  });

  log('info', 'Panel de diagnóstico listo. Este teléfono es: ' + (localStorage.getItem('vpos_dispositivoId') || '(sin id todavía)'));

  // ---------- 3. Estado de sync en vivo ----------
  function renderEstado() {
    const tid = (typeof _getTiendaId === 'function') ? _getTiendaId() : '(función no encontrada)';
    const canal = (typeof _realtimeChannel !== 'undefined' && _realtimeChannel) ? _realtimeChannel.topic : '(sin canal)';
    const activo = (typeof _realtimeActivo !== 'undefined') ? _realtimeActivo : '(no definido)';
    const nProd = (typeof productos !== 'undefined') ? productos.length : '?';
    const nHist = (typeof historial !== 'undefined') ? historial.length : '?';
    const nVD = (typeof ventasDiarias !== 'undefined') ? ventasDiarias.length : '?';
    let mes = 0;
    try {
      mes = (ventasDiarias || []).filter(v => typeof esMesActual === 'function' ? esMesActual(v.fecha + 'T00:00:00') : false)
                                 .reduce((s, v) => s + Number(v.monto || 0), 0);
    } catch (e) {}
    let gastos = 0;
    try {
      gastos = (pagos || []).filter(g => typeof esMesActual === 'function' ? (esMesActual(g.fechaISO) && (g.cat === 'GASTO' || g.cat === 'FACTURA')) : false)
                             .reduce((s, g) => s + Number(g.monto || 0), 0);
    } catch (e) {}
    const efIni = (typeof efectivoInicial !== 'undefined') ? efectivoInicial : '?';
    const caja = (typeof efectivoInicial !== 'undefined') ? (efectivoInicial + mes - gastos) : '?';

    statusEl.innerHTML =
      `<b>tienda_id:</b> ${tid}\n` +
      `<b>canal realtime:</b> ${canal}   <b>activo:</b> ${activo}\n` +
      `<b>productos:</b> ${nProd}   <b>historial:</b> ${nHist}   <b>ventasDiarias:</b> ${nVD}\n` +
      `<b>efectivoInicial:</b> $${efIni}   <b>ventas del mes (ventasDiarias):</b> $${mes.toFixed ? mes.toFixed(2) : mes}   <b>gastos mes:</b> $${gastos.toFixed ? gastos.toFixed(2) : gastos}\n` +
      `<b>CAJA CALCULADA:</b> $${caja.toFixed ? caja.toFixed(2) : caja}`;
  }
  setInterval(() => { if (panel.style.display !== 'none') renderEstado(); }, 2000);

  // ---------- 4. Batería de diagnóstico ----------
  panel.querySelector('#dgTest').onclick = function () {
    log('info', '──────── INICIANDO DIAGNÓSTICO ────────');
    const checks = [
      ['ejecutarReiniciarMes existe',      typeof ejecutarReiniciarMes === 'function'],
      ['_broadcast existe',                typeof _broadcast === 'function'],
      ['_iniciarRealtime existe',          typeof _iniciarRealtime === 'function'],
      ['_getSupabaseClient existe',        typeof _getSupabaseClient === 'function'],
      ['_getTiendaId existe',              typeof _getTiendaId === 'function'],
      ['autoRegistrarVentaDiaria existe',  typeof autoRegistrarVentaDiaria === 'function'],
      ['renderCajaPanelMini existe',       typeof renderCajaPanelMini === 'function'],
      ['syncAhora existe',                 typeof syncAhora === 'function'],
      ['_dot existe',                      typeof _dot === 'function'],
    ];
    checks.forEach(([nombre, ok]) => log(ok ? 'ok' : 'fail', (ok ? '✅' : '❌'), nombre));

    const tid = (typeof _getTiendaId === 'function') ? _getTiendaId() : '';
    log(tid ? 'ok' : 'fail', tid ? '✅ tienda_id configurado: ' + tid : '❌ tienda_id VACÍO — sin esto el sync entre teléfonos NO puede funcionar');

    const activo = (typeof _realtimeActivo !== 'undefined') ? _realtimeActivo : false;
    log(activo ? 'ok' : 'fail', activo ? '✅ Canal realtime CONECTADO' : '❌ Canal realtime NO conectado — revisa wifi/datos o credenciales de Supabase');

    const client = (typeof _getSupabaseClient === 'function') ? _getSupabaseClient() : null;
    log(client ? 'ok' : 'fail', client ? '✅ Cliente Supabase creado' : '❌ No se pudo crear cliente Supabase (revisa URL/API key guardadas)');

    log('info', '──────── FIN DIAGNÓSTICO ────────');
    renderEstado();
  };

  // ---------- 5. Prueba de ping entre teléfonos (canal aparte, no toca la app real) ----------
  let _diagChannel = null;
  let _diagDeviceId = 'tel_' + Math.random().toString(36).slice(2, 7);

  panel.querySelector('#dgListen').onclick = function () {
    const tid = (typeof _getTiendaId === 'function') ? _getTiendaId() : '';
    const client = (typeof _getSupabaseClient === 'function') ? _getSupabaseClient() : null;
    if (!tid || !client) { log('fail', '❌ No se puede escuchar: falta tienda_id o cliente Supabase.'); return; }
    if (_diagChannel) { log('info', 'Ya estás escuchando.'); return; }
    _diagChannel = client.channel('diag_' + tid, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        log('ok', '✅ PING RECIBIDO de', payload?.from, 'enviado a las', payload?.hora);
      })
      .subscribe((status) => {
        log('info', '[Ping] estado del canal de prueba:', status);
      });
    log('info', '👂 Escuchando pings en tienda_id=' + tid + ' como ' + _diagDeviceId + '. Ahora presiona "Enviar Ping" en el OTRO teléfono.');
  };

  panel.querySelector('#dgSend').onclick = function () {
    const tid = (typeof _getTiendaId === 'function') ? _getTiendaId() : '';
    const client = (typeof _getSupabaseClient === 'function') ? _getSupabaseClient() : null;
    if (!tid || !client) { log('fail', '❌ No se puede enviar: falta tienda_id o cliente Supabase.'); return; }
    const chan = client.channel('diag_' + tid, { config: { broadcast: { self: false } } });
    chan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        chan.send({ type: 'broadcast', event: 'ping', payload: { from: _diagDeviceId, hora: new Date().toLocaleTimeString('es-SV') } });
        log('info', '📡 Ping ENVIADO desde ' + _diagDeviceId + ' — revisa si el OTRO teléfono lo recibió (botón "Escuchar Ping" debió mostrarlo).');
        setTimeout(() => chan.unsubscribe(), 3000);
      }
    });
  };

  // ---------- 6. Ver qué ve Supabase realmente del token de esta sesión ----------
  panel.querySelector('#dgAuth').onclick = async function () {
    log('info', '──────── VERIFICANDO AUTH REAL EN SUPABASE ────────');
    if (typeof _sbRpc !== 'function') { log('fail', '❌ _sbRpc no existe.'); return; }
    try {
      const r = await _sbRpc('debug_auth_estado', {});
      const d = Array.isArray(r) ? r[0] : r;
      log('info', 'Respuesta cruda:', d);
      if (!d || d.auth_uid === undefined) {
        log('fail', '❌ La función debug_auth_estado() no existe todavía en Supabase. Créala primero (te paso el SQL) y vuelve a presionar este botón.');
      } else {
        log(d.auth_uid ? 'ok' : 'fail', (d.auth_uid ? '✅' : '❌') + ' auth.uid(): ' + (d.auth_uid || '(NULL — la app está actuando como anónimo, no autenticado)'));
        log('info', 'auth.role(): ' + d.auth_role);
        log(d.auth_tienda_id ? 'ok' : 'fail', (d.auth_tienda_id ? '✅' : '❌') + ' auth_tienda_id(): ' + (d.auth_tienda_id || 'NULL'));
        log(d.perfil_existe ? 'ok' : 'fail', (d.perfil_existe ? '✅' : '❌') + ' perfil encontrado para este auth.uid(): ' + d.perfil_existe);
      }
    } catch (e) {
      log('fail', '❌ Error llamando debug_auth_estado:', e.message);
    }
    log('info', '──────── FIN ────────');
  };

  // ---------- 7. Inspeccionar / vaciar la cola offline atascada (IndexedDB) ----------
  panel.querySelector('#dgCola').onclick = async function () {
    log('info', '──────── COLA OFFLINE (offline_queue) ────────');
    if (typeof oqGetAll !== 'function') { log('fail', '❌ oqGetAll no existe.'); return; }
    try {
      const pendientes = await oqGetAll();
      log('info', 'Total en cola:', pendientes.length);
      pendientes.forEach(p => {
        const fecha = new Date(Number(String(p.id).split('_')[1]) || 0).toLocaleString('es-SV');
        const tid = p.datos && p.datos.tienda_id;
        log(tid ? 'ok' : 'fail', `${p.operacion} | id=${p.id} | creado=${fecha} | tienda_id_en_payload="${tid || '(VACÍO)'}"`);
      });
    } catch (e) {
      log('fail', '❌ Error leyendo cola:', e.message);
    }
    log('info', '──────── FIN ────────');
  };

  panel.querySelector('#dgColaClear').onclick = async function () {
    if (!confirm('Esto borra las operaciones atascadas en la cola offline de ESTE teléfono (no borra ventas ni inventario, solo los reintentos rotos). ¿Continuar?')) return;
    if (typeof oqGetAll !== 'function' || typeof oqDelete !== 'function') { log('fail', '❌ Funciones de cola no encontradas.'); return; }
    try {
      const pendientes = await oqGetAll();
      for (const p of pendientes) { await oqDelete(p.id); }
      if (typeof _actualizarContadorCola === 'function') _actualizarContadorCola();
      log('ok', '✅ Cola vaciada:', pendientes.length, 'entradas eliminadas.');
    } catch (e) {
      log('fail', '❌ Error vaciando cola:', e.message);
    }
  };

  log('info', 'Instrucciones: Teléfono 1 presiona "👂 Escuchar Ping". Teléfono 2 presiona "📡 Enviar Ping". Si el Teléfono 1 no ve "PING RECIBIDO" en unos segundos, el broadcast realtime NO está llegando entre los dos dispositivos (esa es la causa raíz, no el código de Reiniciar Mes).');
})();
