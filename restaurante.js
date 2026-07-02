// =====================================================================
//  🍽️ MÓDULO DE RESTAURANTE & COMANDAS — DESPENSA ECONÓMICA
// =====================================================================

let mesaSeleccionada = null;
let tipoServicio = 'mesa'; // 'mesa' o 'llevar'
let carritoRestaurante = [];

// ── 1. RENDERIZAR PANEL DE SELECCIÓN (Mesas o Para Llevar) ──────────
function renderSeccionRestaurante() {
  const contenedor = document.getElementById('dashProContainer'); // O el ID de tu sección principal
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="restaurante-container" style="padding: 16px; font-family: 'Nunito', sans-serif;">
      <h2 style="font-weight: 900; color: var(--slate-900); margin-bottom: 16px;">🍽️ Comandas / Tienda Restaurante</h2>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button id="btnServicioMesa" class="btn" style="flex: 1; background: var(--green-600); color: #fff;" onclick="cambiarTipoServicio('mesa')">🪑 Servicio en Mesa</button>
        <button id="btnServicioLlevar" class="btn btn-ghost" style="flex: 1; border: 1.5px solid var(--border-mid);" onclick="cambiarTipoServicio('llevar')">🛍️ Para Llevar</button>
      </div>

      <div id="seccionMesas" style="margin-bottom: 24px;">
        <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--slate-600);">Selecciona una Mesa:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(num => `
            <button id="btnMesa_${num}" class="btn-mesa" style="padding: 12px; border-radius: 8px; border: 1.5px solid var(--border-mid); background: #fff; font-weight: bold; cursor:pointer;" onclick="seleccionarMesa('${num}')">
              Mesa ${num}
            </button>
          `).join('')}
        </div>
      </div>

      <div id="seccionMenu" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 id="tituloMenu" style="font-weight: 900; color: var(--green-700);">🛒 Agregando a: Mesa 1</h3>
          <button class="btn btn-ghost" style="font-size: 11px;" onclick="cancelarSeleccionMesa()">✕ Cambiar</button>
        </div>
        
        <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--slate-600);">Menú de Platos:</p>
        <div id="listaPlatosRestaurante" style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; max-height: 300px; overflow-y: auto;">
          </div>

        <button class="btn" style="width: 100%; margin-top: 16px; background: var(--green); color: #fff; padding: 14px; font-size: 16px; font-weight: 900;" onclick="enviarComandaDispositivos()">
          🚀 Enviar Pedido a Cocina y Caja
        </button>
      </div>
    </div>
  `;
}

// ── 2. LÓGICA DE INTERFACES Y SELECCIÓN ──────────────────────────────
function cambiarTipoServicio(tipo) {
  tipoServicio = tipo;
  const btnMesa = document.getElementById('btnServicioMesa');
  const btnLlevar = document.getElementById('btnServicioLlevar');
  const divMesas = document.getElementById('seccionMesas');

  if (tipo === 'llevar') {
    btnLlevar.style.background = 'var(--green-600)';
    btnLlevar.style.color = '#fff';
    btnMesa.style.background = 'transparent';
    btnMesa.style.color = 'var(--slate-700)';
    divMesas.style.display = 'none';
    
    mesaSeleccionada = 'Para Llevar';
    mostrarMenuPlatos();
  } else {
    btnMesa.style.background = 'var(--green-600)';
    btnMesa.style.color = '#fff';
    btnLlevar.style.background = 'transparent';
    btnLlevar.style.color = 'var(--slate-700)';
    divMesas.style.display = 'block';
    document.getElementById('seccionMenu').style.display = 'none';
  }
}

function seleccionarMesa(num) {
  mesaSeleccionada = `Mesa ${num}`;
  // Desmarcar otras mesas
  document.querySelectorAll('.btn-mesa').forEach(b => {
    b.style.background = '#fff';
    b.style.color = '#000';
  });
  // Marcar seleccionada
  const btn = document.getElementById(`btnMesa_${num}`);
  if (btn) {
    btn.style.background = 'var(--green-100)';
    btn.style.borderColor = 'var(--green-600)';
    btn.style.color = 'var(--green-900)';
  }
  mostrarMenuPlatos();
}

function mostrarMenuPlatos() {
  document.getElementById('tituloMenu').textContent = `🛒 Pedido: ${mesaSeleccionada}`;
  document.getElementById('seccionMenu').style.display = 'block';
  cargarPlatosMenu();
}

function cancelarSeleccionMesa() {
  document.getElementById('seccionMenu').style.display = 'none';
  mesaSeleccionada = null;
}

// ── 3. CARGAR PLATOS DESDE TU MEMORIA / INDEXEDDB ────────────────────
function cargarPlatosMenu() {
  const wrap = document.getElementById('listaPlatosRestaurante');
  if (!wrap || !window.productos) return; // Utiliza tu array global de productos existentes

  // Filtrar o mapear los productos que actúan como tus platos
  wrap.innerHTML = window.productos.map(p => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;">
      <div>
        <div style="font-weight: 700; color: var(--slate-900);">${p.nombre}</div>
        <div style="font-size: 13px; font-weight: 900; color: var(--green-700); font-family: 'Space Mono', monospace;">$${Number(p.precio_venta || p.precio).toFixed(2)}</div>
      </div>
      <button class="btn" style="padding: 4px 12px; background: var(--green-600); color: #fff; font-size: 12px;" onclick="agregarPlatoACarrito('${p.id}', '${p.nombre}', ${p.precio_venta || p.precio})">
        ➕ Agregar
      </button>
    </div>
  `).join('');
}

function agregarPlatoACarrito(id, nombre, precio) {
  carritoRestaurante.push({ id, nombre, precio });
  if (typeof toast === 'function') toast(`✅ ${nombre} agregado`);
}

// ── 4. SINCRONIZACIÓN ENTRE DISPOSITIVOS EN TIEMPO REAL ─────────────
async function enviarComandaDispositivos() {
  if (carritoRestaurante.length === 0) {
    if (typeof toast === 'function') toast('⚠ Elige al menos un plato antes de enviar', true);
    return;
  }

  // Estructura adaptada para respetar el multi-cliente (tienda_id) de tu sistema
  const comanda = {
    tienda_id: localStorage.getItem('vpos_tiendaId') || 'Tiendarosita',
    tipo_servicio: tipoServicio,
    mesa_numero: mesaSeleccionada,
    productos: carritoRestaurante, // Array de platos seleccionados
    estado_comanda: 'pendiente',
    created_at: new Date().toISOString()
  };

  try {
    // Usamos el método de inserción directa de Supabase que ya tienes mapeado en tu app
    if (typeof _sbInsert === 'function') {
      await _sbInsert('pedidos', comanda);
    } else {
      // Fallback si ejecutas directo al cliente de supabase
      await supabase.from('pedidos').insert([comanda]);
    }

    if (typeof toast === 'function') toast('🚀 ¡Comanda enviada a Cocina y Caja con éxito!');
    
    // Limpiar pantalla y carrito
    carritoRestaurante = [];
    cancelarSeleccionMesa();
    if (typeof syncAhora === 'function') syncAhora(); // Forzar actualización en los demás teléfonos/tablets
  } catch (error) {
    console.error('Error al enviar comanda:', error);
    if (typeof toast === 'function') toast('❌ Error al enviar comanda: ' + error.message, true);
  }
}

// Exponer las funciones para que los clicks del HTML las reconozcan
window.cambiarTipoServicio = cambiarTipoServicio;
window.seleccionarMesa = seleccionarMesa;
window.cancelarSeleccionMesa = cancelarSeleccionMesa;
window.agregarPlatoACarrito = agregarPlatoACarrito;
window.enviarComandaDispositivos = enviarComandaDispositivos;
