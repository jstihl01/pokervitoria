/**
 * Middleware de errores de Express.
 *
 * IMPORTANTE:
 * - Express reconoce que es un middleware de errores porque tiene 4 parámetros:
 *   (err, req, res, next)
 *
 * ¿Cuándo se ejecuta?
 * - Cuando en una ruta/middleware haces:
 *   - throw new Error("...")
 *   - next(err)
 *
 * ¿Para qué sirve?
 * - Loguear el error en el servidor (para depurar).
 * - Responder al cliente con un JSON de error (sin que el proceso crashee).
 */
module.exports = function errorHandler(err, _req, res, _next) {
  // Log del error en consola del servidor.
  // En producción, lo ideal es usar un logger (pino/winston) y añadir más contexto.
  console.error(err);

  // Código HTTP a devolver:
  // - Si el error trae statusCode (p.ej. 400, 401, 403...), lo usamos.
  // - Si no, asumimos error interno: 500.
  const status = err.statusCode || 500;

  // Respondemos SIEMPRE con JSON.
  // - Si el error tiene message, lo usamos.
  // - Si no, devolvemos un mensaje genérico.
  res.status(status).json({
    error: err.message || "Internal Server Error",
  });
};
