-- Corrige teléfonos de la carga masiva que Excel guardó como número
-- ("573216063514.0"): el ".0" terminaba pegado como un dígito más.

-- Las invitaciones de WhatsApp de esas profesionales salieron al número
-- equivocado (o fallaron por "sin WhatsApp"): se borran para que el próximo
-- mensaje de un cliente vuelva a invitarla al número correcto.
DELETE FROM "WhatsappOutreach" o
USING "User" u
WHERE o."userId" = u."id"
  AND u."phone" ~ '\.0+$'
  AND o."status" IN ('INVITED', 'FAILED');

UPDATE "User"
SET "phone" = regexp_replace("phone", '\.0+$', '')
WHERE "phone" ~ '\.0+$';
