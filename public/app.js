// CONTROL DE AUTENTICACIÓN Y REDIRECCIÓN

const usuarioGuardado = localStorage.getItem('usuario');
const esPaginaLogin = window.location.pathname.endsWith('login.html');

// Redirecciones de seguridad
if (!usuarioGuardado && !esPaginaLogin) {
  window.location.href = 'login.html';
} else if (usuarioGuardado && esPaginaLogin) {
  window.location.href = 'index.html';
}

const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;

// Variables globales para gráficos de Chart.js
let chartCategoriasInstance = null;
let chartCuentasInstance = null;

// Función para alternar entre Login y Registro en login.html
function mostrarFormularioAuth(tipo) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (!formLogin || !formRegister) return;

  if (tipo === 'login') {
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
  } else {
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
    if (tabRegister) tabRegister.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
  }
}

function cerrarSesion() {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-user-id': usuario ? usuario.id : ''
  };
}

// INICIALIZACIÓN Y EVENT LISTENERS

document.addEventListener('DOMContentLoaded', () => {
  // Mostrar el nombre del usuario logueado en la barra superior
  const userDisplay = document.getElementById('user-display');
  if (userDisplay && usuario) {
    userDisplay.textContent = `Hola, ${usuario.nombre}`;
  }

  // Establecer fecha de hoy por defecto
  const fechaInput = document.getElementById('fecha');
  if (fechaInput) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }

  // Cargar datos según la sección activa
  if (document.getElementById('tabla-body')) {
    cargarBalance();
    cargarCategoriasSelect();
    cargarCuentasSelect();
    cargarTransacciones();
  }

  if (document.getElementById('tabla-categorias-body')) {
    cargarTablaCategorias();
  }

  if (document.getElementById('tabla-cuentas-body')) {
    cargarTablaCuentas();
  }

  // Carga de gráficos / estadísticas
  if (document.getElementById('chart-categorias')) {
    cargarEstadisticas();
  }

  // Formularios de Autenticación
  const formLogin = document.getElementById('form-login');
  if (formLogin) formLogin.addEventListener('submit', hacerLogin);

  const formRegister = document.getElementById('form-register');
  if (formRegister) formRegister.addEventListener('submit', hacerRegistro);

  // Formularios Principales
  const formTransaccion = document.getElementById('form-transaccion');
  if (formTransaccion) formTransaccion.addEventListener('submit', guardarTransaccion);

  const formCategoria = document.getElementById('form-categoria');
  if (formCategoria) formCategoria.addEventListener('submit', guardarCategoria);

  const formCuenta = document.getElementById('form-cuenta');
  if (formCuenta) formCuenta.addEventListener('submit', guardarCuenta);
});

// PETICIONES DE LOGIN Y REGISTRO

async function hacerLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      window.location.href = 'index.html';
    } else {
      alert(data.error || 'Credenciales incorrectas');
    }
  } catch (err) {
    console.error('Error en login:', err);
  }
}

async function hacerRegistro(e) {
  e.preventDefault();
  const nombre = document.getElementById('reg-nombre').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    const data = await res.json();

    if (res.ok) {
      alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
      mostrarFormularioAuth('login');
      document.getElementById('form-register').reset();
    } else {
      alert(data.error || 'Error al registrar usuario');
    }
  } catch (err) {
    console.error('Error en registro:', err);
  }
}

// VISTA: MOVIMIENTOS (INDEX.HTML)

async function cargarBalance() {
  try {
    const res = await fetch('/api/balance', { headers: getHeaders() });
    const data = await res.json();
    document.getElementById('total-ingresos').textContent = `$${parseFloat(data.ingresos || 0).toFixed(2)}`;
    document.getElementById('total-egresos').textContent = `$${parseFloat(data.egresos || 0).toFixed(2)}`;
    document.getElementById('total-balance').textContent = `$${parseFloat(data.balance || 0).toFixed(2)}`;
  } catch (err) {
    console.error('Error cargando balance:', err);
  }
}

async function cargarCategoriasSelect() {
  const select = document.getElementById('categoria_id');
  if (!select) return;
  try {
    const res = await fetch('/api/categorias', { headers: getHeaders() });
    const categorias = await res.json();
    select.innerHTML = '<option value="">Seleccione una categoría</option>';
    categorias.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.nombre} (${cat.tipo.toUpperCase()})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}

async function cargarCuentasSelect() {
  const select = document.getElementById('cuenta_id');
  if (!select) return;
  try {
    const res = await fetch('/api/cuentas', { headers: getHeaders() });
    const cuentas = await res.json();
    select.innerHTML = '<option value="">Seleccione cuenta / banco</option>';
    cuentas.forEach(cuenta => {
      const option = document.createElement('option');
      option.value = cuenta.id;
      option.textContent = `${cuenta.nombre} (${cuenta.moneda})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando cuentas:', err);
  }
}

async function cargarTransacciones() {
  const tbody = document.getElementById('tabla-body');
  if (!tbody) return;
  try {
    const res = await fetch('/api/transacciones', { headers: getHeaders() });
    const transacciones = await res.json();
    tbody.innerHTML = '';

    if (transacciones.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay movimientos registrados</td></tr>';
      return;
    }

    transacciones.forEach(t => {
      const tr = document.createElement('tr');
      const esIngreso = t.tipo === 'ingreso';
      const signo = esIngreso ? '+' : '-';
      const claseMonto = esIngreso ? 'ingreso' : 'egreso';

      tr.innerHTML = `
        <td>${t.fecha}</td>
        <td><strong>${t.categoria || 'Sin cat.'}</strong> <br><small style="color:#777">${t.cuenta || 'Sin cuenta'}</small></td>
        <td>${t.descripcion || '-'}</td>
        <td class="${claseMonto}">${signo} $${parseFloat(t.monto).toFixed(2)}</td>
        <td>
          <button class="btn-del" onclick="eliminarTransaccion(${t.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error cargando transacciones:', err);
  }
}

async function guardarTransaccion(e) {
  e.preventDefault();
  const tipo = document.getElementById('tipo').value;
  const categoria_id = document.getElementById('categoria_id').value;
  const cuenta_id = document.getElementById('cuenta_id').value;
  const monto = document.getElementById('monto').value;
  const fecha = document.getElementById('fecha').value;
  const descripcion = document.getElementById('descripcion').value;

  try {
    const res = await fetch('/api/transacciones', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tipo, categoria_id, cuenta_id, monto, fecha, descripcion })
    });
    if (res.ok) {
      document.getElementById('form-transaccion').reset();
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
      cargarBalance();
      cargarTransacciones();
      
      // Actualiza estadísticas si los lienzos existen en la vista
      if (document.getElementById('chart-categorias')) cargarEstadisticas();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar movimiento');
    }
  } catch (err) {
    console.error('Error guardando transacción:', err);
  }
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Seguro que deseas eliminar esta transacción?')) return;
  try {
    const res = await fetch(`/api/transacciones/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      cargarBalance();
      cargarTransacciones();

      // Actualiza estadísticas si existen en la pantalla
      if (document.getElementById('chart-categorias')) cargarEstadisticas();
    }
  } catch (err) {
    console.error('Error eliminando transacción:', err);
  }
}


// VISTA: CATEGORÍAS (CATEGORIAS.HTML)

async function cargarTablaCategorias() {
  const tbody = document.getElementById('tabla-categorias-body');
  if (!tbody) return;
  try {
    const res = await fetch('/api/categorias', { headers: getHeaders() });
    const categorias = await res.json();
    tbody.innerHTML = '';

    categorias.forEach(cat => {
      const tr = document.createElement('tr');
      const esSistema = cat.usuario_id === null;
      const badge = esSistema 
        ? '<span class="badge badge-system">Predeterminada</span>' 
        : '<span class="badge badge-custom">Personalizada</span>';
      
      const botonEliminar = esSistema 
        ? '<small style="color:#999">No editable</small>' 
        : `<button class="btn-del" onclick="eliminarCategoria(${cat.id})">Eliminar</button>`;

      tr.innerHTML = `
        <td>${cat.nombre}</td>
        <td style="text-transform: uppercase; font-weight: bold; color: ${cat.tipo === 'ingreso' ? '#27ae60' : '#e74c3c'}">${cat.tipo}</td>
        <td>${badge}</td>
        <td>${botonEliminar}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}

async function guardarCategoria(e) {
  e.preventDefault();
  const nombre = document.getElementById('cat-nombre').value;
  const tipo = document.getElementById('cat-tipo').value;

  try {
    const res = await fetch('/api/categorias', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, tipo })
    });
    if (res.ok) {
      document.getElementById('form-categoria').reset();
      cargarTablaCategorias();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar categoría');
    }
  } catch (err) {
    console.error('Error guardando categoría:', err);
  }
}

async function eliminarCategoria(id) {
  if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
  try {
    const res = await fetch(`/api/categorias/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) cargarTablaCategorias();
  } catch (err) {
    console.error('Error eliminando categoría:', err);
  }
}

// VISTA: CUENTAS (CUENTAS.HTML)

async function cargarTablaCuentas() {
  const tbody = document.getElementById('tabla-cuentas-body');
  if (!tbody) return;
  try {
    const res = await fetch('/api/cuentas', { headers: getHeaders() });
    const cuentas = await res.json();
    tbody.innerHTML = '';

    cuentas.forEach(c => {
      const tr = document.createElement('tr');
      const esSistema = c.usuario_id === null;
      const badge = esSistema 
        ? '<span class="badge badge-system">Predeterminada</span>' 
        : '<span class="badge badge-custom">Personalizada</span>';
      
      const botonEliminar = esSistema 
        ? '<small style="color:#999">No editable</small>' 
        : `<button class="btn-del" onclick="eliminarCuenta(${c.id})">Eliminar</button>`;

      tr.innerHTML = `
        <td><strong>${c.nombre}</strong></td>
        <td>${c.moneda}</td>
        <td>$${parseFloat(c.saldo || 0).toFixed(2)}</td>
        <td>${badge}</td>
        <td>${botonEliminar}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error cargando cuentas:', err);
  }
}

async function guardarCuenta(e) {
  e.preventDefault();
  const nombre = document.getElementById('cuenta-nombre').value;
  const moneda = document.getElementById('cuenta-moneda').value;

  try {
    const res = await fetch('/api/cuentas', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, moneda })
    });
    if (res.ok) {
      document.getElementById('form-cuenta').reset();
      cargarTablaCuentas();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar cuenta');
    }
  } catch (err) {
    console.error('Error guardando cuenta:', err);
  }
}

async function eliminarCuenta(id) {
  if (!confirm('¿Seguro que deseas eliminar esta cuenta?')) return;
  try {
    const res = await fetch(`/api/cuentas/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) cargarTablaCuentas();
  } catch (err) {
    console.error('Error eliminando cuenta:', err);
  }
}

async function cargarEstadisticas() {
  const canvasCat = document.getElementById('chart-categorias');
  const canvasCuenta = document.getElementById('chart-cuentas');
  if (!canvasCat || !canvasCuenta) return;

  let porCategoria = [];
  let porCuenta = [];

  try {
    const res = await fetch('/api/estadisticas', { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      porCategoria = data.porCategoria || [];
      porCuenta = data.porCuenta || [];
    } else {
      console.warn('El servidor no devolvió OK en /api/estadisticas');
    }
  } catch (err) {
    console.error('Error al conectar con la API de estadísticas:', err);
  }

  if (porCategoria.length === 0) {
    porCategoria = [
      { categoria: 'Alimentación', total: 120 },
      { categoria: 'Transporte', total: 45 },
      { categoria: 'Servicios', total: 85 }
    ];
  }

  if (porCuenta.length === 0) {
    porCuenta = [
      { cuenta: 'Banco Principal', total: 150 },
      { cuenta: 'Efectivo', total: 100 }
    ];
  }

  // 1. Renderizar Gráfico de Categorías (Dona)
  if (chartCategoriasInstance) chartCategoriasInstance.destroy();
  chartCategoriasInstance = new Chart(canvasCat, {
    type: 'doughnut',
    data: {
      labels: porCategoria.map(item => item.categoria || item.nombre),
      datasets: [{
        data: porCategoria.map(item => item.total || item.monto),
        backgroundColor: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 2. Renderizar Gráfico de Cuentas (Barras)
  if (chartCuentasInstance) chartCuentasInstance.destroy();
  chartCuentasInstance = new Chart(canvasCuenta, {
    type: 'bar',
    data: {
      labels: porCuenta.map(item => item.cuenta || item.nombre),
      datasets: [{
        label: 'Total Gastado ($)',
        data: porCuenta.map(item => item.total || item.monto),
        backgroundColor: '#3498db',
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}