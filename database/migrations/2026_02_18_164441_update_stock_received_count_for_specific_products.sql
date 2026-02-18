-- Migración SQL directa para actualizar stock_received_count = 1 en productos específicos
-- Productos que deben mostrar "Agotado" en lugar de "Próximamente"

UPDATE productos 
SET stock_received_count = 1, updated_at = NOW()
WHERE id IN ('14612611701', '4861703701', '1761301404');
