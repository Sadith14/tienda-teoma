-- ============================================
-- SCHEMA COMPLETO PARA TIENDA TEOMA
-- ============================================
-- Copia y pega este archivo completo en Supabase SQL Editor

-- 1. TABLA DE PRODUCTOS
CREATE TABLE productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(100) UNIQUE,
    precio_base DECIMAL(10, 2) NOT NULL,
    categoria VARCHAR(100),
    descripcion TEXT,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABLA DE LOTES (Control de inventario por ubicación)
CREATE TABLE lotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    numero_lote VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE,
    numero_caja VARCHAR(50),
    ubicacion VARCHAR(20) NOT NULL CHECK (ubicacion IN ('almacen', 'mostrador')),
    cantidad INTEGER NOT NULL DEFAULT 0,
    fecha_ingreso TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLA DE MOVIMIENTOS (Historial de todos los movimientos)
CREATE TABLE movimientos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'traspaso', 'venta', 'ajuste')),
    cantidad INTEGER NOT NULL,
    ubicacion_origen VARCHAR(20),
    ubicacion_destino VARCHAR(20),
    fecha TIMESTAMP DEFAULT NOW(),
    notas TEXT,
    usuario VARCHAR(100)
);

-- 4. TABLA DE VENTAS
CREATE TABLE ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha TIMESTAMP DEFAULT NOW(),
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    cliente_nombre VARCHAR(255),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABLA DE DETALLE DE VENTAS
CREATE TABLE detalle_ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MEJORAR EL RENDIMIENTO
-- ============================================

CREATE INDEX idx_lotes_producto ON lotes(producto_id);
CREATE INDEX idx_lotes_ubicacion ON lotes(ubicacion);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX idx_movimientos_lote ON movimientos(lote_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR INVENTARIO AL VENDER
-- ============================================

CREATE OR REPLACE FUNCTION actualizar_inventario_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Restar del lote
    UPDATE lotes 
    SET cantidad = cantidad - NEW.cantidad
    WHERE id = NEW.lote_id;
    
    -- Registrar movimiento
    INSERT INTO movimientos (lote_id, tipo, cantidad, ubicacion_origen, fecha)
    VALUES (NEW.lote_id, 'venta', NEW.cantidad, 'mostrador', NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta automáticamente al insertar una venta
CREATE TRIGGER trigger_actualizar_inventario
AFTER INSERT ON detalle_ventas
FOR EACH ROW
EXECUTE FUNCTION actualizar_inventario_venta();

-- ============================================
-- FUNCIÓN PARA TRASPASAR ENTRE UBICACIONES
-- ============================================

CREATE OR REPLACE FUNCTION traspasar_inventario(
    p_lote_id UUID,
    p_cantidad INTEGER,
    p_destino VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_ubicacion_actual VARCHAR;
    v_cantidad_actual INTEGER;
BEGIN
    -- Obtener ubicación y cantidad actual
    SELECT ubicacion, cantidad INTO v_ubicacion_actual, v_cantidad_actual
    FROM lotes WHERE id = p_lote_id;
    
    -- Verificar que hay suficiente cantidad
    IF v_cantidad_actual < p_cantidad THEN
        RAISE EXCEPTION 'No hay suficiente cantidad en el lote';
    END IF;
    
    -- Si es traspaso completo, actualizar ubicación
    IF v_cantidad_actual = p_cantidad THEN
        UPDATE lotes 
        SET ubicacion = p_destino, 
            cantidad = p_cantidad
        WHERE id = p_lote_id;
    ELSE
        -- Si es parcial, crear nuevo lote en destino
        INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, numero_caja, ubicacion, cantidad)
        SELECT producto_id, numero_lote, fecha_vencimiento, numero_caja, p_destino, p_cantidad
        FROM lotes WHERE id = p_lote_id;
        
        -- Restar del origen
        UPDATE lotes 
        SET cantidad = cantidad - p_cantidad
        WHERE id = p_lote_id;
    END IF;
    
    -- Registrar movimiento
    INSERT INTO movimientos (lote_id, tipo, cantidad, ubicacion_origen, ubicacion_destino, fecha)
    VALUES (p_lote_id, 'traspaso', p_cantidad, v_ubicacion_actual, p_destino, NOW());
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA PARA INVENTARIO RESUMIDO
-- ============================================

CREATE VIEW vista_inventario AS
SELECT 
    p.id as producto_id,
    p.nombre,
    p.codigo_barras,
    p.precio_base,
    p.categoria,
    COALESCE(SUM(CASE WHEN l.ubicacion = 'mostrador' THEN l.cantidad ELSE 0 END), 0) as cantidad_mostrador,
    COALESCE(SUM(CASE WHEN l.ubicacion = 'almacen' THEN l.cantidad ELSE 0 END), 0) as cantidad_almacen,
    COALESCE(SUM(l.cantidad), 0) as cantidad_total,
    MIN(l.fecha_vencimiento) as proxima_vencimiento
FROM productos p
LEFT JOIN lotes l ON p.id = l.producto_id AND l.cantidad > 0
WHERE p.activo = true
GROUP BY p.id, p.nombre, p.codigo_barras, p.precio_base, p.categoria;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, codigo_barras, precio_base, categoria, descripcion) VALUES
('Té Verde Premium', '7501234567890', 15.50, 'Té Verde', 'Té verde de alta calidad'),
('Té Negro English Breakfast', '7501234567891', 18.00, 'Té Negro', 'Té negro tradicional inglés'),
('Té de Manzanilla', '7501234567892', 12.00, 'Té Herbal', 'Té de manzanilla natural'),
('Té Oolong', '7501234567893', 22.50, 'Té Oolong', 'Té semi-fermentado'),
('Té Chai Especiado', '7501234567894', 20.00, 'Té Especiado', 'Mezcla de especias y té negro');

-- Insertar lotes de ejemplo en almacén
INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, numero_caja, ubicacion, cantidad)
SELECT 
    id,
    'LOTE-2025-001',
    DATE '2025-12-31',
    'CAJA-A1',
    'almacen',
    50
FROM productos
LIMIT 3;

-- Insertar lotes de ejemplo en mostrador
INSERT INTO lotes (producto_id, numero_lote, fecha_vencimiento, numero_caja, ubicacion, cantidad)
SELECT 
    id,
    'LOTE-2025-001',
    DATE '2025-12-31',
    NULL,
    'mostrador',
    10
FROM productos
LIMIT 3;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura pública (puedes ajustar según necesites)
CREATE POLICY "Permitir lectura pública" ON productos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública" ON lotes FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública" ON movimientos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública" ON ventas FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública" ON detalle_ventas FOR SELECT USING (true);

-- Política: Permitir inserción/actualización pública (para desarrollo)
-- IMPORTANTE: En producción deberías agregar autenticación
CREATE POLICY "Permitir inserción pública" ON productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización pública" ON productos FOR UPDATE USING (true);
CREATE POLICY "Permitir inserción pública" ON lotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización pública" ON lotes FOR UPDATE USING (true);
CREATE POLICY "Permitir inserción pública" ON movimientos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserción pública" ON ventas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir inserción pública" ON detalle_ventas FOR INSERT WITH CHECK (true);

-- ============================================
-- ¡LISTO! Tu base de datos está configurada
-- ============================================
