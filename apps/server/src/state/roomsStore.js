// crypto es un módulo nativo de Node.
// Aquí lo usamos para generar UUIDs (ids únicos) con randomUUID().
const crypto = require("crypto");

// "rooms" es la memoria del servidor: un Map en RAM.
// - Clave: roomId (string UUID)
// - Valor: objeto room { id, name, players, createdAt }
// Importante: al reiniciar el servidor, esto se pierde (no es base de datos).
const rooms = new Map();

/**
 * Crea una sala y la guarda en memoria.
 * @param {string} name - Nombre de la sala (se limpia con trim)
 * @returns {object} room - La sala creada
 */
function createRoom(name) {
  // Generamos un id único para la sala.
  const id = crypto.randomUUID();

  // Creamos el objeto room.
  // players empieza vacío: se llena cuando los jugadores hacen join.
  const room = {
    id,
    name: name.trim(),
    players: [],
    createdAt: new Date().toISOString(),
  };

  // Guardamos la sala en el Map (en memoria).
  rooms.set(id, room);

  // Devolvemos la sala para que el router pueda responder 201 con el JSON.
  return room;
}

/**
 * Obtiene una sala por id.
 * @param {string} id
 * @returns {object|null} room o null si no existe
 */
function getRoom(id) {
  // Map.get devuelve undefined si no existe; lo normalizamos a null.
  return rooms.get(id) || null;
}

/**
 * Añade un jugador a una sala.
 * @param {string} roomId
 * @param {string} playerName
 * @returns {{room: object, player: object} | {error: string}}
 */
function addPlayer(roomId, playerName) {
  // Buscamos la sala.
  const room = getRoom(roomId);
  if (!room) return { error: "ROOM_NOT_FOUND" };

  // Limpiamos espacios al inicio/final para evitar nombres raros.
  const cleanName = playerName.trim();

  // Evitamos nombres repetidos en la misma sala.
  // Lo hacemos case-insensitive (JAIME == jaime).
  const nameTaken = room.players.some(
    (p) => p.name.toLowerCase() === cleanName.toLowerCase(),
  );
  if (nameTaken) return { error: "NAME_TAKEN" };

  // Creamos el jugador.
  const player = {
    id: crypto.randomUUID(),
    name: cleanName,
    joinedAt: new Date().toISOString(),
  };

  // Guardamos el jugador dentro de la sala.
  // Nota: modificamos el estado del servidor (persistencia en RAM).
  room.players.push(player);

  // Devolvemos room + player para que la capa HTTP o Socket responda.
  return { room, player };
}

/**
 * Devuelve jugadores de una sala.
 * @param {string} roomId
 * @returns {{room: object, players: object[]} | {error: string}}
 */
function listPlayers(roomId) {
  const room = getRoom(roomId);
  if (!room) return { error: "ROOM_NOT_FOUND" };

  // Devolvemos la lista actual (referencia al array).
  return { room, players: room.players };
}

/**
 * Lista todas las salas (resumen).
 * Útil para mostrar un "lobby" con contador de jugadores.
 * @returns {Array<{id: string, name: string, playersCount: number, createdAt: string}>}
 */
function listRooms() {
  // rooms.values() devuelve un iterador; lo convertimos a array con Array.from.
  // Devolvemos un objeto “resumen” (no todo el detalle de cada sala).
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    playersCount: r.players.length,
    createdAt: r.createdAt,
  }));
}

/**
 * Borra una sala.
 * @param {string} id
 * @returns {boolean} true si existía y se borró; false si no existía.
 */
function deleteRoom(id) {
  return rooms.delete(id);
}

/**
 * Elimina un jugador de una sala por playerId.
 * Se usa en Socket.io cuando alguien se va (room:leave) o se desconecta.
 * @param {string} roomId
 * @param {string} playerId
 * @returns {boolean} true si cambió algo; false si no había cambios.
 */
function removePlayer(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return false;

  const before = room.players.length;

  // Filtramos para quedarnos con todos menos el que se va.
  // OJO: aquí reemplazamos el array (no hacemos splice).
  room.players = room.players.filter((p) => p.id !== playerId);

  // Si la longitud ha cambiado, es que eliminamos a alguien.
  return room.players.length !== before;
}

// Exportamos funciones públicas.
// Otros módulos (routes/rooms.js y realtime/socket.js) importan desde aquí.
module.exports = {
  createRoom,
  getRoom,
  addPlayer,
  listPlayers,
  listRooms,
  deleteRoom,
  removePlayer,
};
