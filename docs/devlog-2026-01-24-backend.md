# Devlog — 2026-01-24 — Backend: setup inicial (Express)

## Objetivo de la sesión

- Preparar el entorno para empezar el backend en `apps/server`.
- Levantar un servidor HTTP con Express.
- Añadir endpoints básicos: `GET /` y `GET /health`.
- Mejorar la base del backend: estructura por rutas, 404 en JSON, handler de errores.
- Preparar configuración por variables de entorno (`.env`).
- Usar `nodemon` para reinicio automático en desarrollo.

---

## Estructura del repo (actual)

- `apps/server` → backend Node/Express
- `apps/client` → frontend (todavía sin tocar hoy)
- `docs` → documentación

---

## 1) Node.js y npm (Windows)

### Problema

Al ejecutar `npm` en PowerShell salía un error de scripts `.ps1` bloqueados (Execution Policy).

### Solución aplicada

En PowerShell se habilitó la ejecución de scripts locales para el usuario:

- `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

Resultado:

- `node -v` → OK
- `npm -v` → OK (ejemplo: 11.6.2)

---

## 2) Inicialización del backend (apps/server)

### Comandos ejecutados

Dentro de `apps/server`:

- `npm init -y`
- `npm i express`

Se creó el servidor Express inicial y se verificó:

- `GET /health` → `{ "status": "ok" }`

---

## 3) Nodemon (reinicio automático)

Se instaló nodemon como dependencia de desarrollo:

- `npm i -D nodemon`

`package.json` (apps/server) incluye scripts:

- `npm start` → arranca con Node
- `npm run dev` → arranca con nodemon

Archivo añadido:

- `apps/server/nodemon.json` (para vigilar `src/` principalmente)

Nota: En Windows/VSCode a veces nodemon reinicia más de una vez por guardado; no es grave.

---

## 4) Estructura limpia del servidor

Se reorganizó el código para separar:

- app principal (`app.js`)
- rutas (`routes/`)
- middlewares (`middleware/`)
- punto de entrada (`index.js`)

### Árbol de archivos relevante

apps/server/

- src/
  - index.js
  - app.js
  - routes/
    - root.js
    - health.js
    - debug.js
  - middleware/
    - notFound.js
    - errorHandler.js
- .env
- nodemon.json
- package.json
- package-lock.json

---

## 5) Endpoints actuales

### GET /

Devuelve:

```json
{ "message": "API ok" }
```

### GET /health

Devuelve:

```json
{
  "status": "ok",
  "uptimeSeconds": 4,
  "timestamp": "2026-01-24T17:25:38.490Z"
}
```

Notas:

- `uptimeSeconds` = segundos desde que el proceso arrancó (no “lo que tardó en arrancar”).
- `timestamp` está en UTC porque termina en `Z`. En Madrid (invierno) se ve 1 hora menos (UTC+1).

---

## 6) 404 en JSON y manejo de errores

Se añadieron middlewares:

- `notFound` → devuelve 404 JSON si no existe la ruta.
- `errorHandler` → captura errores y devuelve JSON (500 o el status que toque).

Prueba:

- `GET /loquesea` → `{ "error": "Not Found" }`

---

## 7) Ruta de debug (solo desarrollo)

Se creó `GET /debug/error` para probar el handler de errores:

- lanza un error a propósito y debe devolver JSON:

```json
{ "error": "Debug error (intentional)" }
```

Para que NO exista en producción, en `app.js` se monta solo si:

- `process.env.NODE_ENV === "development"`

Actualmente `.env` está configurado como `NODE_ENV=production`, por lo que `/debug/error` debería dar 404.

---

## 8) Variables de entorno (.env) con dotenv

Se instaló:

- `npm i dotenv`

Se creó `apps/server/.env` con:

- `PORT=3001`
- `NODE_ENV=production`

En `src/index.js` se añadió:

- `require("dotenv").config();`

Esto permite:

- cambiar `PORT` sin tocar código
- controlar si el debug router existe o no

Importante:

- `.env` se añadió al `.gitignore` para NO subirse a GitHub.

---

## Cómo arrancar el backend

Desde `apps/server`:

- Desarrollo (autoreload):
  - `npm run dev`

- Normal:
  - `npm start`

URLs:

- `http://localhost:3001/`
- `http://localhost:3001/health`

---

## Próximos pasos (plan)

1. Añadir `express.json()` para aceptar bodies JSON.
2. Crear endpoint real en memoria: `POST /rooms` (crear sala) y `GET /rooms/:id`.
3. Validación mínima (400 si falta algo).
4. Cuando esto esté estable → migrar server a TypeScript.
