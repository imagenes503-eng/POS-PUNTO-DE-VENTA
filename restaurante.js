// =====================================================================
//  🍽️ MÓDULO DE RESTAURANTE & COMANDAS — DESPENSA ECONÓMICA
// =====================================================================

let mesaSeleccionada = null;
let tipoServicio = 'mesa'; // 'mesa' o 'llevar'
let carritoRestaurante = [];

// ── 1. INYECTAR INTERFAZ AUTOMÁTICAMENTE EN EL CONTENEDOR DE LA TIENDA ──
function renderSeccionRestaurante() {
  const contenedor = document.getElementById('productos-grid') || 
                     document.querySelector('.productos-container') || 
                     document.getElementById('productosContainer');
  
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="restaurante-container" style="padding: 16px; font-family: 'Nunito', sans-serif; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-top: 15px;">
      <h2 style="font-weight: 900; color: #0f172a; margin-bottom: 16px; font-size: 20px; display: flex; align-items: center; gap: 8px;">🍽️ Comandas / Panel de Control</h2>
      
      <!-- Selector de Tipo de Servicio -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button id="btnServicioMesa" style="flex: 1; background: #16a34a; color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: all 0.2s;" onclick="cambiarTipoServicio('mesa')">🪑 Servicio en Mesa</button>
        <button id="btnServicioLlevar" style="flex: 1; background: #f1f5f9; color: #334155; border: 1.5px solid #cbd5e1; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: all 0.2s;" onclick="cambiarTipoServicio('llevar')">🛍️ Para Llevar</button>
      </div>

      <!-- Sección de Mesas -->
      <div id="seccionMesas" style="margin-bottom: 24px;">
        <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Selecciona una Mesa:</p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(num => `
            <button id="btnMesa_${num}" class="btn-mesa" style="padding: 14px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; font-weight: 800; color: #1e293b; cursor: pointer; transition: all 0.2s;" onclick="seleccionarMesa('${num}')">
              Mesa ${num}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Sección de Menú / Platos -->
      <div id="seccionMenu" style="display: none; border-top: 2px dashed #e2e8f0; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 id="tituloMenu" style="font-weight: 900; color: #16a34a; margin: 0; font-size: 16px;">🛒 Agregando Orden</h3>
          <button style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 13px;" onclick="cancelarSeleccionMesa()">✕ Cambiar</button>
        </div>
        
        <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Menú del Restaurante / Platos:</p>
        <div id="listaPlatosRestaurante" style="display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto; padding-right: 4px;">
          <!-- Cargado Dinámicamente -->
        </div>

        <!-- Botón de Sincronización Inmediata -->
        <button style="width: 100%; margin-top: 18px; background: #16a34a; color: #fff; border: none; padding: 14px; border-radius: 8px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);" onclick="enviarComandaDispositivos()">
          🚀 Enviar Pedido a Cocina y Caja
        </button>
      </div>
    </div>
  `;
}

// ── 2. CONTROL DE FLUJO E INTERFAZ TÁCTIL ──
function cambiarTipoServicio(tipo) {
  tipoServicio = tipo;
  const btnMesa = document.getElementById('btnServicioMesa');
  const btnLlevar = document.getElementById('btnServicioLlevar');
  const divMesas = document.getElementById('seccionMesas');

  if (tipo === 'llevar') {
    btnLlevar.style.background = '#16a34a';
    btnLlevar.style.color = '#fff';
    btnMesa.style.background = '#f1f5f9';
    btnMesa.style.color = '#334155';
    divMesas.style.display = 'none';
    
    mesaSeleccionada = 'Para Llevar';
    mostrarMenuPlatos();
  } else {
    btnMesa.style.background = '#16a34a';
    btnMesa.style.color = '#fff';
    btnLlevar.style.background = '#f1f5f9';
    btnLlevar.style.color = '#334155';
    divMesas.style.display = 'block';
    document.getElementById('seccionMenu').style.display = 'none';
    mesaSeleccionada = null;
  }
}

function seleccionarMesa(num) {
  mesaSeleccionada = `Mesa ${num}`;
  document.querySelectorAll('.btn-mesa').forEach(b => {
    b.style.background = '#fff';
    b.style.borderColor = '#e2e8f0';
    b.style.color = '#1e293b';
  });
  const btn = document.getElementById(`btnMesa_${num}`);
  if (btn) {
    btn.style.background = '#f0fdf4';
    btn.style.borderColor = '#16a34a';
    btn.style.color = '#16a34a';
  }
  mostrarMenuPlatos();
}

function mostrarMenuPlatos() {
  const titulo = document.getElementById('tituloMenu');
  if (titulo) titulo.textContent = `🛒 Pedido activo: ${mesaSeleccionada}`;
  document.getElementById('seccionMenu').style.display = 'block';
  cargarPlatosMenu();
}

function cancelarSeleccionMesa() {
  document.getElementById('seccionMenu').style.display = 'none';
  mesaSeleccionada = null;
  document.querySelectorAll('.btn-mesa').forEach(b => {
    b.style.background = '#fff';
    b.style.borderColor = '#e2e8f0';
    b.style.color = '#1e293b';
  });
}

// ── 3. MAPEO DE PRODUCTOS DE LA TIENDA COMO PLATOS DEL RESTAURANTE ──
function cargarPlatosMenu() {
  const wrap = document.getElementById('listaPlatosRestaurante');
  if (!wrap) return;

  // Acceder al array global nativo que usa tu catálogo ('productos')
  const platos = window.productos || [];

  if (platos.length === 0) {
    wrap.innerHTML = `<p style="text-align:center; padding:16px; color:#64748b; font-size:13px;">Sincronizando el menú con la base de datos de la tienda...</p>`;
    return;
  }

  wrap.innerHTML = platos.map(p => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div>
        <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${p.nombre || p.title}</div>
        <div style="font-size: 13px; font-weight: 900; color: #16a34a; margin-top: 2px;">$${Number(p.precio_venta || p.precio || 0).toFixed(2)}</div>
      </div>
      <button style="padding: 6px 12px; background: #16a34a; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer;" onclick="agregarPlatoACarrito('${p.id}', '${p.nombre || p.title}', ${p.precio_venta || p.precio || 0})">
        ➕ Agregar
      </button>
    </div>
  `).join('');
}

function agregarPlatoACarrito(id, nombre, precio) {
  carritoRestaurante.push({ id, nombre, precio });
  if (typeof alertNotificacion === 'function') alertNotificacion(`✅ ${nombre} añadido`);
}

// ── 4. ENVÍO DE DATOS EN TIEMPO REAL A SUPABASE ──
async function enviarComandaDispositivos() {
  if (carritoRestaurante.length === 0) {
    alert('⚠ Por favor, selecciona los platos que se van a ordenar.');
    return;
  }

  const comanda = {
    tienda_id: localStorage.getItem('vpos_tiendaId') || 'Tiendarosita',
    tipo_servicio: tipoServicio,
    mesa_numero: mesaSeleccionada,
    productos: carritoRestaurante,
    estado_comanda: 'pendiente',
    created_at: new Date().toISOString()
  };

  try {
    // Inserción directa vinculada a tu cliente supabase global
    const { error } = await supabase.from('pedidos').insert([comanda]);
    
    if (error) throw error;

    alert('🚀 ¡Comanda enviada a la cocina y registrada con éxito!');
    carritoRestaurante = [];
    cancelarSeleccionMesa();
    
    // Si tu app tiene implementado el refresco forzado
    if (typeof refreshData === 'function') refreshData();
  } catch (err) {
    console.error(err);
    alert('❌ Error al sincronizar el pedido: ' + err.message);
  }
}

// Inicialización limpia automática al renderizar la tienda
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { renderSeccionRestaurante(); }, 1200); 
});

// Registrar eventos globales para el motor HTML
window.cambiarTipoServicio = cambiarTipoServicio;
window.seleccionarMesa = seleccionarMesa;
window.cancelarSeleccionMesa = cancelarSeleccionMesa;
window.agregarPlatoACarrito = agregarPlatoACarrito;
window.enviarComandaDispositivos = enviarComandaDispositivos;

