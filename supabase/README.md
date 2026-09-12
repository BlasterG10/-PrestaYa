# Presta Ya — Backend Supabase

Backend creado en el proyecto Supabase `PrestaYa`.

## Componentes

- PostgreSQL: `profiles`, `customers`, `loans`, `installments`, `payments`, `audit_logs`.
- RLS: políticas por rol para cliente, cobrador, supervisor y administrador.
- Identificadores de negocio: `customer_number` y `loan_number`, separados de los UUID internos.
- Edge Function: `prestaya-api`, autenticada con JWT.
- Cliente web: `supabase/client.js`.

## Endpoint

La función está publicada como `prestaya-api` en el proyecto Supabase. Requiere autenticación JWT.

Rutas iniciales:

- `GET /health`
- `GET /profile`
- `GET /customers?q=...`
- `GET /loans`
- `GET /payments`
- `POST /customers`
- `POST /loans`
- `POST /payments`

## Seguridad

El frontend no debe contener claves secretas. La clave incluida en `client.js` es una clave publicable; la protección real está en RLS y en las comprobaciones de autenticación/autorización del backend.

## Estado

El esquema y la API ya están desplegados en Supabase. La siguiente integración de UI debe reemplazar las fuentes demo/locales de `index.html` por las funciones del cliente Supabase y la autenticación de Supabase Auth.
