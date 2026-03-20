// =====================================================================
//  DESPENSA ECONÓMICA — Google Apps Script
//  Pega TODO este código en script.google.com → Proyecto nuevo
//  Luego: Implementar → Nueva implementación → App web
//         Ejecutar como: Yo
//         Acceso: Cualquiera
//  Copia la URL /exec y pégala en la app (botón ⚙️ Sheets)
// =====================================================================

// OPCIONAL: pega aquí el ID de tu Google Sheet específico
// Si lo dejas vacío, el script usa la hoja activa o crea una nueva
const SPREADSHEET_ID = '';

const HOJA_VENTAS    = 'Ventas';
const HOJA_PRODUCTOS = 'Inventario';
const CABECERA_VENTAS    = ['ID', 'Fecha', 'Total $', 'Pago $', 'Vuelto $', 'Productos'];
const CABECERA_PRODUCTOS = ['ID', 'Nombre', 'Categoría', 'Precio Compra', 'Precio Venta', 'Stock', 'Stock Mínimo'];

// Recibe POST desde la app HTML
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const accion = body.accion;
    if (accion === 'VENTA')     return responder(registrarVenta(body));
    if (accion === 'PRODUCTOS') return responder(sincronizarProductos(body));
    return responder({ ok: false, error: 'Accion desconocida: ' + accion });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

// GET para verificar que el script está activo
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'Despensa Economica API activa' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Registra una venta nueva en la hoja Ventas
function registrarVenta(data) {
  const hoja = obtenerHoja(HOJA_VENTAS, CABECERA_VENTAS);
  hoja.appendRow([
    data.id     || '',
    data.fecha  || new Date().toISOString(),
    data.total  || 0,
    data.pago   || 0,
    data.vuelto || 0,
    data.items  || ''
  ]);
  return { ok: true, msg: 'Venta registrada' };
}

// Reemplaza todo el inventario con los datos actuales
function sincronizarProductos(data) {
  const hoja = obtenerHoja(HOJA_PRODUCTOS, CABECERA_PRODUCTOS);
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) {
    hoja.getRange(2, 1, ultimaFila - 1, hoja.getLastColumn()).clearContent();
  }
  const filas = data.filas || [];
  if (filas.length > 0) {
    hoja.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  }
  return { ok: true, msg: filas.length + ' productos sincronizados' };
}

function obtenerHoja(nombre, cabeceras) {
  let ss;
  try {
    ss = SPREADSHEET_ID
      ? SpreadsheetApp.openById(SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {
    ss = SpreadsheetApp.create('Despensa Economica — Datos');
  }
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    const r = hoja.getRange(1, 1, 1, cabeceras.length);
    r.setValues([cabeceras]);
    r.setFontWeight('bold');
    r.setBackground('#d1fae5');
    r.setFontColor('#064e3b');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
