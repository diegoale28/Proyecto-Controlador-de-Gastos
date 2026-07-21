const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la base de datos MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Ajusta con tu contraseña de MySQL si la tienes
  database: 'control_gastos'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    return;
  }
  console.log('✅ Conectado exitosamente a la base de datos MySQL.');
});

// RUTA 1: AUTENTICACIÓN Y USUARIOS

// POST /api/register - Registro de nuevo usuario
app.post('/api/register', (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const query = 'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)';
  db.query(query, [nombre.trim(), email.trim().toLowerCase(), password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Usuario registrado con éxito', userId: result.insertId });
  });
});

// POST /api/login - Inicio de sesión
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresa correo y contraseña' });
  }

  const query = 'SELECT id, nombre, email FROM usuarios WHERE email = ? AND password = ?';
  db.query(query, [email.trim().toLowerCase(), password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    res.json({ message: 'Inicio de sesión exitoso', usuario: results[0] });
  });
});

// RUTA 2: CUENTAS Y BANCOS

// GET /api/cuentas - Obtener cuentas predeterminadas y personalizadas con saldo
app.get('/api/cuentas', (req, res) => {
  const userId = req.headers['x-user-id'];

  const query = `
    SELECT 
      c.id, 
      c.nombre, 
      c.moneda, 
      c.usuario_id,
      COALESCE(SUM(
        CASE 
          WHEN t.tipo = 'ingreso' THEN t.monto 
          WHEN t.tipo = 'egreso' THEN -t.monto 
          ELSE 0 
        END
      ), 0) AS saldo
    FROM cuentas c
    LEFT JOIN transacciones t ON c.id = t.cuenta_id AND t.usuario_id = ?
    WHERE c.usuario_id IS NULL OR c.usuario_id = ?
    GROUP BY c.id, c.nombre, c.moneda, c.usuario_id
    ORDER BY c.nombre ASC
  `;

  db.query(query, [userId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /api/cuentas - Crear cuenta personalizada
app.post('/api/cuentas', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { nombre, moneda } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre de la cuenta es obligatorio' });
  }

  const query = 'INSERT INTO cuentas (nombre, moneda, usuario_id) VALUES (?, ?, ?)';
  db.query(query, [nombre.trim(), moneda || 'VES', userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Cuenta creada', id: result.insertId });
  });
});

// DELETE /api/cuentas/:id - Eliminar cuenta personalizada
app.delete('/api/cuentas/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const cuentaId = req.params.id;

  const query = 'DELETE FROM cuentas WHERE id = ? AND usuario_id = ?';
  db.query(query, [cuentaId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'No puedes eliminar una cuenta predeterminada del sistema' });
    }
    res.json({ message: 'Cuenta eliminada exitosamente' });
  });
});

// RUTA 3: CATEGORÍAS

// GET /api/categorias - Obtener categorías predeterminadas y del usuario
app.get('/api/categorias', (req, res) => {
  const userId = req.headers['x-user-id'];

  const query = `
    SELECT id, nombre, LOWER(tipo) AS tipo, usuario_id 
    FROM categorias 
    WHERE usuario_id IS NULL OR usuario_id = ?
    ORDER BY nombre ASC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /api/categorias - Crear categoría personalizada
app.post('/api/categorias', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { nombre, tipo } = req.body;

  if (!nombre || !tipo) {
    return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
  }

  const query = 'INSERT INTO categorias (nombre, tipo, usuario_id) VALUES (?, ?, ?)';
  db.query(query, [nombre.trim(), tipo.toLowerCase().trim(), userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Categoría creada', id: result.insertId });
  });
});

// DELETE /api/categorias/:id - Eliminar categoría personalizada
app.delete('/api/categorias/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const categoriaId = req.params.id;

  const query = 'DELETE FROM categorias WHERE id = ? AND usuario_id = ?';
  db.query(query, [categoriaId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'No puedes eliminar categorías predeterminadas' });
    }
    res.json({ message: 'Categoría eliminada' });
  });
});


// RUTA 4: TRANSACCIONES Y BALANCE


// GET /api/transacciones - Obtener historial de movimientos del usuario
app.get('/api/transacciones', (req, res) => {
  const userId = req.headers['x-user-id'];

  const query = `
    SELECT 
      t.id, 
      t.tipo, 
      t.monto, 
      DATE_FORMAT(t.fecha, '%Y-%m-%d') AS fecha, 
      t.descripcion,
      c.nombre AS categoria,
      cu.nombre AS cuenta
    FROM transacciones t
    LEFT JOIN categorias c ON t.categoria_id = c.id
    LEFT JOIN cuentas cu ON t.cuenta_id = cu.id
    WHERE t.usuario_id = ?
    ORDER BY t.fecha DESC, t.id DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// POST /api/transacciones - Guardar un nuevo movimiento
app.post('/api/transacciones', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { tipo, categoria_id, cuenta_id, monto, fecha, descripcion } = req.body;

  if (!tipo || !categoria_id || !cuenta_id || !monto || !fecha) {
    return res.status(400).json({ error: 'Completa todos los campos obligatorios' });
  }

  const query = `
    INSERT INTO transacciones (tipo, categoria_id, cuenta_id, monto, fecha, descripcion, usuario_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query, 
    [tipo, categoria_id, cuenta_id, monto, fecha, descripcion || null, userId], 
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Transacción registrada exitosamente', id: result.insertId });
    }
  );
});

// DELETE /api/transacciones/:id - Eliminar una transacción
app.delete('/api/transacciones/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const transaccionId = req.params.id;

  const query = 'DELETE FROM transacciones WHERE id = ? AND usuario_id = ?';
  db.query(query, [transaccionId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Transacción eliminada' });
  });
});

// GET /api/balance - Obtener balance general (Ingresos, Egresos, Balance)
app.get('/api/balance', (req, res) => {
  const userId = req.headers['x-user-id'];

  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) AS egresos,
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto WHEN tipo = 'egreso' THEN -monto ELSE 0 END), 0) AS balance
    FROM transacciones
    WHERE usuario_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Endpoint para obtener datos agrupados para las estadísticas
app.get('/api/estadisticas', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

  // 1. Gastos por Categoría
  const sqlCategorias = `
    SELECT c.nombre AS categoria, SUM(t.monto) AS total
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.usuario_id = ? AND t.tipo = 'egreso'
    GROUP BY c.id, c.nombre
  `;

  // 2. Gastos por Cuenta / Banco
  const sqlCuentas = `
    SELECT cu.nombre AS cuenta, SUM(t.monto) AS total
    FROM transacciones t
    JOIN cuentas cu ON t.cuenta_id = cu.id
    WHERE t.usuario_id = ? AND t.tipo = 'egreso'
    GROUP BY cu.id, cu.nombre
  `;

  db.query(sqlCategorias, [userId], (err, resCat) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(sqlCuentas, [userId], (err, resCuenta) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        porCategoria: resCat,
        porCuenta: resCuenta
      });
    });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});