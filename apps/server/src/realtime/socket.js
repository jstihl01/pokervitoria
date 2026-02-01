// Server es la clase principal de Socket.io en el backend.
// Nos permite aceptar conexiones WebSocket (y fallback) y emitir eventos.
const { Server } = require("socket.io");

// Reutilizamos la misma lógica/estado que usa la API REST.
// Así evitamos duplicar reglas (por ejemplo, "nombre repetido").
const { addPlayer, listPlayers, removePlayer } = require("../state/roomsStore");

/**
 * Inicializa Socket.io sobre un servidor HTTP ya existente.
 * Importante: Socket.io NO crea el puerto por su cuenta aquí; se engancha al httpServer.
 *
 * @param {import("http").Server} httpServer - servidor HTTP creado en index.js (http.createServer(app))
 * @returns {import("socket.io").Server} io - instancia de Socket.io
 */
function setupSocket(httpServer) {
  // Creamos la instancia de Socket.io.
  // CORS: ahora mismo permitimos cualquier origen ("*") para desarrollo.
  // En producción se debe restringir al dominio del frontend.
  const io = new Server(httpServer, {
    cors: { origin: "*" }, // luego lo restringimos
  });

  /**
   * Evento global: se dispara cada vez que un cliente conecta.
   * "socket" representa a ESE cliente/conexión concreta.
   */
  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    /**
     * Evento: room:join
     * El cliente pide entrar en una sala con un nombre de jugador.
     * payload esperado: { roomId: string, playerName: string }
     */
    socket.on("room:join", (payload) => {
      // payload puede venir undefined, así que protegemos con ?? {}
      const { roomId, playerName } = payload ?? {};

      // Validaciones básicas para no romper el server ni aceptar basura.
      if (!roomId || typeof roomId !== "string") {
        return socket.emit("error", {
          error: "Bad Request",
          details: "roomId required",
        });
      }

      if (
        !playerName ||
        typeof playerName !== "string" ||
        playerName.trim().length < 2
      ) {
        return socket.emit("error", {
          error: "Bad Request",
          details: "playerName required (min 2 chars)",
        });
      }

      // Añadimos el jugador usando el store (misma lógica que REST).
      // Esto modifica el estado del servidor (en memoria).
      const result = addPlayer(roomId, playerName);

      // Traducimos errores del store a mensajes de error por socket.
      if (result.error === "ROOM_NOT_FOUND") {
        return socket.emit("error", { error: "Room not found" });
      }
      if (result.error === "NAME_TAKEN") {
        return socket.emit("error", { error: "Name taken" });
      }

      // Socket.io también tiene concepto de "rooms" (grupos de sockets).
      // Esto NO es tu room del juego como objeto; es un grupo de conexiones.
      // Al hacer join, este socket entra en el grupo llamado roomId.
      socket.join(roomId);

      // Guardamos datos en socket.data para recordar:
      // - en qué sala está este socket
      // - qué playerId le corresponde
      // Esto nos sirve para limpiar al hacer leave o disconnect.
      socket.data.roomId = roomId;
      socket.data.playerId = result.player.id;

      // Confirmación SOLO al socket que se acaba de unir.
      socket.emit("room:joined", { roomId, player: result.player });

      // Broadcast a TODOS los sockets que estén en esa sala.
      // Les mandamos la lista actual de jugadores.
      const playersResult = listPlayers(roomId);

      io.to(roomId).emit("room:players", {
        roomId,
        players: playersResult.players,
      });
    });

    /**
     * Evento: room:leave
     * El cliente pide salir de la sala sin desconectar el socket.
     * Esto es importante para UI real (botón "Leave").
     */
    socket.on("room:leave", () => {
      const { roomId, playerId } = socket.data ?? {};
      if (!roomId || !playerId) return;

      // 1) Sacar del estado del servidor (store)
      removePlayer(roomId, playerId);

      // 2) Sacar la conexión del grupo Socket.io
      socket.leave(roomId);

      // 3) Limpiar metadata: este socket ya no está en ninguna sala del juego
      delete socket.data.roomId;
      delete socket.data.playerId;

      // 4) Avisar a todos en la sala con la lista actualizada
      const playersResult = listPlayers(roomId);
      if (!playersResult.error) {
        io.to(roomId).emit("room:players", {
          roomId,
          players: playersResult.players,
        });
      }

      // Confirmación al que se ha ido.
      socket.emit("room:left", { roomId });
    });

    /**
     * Evento: disconnect
     * Se dispara cuando el cliente pierde conexión (cierra pestaña, cae internet, etc.).
     * Aquí hacemos limpieza por si se fue sin emitir room:leave.
     */
    socket.on("disconnect", () => {
      const { roomId, playerId } = socket.data ?? {};
      if (!roomId || !playerId) return;

      // Quitamos al jugador del store.
      removePlayer(roomId, playerId);

      // Emitimos a la sala la lista actualizada.
      const playersResult = listPlayers(roomId);
      if (!playersResult.error) {
        io.to(roomId).emit("room:players", {
          roomId,
          players: playersResult.players,
        });
      }

      console.log("socket disconnected:", socket.id);
    });
  });

  return io;
}

module.exports = { setupSocket };
