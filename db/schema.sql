-- 1. Crear la base de datos y seleccionarla
CREATE DATABASE IF NOT EXISTS control_gastos;
USE control_gastos;

-- 2. Eliminar tablas si existen (para poder reiniciar la BD si hace falta)
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- 3. Tabla de Usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Categorías
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo ENUM('ingreso', 'egreso') NOT NULL
);

-- 5. Tabla de Transacciones (Movimientos)
CREATE TABLE transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    tipo ENUM('ingreso', 'egreso') NOT NULL,
    descripcion VARCHAR(255),
    fecha DATE NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- =====================================================
-- DATOS INICIALES DE PRUEBA (DATOS SEMILLA)
-- =====================================================

-- Insertar el usuario principal (ID = 1)
INSERT INTO usuarios (id, nombre, email) VALUES 
(1, 'Usuario Demo', 'demo@correo.com');

-- Insertar Categorías por defecto
INSERT INTO categorias (id, nombre, tipo) VALUES 
(1, 'Sueldo / Salario', 'ingreso'),
(2, 'Ventas / Freelance', 'ingreso'),
(3, 'Comida / Supermercado', 'egreso'),
(4, 'Transporte', 'egreso'),
(5, 'Servicios (Luz, Agua, Internet)', 'egreso'),
(6, 'Entretenimiento / Ocio', 'egreso'),
(7, 'Salud y Farmacia', 'egreso');

-- Insertar algunas transacciones iniciales para ver datos al arrancar
INSERT INTO transacciones (usuario_id, categoria_id, monto, tipo, descripcion, fecha) VALUES 
(1, 1, 1200.00, 'ingreso', 'Cobro de nómina quincenal', '2026-07-01'),
(1, 3, 85.50, 'egreso', 'Compra de víveres', '2026-07-05'),
(1, 5, 45.00, 'egreso', 'Pago de plan de Internet', '2026-07-10'),
(1, 2, 250.00, 'ingreso', 'Proyecto Web independiente', '2026-07-15');