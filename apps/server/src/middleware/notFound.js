/**
 * Middleware 404 (Not Found).
 *
 * ¿Cuándo se ejecuta?
 * - Cuando una request llega al servidor y NO coincide con ninguna ruta registrada.
 *
 * Requisito importante:
 * - Debe colocarse DESPUÉS de montar todas las rutas en app.js.
 *   Si lo pones antes, bloquearía TODAS las rutas devolviendo siempre 404.
 *
 * ¿Qué hace?
 * - Responde con status 404 y un JSON consistente.
 * - No llama a next() porque ya hemos decidido la respuesta final.
 */
module.exports = function notFound(_req, res) {
  res.status(404).json({
    error: "Not Found",
  });
};
