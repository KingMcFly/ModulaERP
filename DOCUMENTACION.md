# ModulaERP — Documentación completa del sistema

> **Versión:** 1.0.0 · **Stack:** Node.js 24 + Express / React 19 + Vite / MariaDB

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Roles y permisos](#3-roles-y-permisos)
4. [Autenticación](#4-autenticación)
5. [Módulo: Inventario (Activos)](#5-módulo-inventario-activos)
6. [Módulo: Inventario (Insumos)](#6-módulo-inventario-insumos)
7. [Módulo: Préstamos](#7-módulo-préstamos)
8. [Módulo: Mantenimiento](#8-módulo-mantenimiento)
9. [Módulo: Gestión de Personal](#9-módulo-gestión-de-personal)
10. [Módulo: Monitoreo](#10-módulo-monitoreo)
11. [Módulo: Reportes](#11-módulo-reportes)
12. [Módulo: Configuración (Mantenedor)](#12-módulo-configuración-mantenedor)
13. [Centro de notificaciones](#13-centro-de-notificaciones)
14. [Exportar a Excel](#14-exportar-a-excel)
15. [Códigos QR](#15-códigos-qr)
16. [Panel de Administración](#16-panel-de-administración)
17. [API REST — referencia completa](#17-api-rest--referencia-completa)
18. [Cómo levantar el sistema](#18-cómo-levantar-el-sistema)

---

## 1. Visión general

ModulaERP es un sistema ERP multi-tenant SaaS diseñado para la gestión de activos físicos, personal y operaciones en empresas medianas. Cada empresa (tenant) tiene su propio espacio de datos aislado y puede habilitar o deshabilitar módulos según su suscripción.

**Aplicaciones incluidas:**

| App | Puerto | Descripción |
|-----|--------|-------------|
| `app` | 5173 | Cliente ERP — usado por empleados de cada empresa |
| `admin` | 5174 | Panel administrativo — usado por el equipo de ModulaERP |
| `backend` | 4000 | API REST — Node.js + Express |

---

## 2. Arquitectura

```
ModulaERP/
├── app/          → React 19 + Vite (cliente por empresa)
├── admin/        → React 19 + Vite (panel superadmin)
├── backend/      → Express ESM + MySQL2
└── database/     → schema.sql con 18 tablas
```

**Base de datos:** MariaDB / MySQL con las siguientes tablas principales:

| Tabla | Propósito |
|-------|-----------|
| `tenants` | Empresas registradas en la plataforma |
| `modules` | Módulos disponibles del sistema |
| `tenant_modules` | Qué módulos tiene habilitados cada empresa |
| `users` | Usuarios (tanto del panel admin como de cada tenant) |
| `assets` | Activos físicos (equipos, maquinaria, etc.) |
| `locations` | Ubicaciones físicas dentro de la empresa |
| `supplies` | Insumos / materiales con control de stock |
| `supply_movements` | Historial de entradas, salidas y ajustes de insumos |
| `loans` | Préstamos de activos a personas |
| `personnel` | Empleados de la empresa |
| `technicians` | Técnicos (subconjunto del personal) |
| `maintenance_records` | Órdenes de mantenimiento de activos |
| `maintenance_checklist` | Ítems de checklist por orden de mantenimiento |
| `maintenance_photos` | Fotos adjuntas a órdenes de mantenimiento |
| `monitoring_tokens` | Tokens para autenticación de agentes de monitoreo |
| `monitoring_agents` | Agentes registrados (equipos siendo monitoreados) |
| `monitoring_heartbeats` | Historial de métricas por agente |
| `activity_logs` | Registro de actividad del sistema |
| `asset_types` | Catálogo de tipos de activo por tenant |
| `departments` | Catálogo de departamentos por tenant |
| `shifts` | Catálogo de turnos por tenant |
| `supply_categories` | Catálogo de categorías de insumos por tenant |

**Módulos obligatorios:** `inventory` y `personnel` no pueden deshabilitarse en ningún tenant.

---

## 3. Roles y permisos

El sistema tiene una jerarquía de 5 roles para usuarios del cliente ERP, y 2 roles adicionales para el panel admin:

### Roles del cliente ERP

| Rol | Descripción | Puede escribir en catálogos |
|-----|-------------|----------------------------|
| `super_admin` | Acceso total (reservado internamente) | Sí |
| `admin` | Administrador del tenant | Sí |
| `manager` | Gerente con permisos de escritura amplia | Sí |
| `operator` | Operador estándar | No |
| `viewer` | Solo lectura | No |

### Roles del panel Admin

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Único rol con acceso al panel de administración |
| `admin` | Administrador de la plataforma (sin acceso al panel cliente) |

---

## 4. Autenticación

### Inicio de sesión

El sistema usa **JWT (JSON Web Token)** con expiración configurable (por defecto 8 horas).

**Flujo:**
1. El usuario ingresa email y contraseña en la pantalla de login.
2. El backend verifica contra la base de datos con bcrypt.
3. Si es correcto, devuelve un token JWT que se almacena en `localStorage`.
4. Cada petición posterior envía el token en el header `Authorization: Bearer <token>`.

**Protecciones implementadas:**
- **Rate limiting:** máximo 10 intentos de login cada 15 minutos por email/IP. Tras exceder el límite, bloquea durante 15 minutos.
- **Timing attack prevention:** siempre se compara el hash aunque el usuario no exista (evita enumerar cuentas válidas).
- **Sanitización:** el email y contraseña tienen límite de longitud (254 y 128 caracteres respectivamente).
- **Tenant suspendido:** si la empresa está suspendida, el login retorna error 403 aunque las credenciales sean correctas.

### Cambio de contraseña

Cualquier usuario autenticado puede cambiar su propia contraseña desde la sesión activa (`POST /api/auth/change-password`).

### Sesión

- El token se guarda en `localStorage` bajo la clave `token`.
- Al cargar la app, se valida automáticamente con `GET /api/auth/me`.
- Si el token es inválido o expira, se redirige al login.

---

## 5. Módulo: Inventario (Activos)

Gestiona todos los activos físicos de la empresa: equipos, maquinaria, mobiliario, vehículos, etc.

### Qué puedes hacer

**Registrar un activo** — Abre el formulario con:
- **Tipo de activo** — selecciona del catálogo (configurable en Configuración) o escribe libremente si el catálogo está vacío.
- **N° de serie** — identificador único del fabricante.
- **Marca y modelo** — fabricante y versión.
- **Valor ($)** — valor monetario del activo.
- **Fecha de compra** — fecha de adquisición.
- **Ubicación** — selecciona del catálogo de ubicaciones.
- **Código de barras** — código EAN u otro.
- **Notas** — observaciones adicionales.
- **Estado** (solo en edición): Disponible / Prestado / En mantenimiento / Retirado.

**Estados de un activo:**

| Estado | Descripción |
|--------|-------------|
| `available` (Disponible) | El activo está en almacén, listo para usarse |
| `loaned` (Prestado) | El activo está en poder de alguien mediante un préstamo |
| `maintenance` (En mantenimiento) | El activo tiene una orden de mantenimiento activa |
| `retired` (Retirado) | El activo fue dado de baja definitivamente |

> El sistema cambia el estado automáticamente cuando se registra un préstamo o una orden de mantenimiento (via triggers SQL).

**Buscar y filtrar** — Barra de búsqueda por serie, marca o modelo. Filtro por estado.

**Editar** — Modifica cualquier campo del activo incluyendo estado.

**Eliminar** — Baja lógica (soft delete): el activo queda con `is_active = 0`, no se borra físicamente.

**Código QR** — Genera un QR único por activo con el formato `ASSET:{id}:{serial}`. Se puede descargar como PNG o imprimir directamente desde el navegador.

**Exportar a Excel** — Descarga todos los activos visibles en pantalla como archivo `.xlsx` con columnas: Tipo, N° Serie, Marca, Modelo, Ubicación, Valor, Estado, Código de barras, Fecha compra.

**Estadísticas** — 4 tarjetas en tiempo real: Total de activos / Disponibles / Prestados / En mantenimiento.

---

## 6. Módulo: Inventario (Insumos)

Gestiona materiales consumibles con control de stock: papelería, piezas de repuesto, productos de limpieza, etc.

### Qué puedes hacer

**Registrar un insumo** — Formulario con:
- **Nombre** — descripción del insumo.
- **Categoría** — selecciona del catálogo de categorías de insumos.
- **Unidad** — pieza, kg, litro, caja, etc.
- **Stock actual** — cantidad disponible en el momento del registro.
- **Stock mínimo** — umbral de alerta. Cuando el stock cae por debajo, se activa la alerta.
- **Costo unitario** — precio por unidad para calcular el valor del inventario.
- **Ubicación** — dónde está físicamente el insumo.
- **Notas** — observaciones.

**Movimientos de stock** — Botón en cada insumo para registrar:
- **Entrada** — suma stock (recepción de mercancía, donación, etc.).
- **Salida** — resta stock (consumo, distribución, etc.).
- **Ajuste** — corrige el stock por conteo físico (positivo o negativo).

Cada movimiento requiere una cantidad y acepta notas opcionales. El historial queda registrado en la tabla `supply_movements`.

**Alerta de stock bajo** — Banner naranja en la parte superior del tab cuando uno o más insumos tienen `stock_actual ≤ stock_mínimo`. Lista los nombres de los insumos afectados. Las filas de esos insumos también se resaltan en rojo.

**Exportar a Excel** — Descarga todos los insumos con: Nombre, Categoría, Unidad, Stock actual, Stock mínimo, Costo unitario, Ubicación, Estado (Normal / Stock bajo).

---

## 7. Módulo: Préstamos

Controla quién tiene qué activo y desde cuándo, con fechas de devolución esperada.

### Qué puedes hacer

**Registrar un préstamo** — Selecciona:
- **Activo** — solo activos en estado "Disponible".
- **Persona** — empleado del personal registrado (o nombre libre).
- **Fecha de devolución esperada** — opcional pero recomendada.
- **Notas** — motivo del préstamo, condiciones, etc.
- **Firma digital** — campo para capturar firma del solicitante.

Al registrar, el activo cambia automáticamente a estado "Prestado".

**Registrar devolución** — Marca el préstamo como "Devuelto" y el activo vuelve a "Disponible".

**Filtrar por estado** — Ver todos los préstamos, solo activos, o solo devueltos.

**Préstamos vencidos** — Vista especial que lista todos los préstamos activos cuya fecha de devolución ya pasó, ordenados del más antiguo al más reciente.

> Los préstamos vencidos también aparecen en el **centro de notificaciones** (campana) y en la página de **Reportes**.

---

## 8. Módulo: Mantenimiento

Gestiona órdenes de trabajo de mantenimiento preventivo y correctivo sobre los activos.

### Qué puedes hacer

**Crear una orden de mantenimiento** — Formulario con:
- **Activo** — el equipo que requiere mantenimiento.
- **Técnico** — asigna un técnico del registro de personal (quienes tienen `is_technician = true`).
- **Tipo** — Preventivo / Correctivo / Emergencia.
- **Descripción** — qué se va a hacer.
- **Fecha programada** — cuándo se realizará el mantenimiento.
- **Costo estimado** — presupuesto del trabajo.
- **Próximo mantenimiento** — fecha para programar el siguiente.

**Estados de una orden:**

| Estado | Descripción |
|--------|-------------|
| `pending` (Pendiente) | Orden creada, aún no iniciada |
| `in_progress` (En progreso) | Mantenimiento en curso |
| `completed` (Completado) | Trabajo finalizado |
| `cancelled` (Cancelado) | Orden cancelada |

Al crear la orden, el activo pasa a estado "En mantenimiento". Al completar/cancelar, vuelve a "Disponible".

**Checklist** — Cada orden puede tener ítems de checklist que el técnico marca como completados durante el trabajo.

**Fotos** — Se pueden adjuntar fotografías de evidencia a las órdenes.

**Próximos mantenimientos** — Vista que muestra las órdenes programadas para los próximos días, ordenadas por fecha.

**Registro de técnicos** — Lista de técnicos disponibles para asignación (proviniendo del módulo de Personal).

---

## 9. Módulo: Gestión de Personal

Registro de todos los empleados de la empresa, con la posibilidad de marcarlos como técnicos para asignarlos a órdenes de mantenimiento.

### Qué puedes hacer

**Registrar un empleado** — Formulario en 3 secciones:

**Sección 1 — Datos personales:**
- Nombre completo
- Cédula / ID nacional
- Fecha de ingreso
- Teléfono
- Email

**Sección 2 — Datos laborales:**
- Cargo / Puesto
- Departamento (selecciona del catálogo o escribe libre)
- Turno (selecciona del catálogo o escribe libre)
- Estado activo/inactivo (solo en edición)

**Sección 3 — Rol en el sistema:**
- **Toggle "¿Es técnico?"** — Cuando se activa, el empleado queda registrado también en la tabla de técnicos y puede ser asignado a órdenes de mantenimiento.
- **Especialidad** — Campo que aparece solo cuando el toggle está activo. Ejemplo: "Electricidad", "HVAC", "Mecánica industrial".

**Tarjetas de empleado** — Vista tipo tarjeta por cada empleado con:
- Avatar con iniciales
- Nombre y cargo
- Badge ámbar "Técnico" (con especialidad) si aplica
- Fecha de ingreso, departamento
- Botones de editar y desactivar

**Filtros** — Buscar por nombre, cédula o email. Filtrar por departamento.

**Estadísticas** — 4 tarjetas: Empleados totales / Técnicos registrados / Departamentos activos / Turnos activos.

**Exportar a Excel** — Descarga todos los empleados visibles con: Nombre, Cédula/ID, Departamento, Cargo, Turno, Teléfono, Email, Fecha ingreso, Es técnico, Especialidad.

**Baja de empleado** — Soft delete: el empleado queda inactivo (no se borra). Si era técnico, también se desactiva su registro en la tabla de técnicos.

---

## 10. Módulo: Monitoreo

Monitoreo en tiempo real de equipos y servidores mediante un agente ligero que envía métricas al sistema.

### Qué puedes hacer

**Ver agentes registrados** — Lista de todos los equipos que están enviando heartbeats con su estado actual:

| Estado | Descripción |
|--------|-------------|
| `online` | El agente respondió en los últimos 5 minutos y métricas normales |
| `warning` | CPU o RAM por encima del 90% |
| `offline` | Sin heartbeat en los últimos 5 minutos |

**Métricas por agente** — Para cada equipo se muestran en tiempo real:
- CPU % de uso
- RAM % de uso
- Disco % de uso
- Tiempo de actividad (uptime)
- Hostname e IP
- Sistema operativo y procesador
- Vinculación al activo correspondiente (por número de serie)

**Historial** — Gráfica de las últimas 288 lecturas de CPU, RAM y disco (equivalente a 24 horas si el heartbeat es cada 5 minutos).

**Estadísticas globales** — Conteo de agentes online / en alerta / offline.

**Tokens de autenticación** — Para que un agente pueda enviar datos, necesita un token. Desde esta pantalla puedes:
- Generar nuevos tokens con una etiqueta descriptiva.
- Ver los tokens existentes.
- Revocar (desactivar) tokens.

### Cómo funciona el agente

El agente instalado en cada equipo envía un `POST /api/monitoring/heartbeat` con el header `X-Agent-Token: <token>` y el siguiente payload:

```json
{
  "agent_key": "identificador-unico-del-equipo",
  "hostname": "PC-CONTABILIDAD",
  "ip_address": "192.168.1.45",
  "os_info": "Windows 11 Pro",
  "processor": "Intel Core i7-12700",
  "cpu_usage": 34.5,
  "ram_usage": 67.2,
  "disk_usage": 55.0,
  "uptime_seconds": 86400,
  "serial_number": "SN123456"
}
```

Si `serial_number` coincide con un activo registrado, el agente queda vinculado a ese activo automáticamente.

---

## 11. Módulo: Reportes

Dashboard ejecutivo con métricas clave de todos los módulos del sistema en una sola pantalla.

### KPIs (tarjetas de indicadores)

| Indicador | Qué muestra |
|-----------|-------------|
| Activos totales | Cantidad + valor total del inventario |
| Empleados activos | Total de empleados + cantidad de técnicos |
| Préstamos activos | Cantidad + alerta si hay vencidos |
| Mantenimientos pendientes | Pendientes + en progreso + completados este mes |
| Insumos en inventario | Total + alerta si hay stock bajo |
| Valor de insumos | Suma de (stock × costo unitario) de todos los insumos |

### Gráficas

**Activos por estado** — Gráfica de pie con la distribución de activos según su estado (Disponible / Prestado / En mantenimiento / Retirado).

**Órdenes de mantenimiento** — Gráfica de barras con el volumen de órdenes creadas en los últimos 6 meses.

**Personal por departamento** — Gráfica de barras horizontales con los 5 departamentos con más empleados.

### Alertas contextuales

Si hay préstamos vencidos o insumos con stock bajo, aparecen banners de alerta en color rojo/ámbar con el conteo exacto.

### Exportar reporte

Botón "Exportar Excel" que genera un archivo `.xlsx` con todas las métricas organizadas por sección (Activos, Personal, Préstamos, Mantenimiento, Insumos).

---

## 12. Módulo: Configuración (Mantenedor)

Permite gestionar los datos maestros (catálogos) que se usan como opciones en los formularios del resto de módulos. Solo accesible para roles `admin`, `manager` y `super_admin`.

### Catálogos disponibles

| Catálogo | Usado en | Campos |
|----------|----------|--------|
| **Ubicaciones** | Activos, Insumos | Nombre, descripción, nivel de piso, color, criticidad (baja/media/alta) |
| **Tipos de activo** | Inventario → Activos | Nombre |
| **Departamentos** | Personal | Nombre |
| **Turnos** | Personal | Nombre |
| **Categorías de insumos** | Inventario → Insumos | Nombre |

### Cómo funciona

Cada catálogo tiene una vista de tabla donde puedes:
- **Agregar** un nuevo ítem con un clic (formulario inline o modal según el catálogo).
- **Editar** haciendo clic en el nombre del ítem.
- **Eliminar** (baja lógica — el ítem desaparece de los formularios pero el historial histórico queda intacto).

Las **Ubicaciones** tienen un formulario más completo con:
- Color personalizable (color picker)
- Nivel de piso (para empresas multi-planta)
- Criticidad — indica qué tan crítica es la zona (baja / media / alta)

---

## 13. Centro de notificaciones

Ícono de campana en la barra superior de la app. Se actualiza automáticamente cada 60 segundos sin necesidad de recargar la página.

### Qué monitorea

| Alerta | Condición |
|--------|-----------|
| Préstamos vencidos | Préstamos activos cuya fecha de devolución esperada ya pasó |
| Stock bajo | Insumos cuyo stock actual es menor o igual al stock mínimo |
| Mantenimientos vencidos | Órdenes en estado pendiente/en progreso cuya fecha programada ya pasó |

**Badge rojo** — muestra el conteo total de alertas activas sobre el ícono de la campana. Si supera 9 muestra "9+".

**Dropdown** — al hacer clic muestra el detalle por categoría. Si no hay alertas, muestra "Todo al día" con un checkmark verde.

---

## 14. Exportar a Excel

Disponible en tres módulos:

| Módulo | Columnas exportadas |
|--------|---------------------|
| **Activos** | Tipo, N° Serie, Marca, Modelo, Ubicación, Valor, Estado, Código de barras, Fecha compra |
| **Insumos** | Nombre, Categoría, Unidad, Stock actual, Stock mínimo, Costo unitario, Ubicación, Estado |
| **Personal** | Nombre, Cédula/ID, Departamento, Cargo, Turno, Teléfono, Email, Fecha ingreso, Es técnico, Especialidad |
| **Reportes** | Resumen ejecutivo completo de todos los módulos |

Los archivos se descargan con el nombre `{módulo}_{fecha}.xlsx` (ejemplo: `activos_2026-05-16.xlsx`).

---

## 15. Códigos QR

Disponible para cada activo registrado. Acceso mediante el ícono QR en la fila del activo.

### Contenido del QR

El código QR codifica la cadena: `ASSET:{id}:{serial_number}` (usa el código de barras si no hay serial).

### Opciones

- **Descargar PNG** — Guarda el QR como imagen de alta resolución.
- **Imprimir** — Abre la ventana de impresión del navegador con el QR, el nombre del activo y su código, listos para pegar en etiquetas físicas.

### Uso sugerido

1. Genera e imprime el QR al registrar un activo.
2. Pega la etiqueta en el activo físico.
3. Cualquier persona con la app puede escanear el QR para identificar el activo rápidamente.

---

## 16. Panel de Administración

Aplicación separada (puerto 5174) exclusiva para el equipo de ModulaERP. Solo accesible con rol `super_admin`.

### Dashboard

Resumen general de la plataforma: total de empresas activas, usuarios registrados, y módulos habilitados en el sistema.

### Gestión de Empresas (Tenants)

**Listar empresas** — Tabla con todas las empresas registradas (excluye el tenant admin interno). Muestra: nombre, slug, plan, estado, número de usuarios y módulos activos.

**Crear empresa** — Formulario con:
- Nombre y slug (identificador único en la URL).
- Email y teléfono de contacto.
- País.
- Plan de suscripción (starter / professional / enterprise).
- Color primario de la marca.
- Módulos iniciales a habilitar.

> Los módulos `inventory` y `personnel` se agregan automáticamente siempre, independientemente de la selección.

**Ver detalle de empresa** — Pantalla completa con:
- Datos generales de la empresa.
- Módulos habilitados con toggle para activar/desactivar.
  - Los módulos obligatorios (Inventario y Personal) muestran un candado y no pueden deshabilitarse.
- Lista de usuarios de la empresa con opción de activar/desactivar.
- Formulario para crear nuevos usuarios en esa empresa.

**Cambiar estado** — Los estados posibles de una empresa son:

| Estado | Descripción |
|--------|-------------|
| `trial` | Período de prueba |
| `active` | Suscripción activa |
| `suspended` | Acceso bloqueado (login retorna 403) |
| `cancelled` | Cancelado definitivamente |

### Gestión de Módulos

Vista de todos los módulos disponibles en la plataforma con sus metadatos (nombre, código, descripción, ícono, color, orden de presentación).

### Gestión de Usuarios del Panel

Administra los usuarios con acceso al panel admin (tenant 1). Funciones:
- Listar usuarios con rol, último acceso y estado.
- Crear nuevo usuario (roles disponibles: `admin` o `super_admin`).
- Editar nombre, email y rol.
- Cambiar contraseña.
- Activar / desactivar usuario (no puedes desactivarte a ti mismo).

### Configuración del sistema

Página con información del sistema (versión, entorno, base de datos, Node.js) y accesos a secciones futuras: Seguridad, Regional, Notificaciones, Apariencia.

---

## 17. API REST — referencia completa

**Base URL:** `http://localhost:4000/api`

**Autenticación:** Todas las rutas (excepto `/auth/login` y `/monitoring/heartbeat`) requieren el header:
```
Authorization: Bearer <jwt_token>
```

---

### Auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Inicia sesión. Devuelve token JWT y datos del usuario + módulos. |
| GET | `/auth/me` | Devuelve el usuario autenticado con tenant y módulos. |
| POST | `/auth/change-password` | Cambia la contraseña del usuario autenticado. |

---

### Activos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/assets/stats` | Conteo por estado (total/available/loaned/maintenance). |
| GET | `/assets` | Lista activos con filtros: `search`, `status`, `location_id`. |
| GET | `/assets/:id` | Detalle de un activo. |
| POST | `/assets` | Crea un activo. |
| PUT | `/assets/:id` | Actualiza un activo. |
| DELETE | `/assets/:id` | Da de baja un activo (soft delete). |

---

### Insumos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/supplies/low-stock` | Lista insumos con stock ≤ stock mínimo. |
| GET | `/supplies` | Lista todos los insumos activos. |
| POST | `/supplies` | Crea un insumo. |
| PUT | `/supplies/:id` | Actualiza un insumo. |
| POST | `/supplies/:id/movement` | Registra movimiento de stock (in/out/adjustment). |
| DELETE | `/supplies/:id` | Da de baja un insumo. |

---

### Préstamos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/loans/overdue` | Lista préstamos vencidos. |
| GET | `/loans` | Lista préstamos con filtro `status`. |
| GET | `/loans/:id` | Detalle de un préstamo. |
| POST | `/loans` | Registra un nuevo préstamo. |
| PATCH | `/loans/:id/return` | Registra la devolución. |

---

### Mantenimiento

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/maintenance/upcoming` | Órdenes próximas ordenadas por fecha. |
| GET | `/maintenance/technicians/all` | Lista técnicos disponibles. |
| POST | `/maintenance/technicians` | Crea técnico directamente (sin pasar por personal). |
| GET | `/maintenance` | Lista órdenes con filtros. |
| GET | `/maintenance/:id` | Detalle de una orden. |
| POST | `/maintenance` | Crea una orden de mantenimiento. |
| PUT | `/maintenance/:id` | Actualiza una orden. |
| PATCH | `/maintenance/:id/checklist/:itemId` | Marca ítem del checklist. |

---

### Personal

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/personnel/stats` | Estadísticas: total, técnicos, departamentos, turnos. |
| GET | `/personnel` | Lista empleados con filtros: `search`, `department`, `shift`, `is_active`. |
| GET | `/personnel/:id` | Detalle de un empleado. |
| POST | `/personnel` | Registra un empleado. Acepta `is_technician` y `specialty`. |
| PUT | `/personnel/:id` | Actualiza un empleado. |
| DELETE | `/personnel/:id` | Da de baja al empleado (y a su registro de técnico si aplica). |

---

### Monitoreo

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/monitoring/heartbeat` | Recibe datos de un agente. | Token de agente (`X-Agent-Token`) |
| GET | `/monitoring/agents` | Lista agentes y su estado actual. | JWT |
| GET | `/monitoring/agents/:id/history` | Historial de métricas de un agente. | JWT |
| GET | `/monitoring/stats` | Conteo online/warning/offline. | JWT |
| GET | `/monitoring/tokens` | Lista tokens de agentes. | JWT |
| POST | `/monitoring/tokens` | Genera un nuevo token. | JWT |
| DELETE | `/monitoring/tokens/:id` | Revoca un token. | JWT |

---

### Catálogos (Configuración)

Todos los endpoints de catálogos requieren rol `admin`, `manager` o `super_admin` para escritura.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/catalog/locations` | CRUD de ubicaciones. |
| GET/POST/PUT/DELETE | `/catalog/asset-types` | CRUD de tipos de activo. |
| GET/POST/PUT/DELETE | `/catalog/departments` | CRUD de departamentos. |
| GET/POST/PUT/DELETE | `/catalog/shifts` | CRUD de turnos. |
| GET/POST/PUT/DELETE | `/catalog/supply-categories` | CRUD de categorías de insumos. |

---

### Notificaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/notifications/summary` | Resumen de alertas activas (préstamos vencidos, stock bajo, mantenimientos vencidos). |

---

### Reportes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reports/overview` | KPIs completos + datos para gráficas (activos por estado, tendencia mantenimiento, personal por departamento). |

---

### Admin — Tenants

*Requiere rol `super_admin`.*

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/tenants` | Lista todas las empresas. |
| POST | `/admin/tenants` | Crea una empresa. |
| GET | `/admin/tenants/:id` | Detalle con módulos y usuarios. |
| PUT | `/admin/tenants/:id` | Actualiza datos generales. |
| PATCH | `/admin/tenants/:id/status` | Cambia el estado (trial/active/suspended/cancelled). |
| PATCH | `/admin/tenants/:id/modules` | Habilita o deshabilita un módulo. |
| POST | `/admin/tenants/:id/users` | Crea un usuario en la empresa. |
| PATCH | `/admin/tenants/:id/users/:userId/status` | Activa o desactiva un usuario. |

---

### Admin — Usuarios del panel

*Requiere rol `super_admin`.*

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/users` | Lista usuarios del panel admin (tenant 1). |
| POST | `/admin/users` | Crea un usuario admin. |
| PUT | `/admin/users/:id` | Actualiza nombre, email y rol. |
| PATCH | `/admin/users/:id/status` | Activa o desactiva. |
| PATCH | `/admin/users/:id/password` | Cambia contraseña. |

---

## 18. Cómo levantar el sistema

### Requisitos previos

- **XAMPP** corriendo con MySQL/MariaDB activo.
- **Node.js** v18+ (instalado via nvm recomendado).
- **nvm** — cargar en cada sesión con:
  ```bash
  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  ```

### 1. Base de datos

```bash
# Importar el schema
/Applications/XAMPP/xamppfiles/bin/mysql -u root modulaerp_db < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # configurar variables si es necesario
npm install
npm run dev            # inicia en http://localhost:4000
```

**Variables de entorno clave (`backend/.env`):**

```env
PORT=4000
DB_SOCKET=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock
DB_NAME=modulaerp_db
DB_USER=root
DB_PASS=
JWT_SECRET=modulaerp-dev-secret-2026
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

### 3. App cliente

```bash
cd app
npm install
npm run dev   # inicia en http://localhost:5173
```

### 4. Panel admin

```bash
cd admin
npm install
npm run dev   # inicia en http://localhost:5174
```

### Credenciales por defecto

| App | Email | Contraseña |
|-----|-------|------------|
| Panel Admin | admin@modulaerp.com | admin123 |
| App cliente | Configurable desde el panel admin | changeme123 (por defecto al crear usuario) |

---

*Documentación generada automáticamente — ModulaERP v1.0.0*
