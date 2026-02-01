// Express nos permite crear routers (grupos de rutas) para organizar la API.
const express = require("express");

// Importamos funciones del "store" (memoria del servidor).
// Idea clave: este router NO guarda el estado; solo valida inputs y decide qué responder.
// El estado y la lógica de rooms/players viven en roomsStore.js.
const {
  createRoom,
  getRoom,
  addPlayer,
  listPlayers,
  listRooms,
  deleteRoom,
} = require("../state/roomsStore");

// Creamos un router.
// Un router es como una "mini app" de Express donde defines rutas.
// Luego se monta en app.js con app.use("/", roomsRouter)
const router = express.Router();

/**
 * GET /rooms
 * Devuelve una lista resumida de salas existentes.
 * (No devuelve todo el detalle; eso se consigue con GET /rooms/:id)
 */
router.get("/rooms", (_req, res) => {
  return res.status(200).json({ rooms: listRooms() });
});

/**
 * POST /rooms
 * Crea una sala nueva.
 * Body esperado: { "name": "Sala 1" }
 */
router.post("/rooms", (req, res) => {
  // req.body lo rellena app.use(express.json()) en app.js.
  // El "?? {}" evita errores si req.body fuese null/undefined.
  const { name } = req.body ?? {};

  // Validación mínima:
  // - name debe existir
  // - debe ser string
  // - debe tener al menos 2 caracteres tras trim()
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({
      error: "Bad Request",
      details: "Field 'name' is required (string, min 2 chars).",
    });
  }

  // Delegamos la creación real al store.
  // El store genera el id, crea el objeto room, lo guarda en memoria y lo devuelve.
  const room = createRoom(name);

  // 201 Created: código estándar cuando creas un recurso.
  return res.status(201).json(room);
});

/**
 * GET /rooms/:id
 * Devuelve el detalle de una sala concreta.
 * Ejemplo: GET /rooms/123
 */
router.get("/rooms/:id", (req, res) => {
  // Params vienen del path y se leen en req.params.
  const room = getRoom(req.params.id);

  // Si no existe, 404.
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  // Si existe, devolvemos el objeto completo.
  return res.status(200).json(room);
});

/**
 * POST /rooms/:id/join
 * Añade un jugador a la sala.
 * Body esperado: { "playerName": "Jaime" }
 *
 * Nota: esto crea jugadores en memoria (estado del server).
 * Más adelante, esto se usará desde Socket.io para tiempo real.
 */
router.post("/rooms/:id/join", (req, res) => {
  const { playerName } = req.body ?? {};

  // Validación mínima del input.
  // En APIs reales también validarías longitud máxima, caracteres permitidos, etc.
  if (
    !playerName ||
    typeof playerName !== "string" ||
    playerName.trim().length < 2
  ) {
    return res.status(400).json({
      error: "Bad Request",
      details: "Field 'playerName' is required (string, min 2 chars).",
    });
  }

  // Delegamos al store:
  // - comprueba que la sala existe
  // - comprueba si el nombre está repetido en esa sala
  // - crea el player y lo añade a room.players
  const result = addPlayer(req.params.id, playerName);

  // Traducimos errores "internos" del store a códigos HTTP correctos.
  if (result.error === "ROOM_NOT_FOUND") {
    return res.status(404).json({ error: "Room not found" });
  }
  if (result.error === "NAME_TAKEN") {
    return res.status(409).json({
      error: "Conflict",
      details: "Player name already taken in this room.",
    });
  }

  // 201: se ha creado un nuevo "recurso" player dentro de una room.
  return res.status(201).json({
    roomId: result.room.id,
    player: result.player,
  });
});

/**
 * GET /rooms/:id/players
 * Devuelve la lista de jugadores de una sala.
 */
router.get("/rooms/:id/players", (req, res) => {
  const result = listPlayers(req.params.id);

  if (result.error === "ROOM_NOT_FOUND") {
    return res.status(404).json({ error: "Room not found" });
  }

  return res.status(200).json({
    roomId: result.room.id,
    players: result.players,
  });
});

/**
 * DELETE /rooms/:id
 * Borra una sala.
 * Respuesta típica: 204 No Content cuando se borra correctamente.
 */
router.delete("/rooms/:id", (req, res) => {
  const ok = deleteRoom(req.params.id);

  if (!ok) {
    return res.status(404).json({ error: "Room not found" });
  }

  // 204 indica “borrado correcto” sin body.
  return res.status(204).send();
});

module.exports = router;
