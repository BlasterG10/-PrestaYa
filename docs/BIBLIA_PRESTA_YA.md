# BIBLIA DE TRABAJO — PRESTA YA

**Estado:** documento rector del proyecto  
**Regla principal:** antes de trabajar, modificar, diseñar, investigar o tomar decisiones técnicas sobre Presta Ya, se debe leer este archivo completo y usarlo como referencia obligatoria.

---

## 1. Propósito

Presta Ya es un sistema de gestión de préstamos. El proyecto debe evolucionar de forma ordenada, segura, verificable y preparada para producción.

El sistema contempla dos experiencias principales:

- **Cliente:** consulta y gestiona la información que le corresponde.
- **Administración/Supervisión:** gestiona clientes, préstamos, pagos, aprobaciones y funciones administrativas según permisos.

La aplicación debe quedar preparada para conectar una base de datos y backend reales sin tener que rehacer la interfaz.

---

## 2. REGLA CERO — LEER ANTES DE TRABAJAR

Antes de cualquier trabajo sobre Presta Ya:

1. Leer `docs/BIBLIA_PRESTA_YA.md`.
2. Revisar el estado actual del repositorio.
3. Revisar las decisiones y requisitos existentes antes de sustituirlos.
4. No inventar requisitos que el usuario no haya solicitado.
5. No borrar ni reemplazar funcionalidades existentes sin comprobar su propósito.
6. Si una nueva instrucción contradice esta Biblia, identificar el conflicto y priorizar la instrucción explícita y más reciente del propietario del proyecto, actualizando esta Biblia cuando corresponda.
7. Toda decisión importante debe quedar documentada para evitar perder contexto entre sesiones.

**Compromiso operativo:** esta Biblia es el punto de partida obligatorio de cada nueva sesión de trabajo del proyecto. No se debe asumir que el contexto de una conversación anterior sigue disponible si no está documentado en el repositorio.

---

## 3. PRINCIPIOS DE DESARROLLO

### 3.1 No improvisar

No cambiar arquitectura, nombres de campos, roles, reglas financieras o flujos importantes por conveniencia. Primero revisar lo existente y después proponer o implementar el cambio.

### 3.2 No inventar

Si un dato, regla o comportamiento no está confirmado, marcarlo como **pendiente**, **propuesta** o **por confirmar**.

### 3.3 Seguridad primero

La interfaz nunca debe ser la única barrera de seguridad. Los permisos deben comprobarse también en backend/base de datos.

### 3.4 Separación de responsabilidades

Mantener separadas:

- interfaz/presentación;
- lógica de negocio;
- acceso a datos/API;
- autenticación/autorización;
- configuración y secretos.

### 3.5 Portabilidad

Evitar acoplar toda la lógica de negocio a un proveedor. Las migraciones, servicios y contratos deben permitir cambiar o ampliar la infraestructura posteriormente.

### 3.6 Cambios pequeños y verificables

Preferir cambios incrementales. Después de cada cambio relevante, comprobar que no se rompió una función existente.

---

## 4. ARQUITECTURA BASE

La arquitectura de referencia es:

**Cliente/Administrador → Frontend → Servicios/API → Backend → PostgreSQL**

Primera opción de infraestructura investigada:

- **Supabase:** PostgreSQL + Auth + API + Edge Functions + Storage.
- **Frontend:** mantenerlo independiente para permitir despliegues gratuitos y migración futura.

El uso gratuito siempre debe tratarse como sujeto a límites, cuotas y cambios del proveedor; no prometer uso ilimitado.

---

## 5. MODELO DE DATOS BASE

Entidades principales previstas:

- `profiles`
- `customers`
- `loans`
- `installments`
- `payments`
- `audit_logs`

Relación conceptual:

**Usuario → Perfil → Cliente → Préstamos → Cuotas → Pagos**

Los números de cliente y de préstamo son identificadores de negocio y deben conservarse claramente diferenciados de los UUID internos de la base de datos.

---

## 6. ROLES Y PERMISOS

Modelo inicial:

- `customer` — acceso a su propia información.
- `supervisor` — funciones de supervisión y aprobación según las reglas del proyecto.
- `admin` — funciones administrativas completas según las reglas definidas.

Nunca asumir que un rol tiene permisos nuevos solamente porque una pantalla los muestra. Los permisos deben reflejarse en las políticas de backend/base de datos.

---

## 7. NÚMEROS Y DATOS FINANCIEROS

Los montos deben manejarse con precisión decimal apropiada para dinero. No usar cálculos monetarios críticos basados exclusivamente en errores de punto flotante del navegador.

Toda operación financiera importante debe validar:

- identidad del usuario;
- permisos;
- préstamo válido;
- monto válido;
- estado permitido;
- fecha válida;
- relación entre cliente, préstamo, cuota y pago.

Los pagos y modificaciones financieras importantes deben poder auditarse.

---

## 8. SEGURIDAD

Antes de producción:

- Activar y revisar RLS en las tablas expuestas.
- Crear políticas específicas por operación y rol.
- No colocar claves secretas en el frontend.
- Mantener secretos en variables de entorno o infraestructura segura.
- Usar backend/Edge Functions para operaciones que necesiten secretos o validación sensible.
- Registrar acciones administrativas importantes.
- Probar explícitamente accesos permitidos y denegados.

**Regla:** ocultar un botón no equivale a proteger una operación.

---

## 9. FRONTEND

La interfaz debe ser:

- responsive;
- clara para clientes y personal administrativo;
- consistente entre pantallas;
- preparada para datos reales;
- desacoplada de la implementación concreta de la base de datos.

Las pantallas deben consumir servicios definidos, por ejemplo:

- `getCustomerDashboard()`
- `getCustomer()`
- `listLoans()`
- `getLoan()`
- `listInstallments()`
- `listPayments()`
- `createLoanApplication()`
- `registerPayment()`
- `approveLoan()`

Los nombres son contratos de referencia y pueden ajustarse al código real; no deben multiplicarse consultas directas a la base de datos dentro de cada componente sin una razón clara.

---

## 10. ADMINISTRACIÓN

El panel administrativo debe permitir, según el rol:

- localizar clientes;
- consultar número de cliente;
- consultar número de préstamo;
- revisar préstamos;
- revisar cuotas;
- registrar/revisar pagos;
- aprobar o rechazar solicitudes cuando corresponda;
- consultar información de auditoría;
- visualizar indicadores derivados de datos confiables.

No otorgar acceso administrativo a información sensible por defecto. Cada campo debe tener una razón funcional y un permiso adecuado.

---

## 11. CLIENTE

El portal del cliente debe priorizar:

- identificación/autenticación;
- información propia;
- préstamos propios;
- cuotas propias;
- pagos propios;
- estados y saldos comprensibles;
- documentos propios cuando se incorpore esa función.

Un cliente no debe poder consultar datos de otro cliente cambiando manualmente un identificador en la URL, petición o formulario.

---

## 12. REGLAS DE TRABAJO CON EL CÓDIGO EXISTENTE

Antes de modificar código:

1. Inspeccionar el archivo y su contexto.
2. Entender qué funcionalidad ya existe.
3. Conservar lo que funciona salvo que exista una razón documentada para cambiarlo.
4. Hacer el cambio mínimo necesario.
5. Revisar referencias, dependencias y nombres relacionados.
6. Probar el flujo afectado.
7. Documentar una decisión nueva si cambia arquitectura o comportamiento.

Nunca reemplazar un archivo completo solo para hacer un cambio pequeño si eso puede eliminar trabajo existente.

---

## 13. INVESTIGACIÓN

Cuando una decisión dependa de información que pueda cambiar —precios, límites gratuitos, servicios, APIs, políticas, tecnologías o disponibilidad— investigar fuentes actuales.

Separar siempre:

- **Confirmado:** respaldado por documentación/fuente.
- **Interpretación:** conclusión razonable basada en fuentes.
- **Propuesta:** decisión sugerida para el proyecto.
- **Desconocido:** falta información y no se debe inventar.

Cuando una fuente oficial exista, priorizarla.

---

## 14. COSTO

El objetivo es construir inicialmente con servicios gratuitos o con niveles gratuitos, pero nunca asumir que un servicio gratuito es ilimitado.

Toda integración debe documentar:

- proveedor;
- nivel gratuito utilizado;
- límites relevantes;
- qué ocurre al alcanzar límites;
- posibilidad de migración.

No introducir un servicio de pago como requisito sin aprobación explícita del propietario del proyecto.

---

## 15. BASE DE DATOS Y MIGRACIONES

Los cambios de esquema deben ser reproducibles mediante migraciones SQL versionadas.

No depender únicamente de cambios manuales realizados desde una interfaz web.

Cuando una tabla o campo se cambie:

- documentar el motivo;
- actualizar migraciones;
- actualizar tipos/contratos afectados;
- revisar políticas de seguridad;
- revisar frontend y backend que lo consumen.

---

## 16. AUDITORÍA Y TRAZABILIDAD

Para acciones administrativas sensibles conservar como mínimo:

- quién realizó la acción;
- qué entidad cambió;
- qué acción realizó;
- cuándo ocurrió;
- datos anterior/nuevo cuando sea apropiado y seguro.

La auditoría debe servir para reconstruir cambios importantes sin almacenar secretos innecesarios.

---

## 17. GESTIÓN DEL CONTEXTO DEL PROYECTO

La memoria de ChatGPT ayuda, pero no debe ser la única fuente de verdad.

La fuente persistente principal debe ser el repositorio y sus documentos.

Documentos rectores:

- `docs/BIBLIA_PRESTA_YA.md` — reglas de trabajo y arquitectura.
- `Presta_Ya_Master_Project_Spec.docx` — especificación funcional/arquitectónica.
- `Presta_Ya_schema_base.sql` — esquema inicial de datos.

Si estos documentos quedan desactualizados, deben actualizarse como parte del trabajo.

---

## 18. DEFINITION OF DONE

Una tarea de Presta Ya no se considera terminada simplemente porque el código fue escrito.

Antes de marcarla como terminada:

- la funcionalidad solicitada existe;
- el flujo principal funciona;
- no se eliminó accidentalmente funcionalidad existente;
- permisos y seguridad fueron considerados;
- los datos están modelados correctamente;
- los errores previsibles están controlados;
- se actualizaron documentos cuando la arquitectura cambió;
- se dejó claro qué está implementado y qué queda pendiente;
- si aplica, se verificó el cambio con pruebas o revisión del código.

---

## 19. PRIORIDAD DE DECISIONES

En caso de dudas, usar este orden:

1. Instrucción explícita y más reciente del propietario del proyecto.
2. Requisitos confirmados del proyecto.
3. Esta Biblia.
4. Especificación técnica y documentos existentes.
5. Buenas prácticas técnicas verificables.
6. Propuestas nuevas, claramente identificadas como propuestas.

Nunca convertir una suposición en un requisito confirmado.

---

## 20. REGISTRO DE CAMBIOS DE ESTA BIBLIA

### v1.0 — 2026-09-10
- Creación del documento rector.
- Establecida la regla de lectura obligatoria antes de trabajar.
- Definidos principios de desarrollo, arquitectura, seguridad, roles, datos financieros, frontend, administración, cliente, investigación, costos, migraciones, auditoría y Definition of Done.
- Establecida la política de conservar el contexto del proyecto dentro del repositorio además de la memoria.

---

# DECLARACIÓN OPERATIVA

**Antes de realizar trabajo sobre Presta Ya, leer esta Biblia.**

**No asumir. No inventar. No borrar trabajo existente sin revisión. No sacrificar seguridad por velocidad. Documentar las decisiones importantes. Mantener el proyecto reproducible y preparado para conectar cliente, administración, backend y base de datos.**
