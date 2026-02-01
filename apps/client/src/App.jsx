// Hooks de React:
// - useState: estado (variables que cuando cambian, React vuelve a renderizar)
// - useEffect: efectos laterales (suscribirse a eventos, limpiar al desmontar)
// - useMemo: memoización (crear algo una vez y reutilizarlo)
import { useEffect, useMemo, useState } from "react";

// Cliente de Socket.io para conectar desde el navegador al servidor (backend)
import { io } from "socket.io-client";

export default function App() {
  // Estado controlado de los inputs (lo que escribe el usuario)
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");

  // Estado de conexión del socket (solo para mostrar "connected/disconnected")
  const [connected, setConnected] = useState(false);

  // Estado que indica si ya estamos dentro de una sala (para bloquear inputs)
  const [joinedRoomId, setJoinedRoomId] = useState(null);

  // Lista de jugadores (lo que renderizamos en pantalla)
  const [players, setPlayers] = useState([]);

  // Mensaje de error para mostrar en UI
  const [error, setError] = useState(null);

  /**
   * Creamos el socket SOLO una vez.
   * useMemo con [] garantiza que no se cree un socket nuevo en cada render.
   *
   * VITE_SERVER_URL viene de apps/client/.env
   * Ej: http://localhost:3001
   *
   * autoConnect: false:
   * - el socket no conecta automáticamente al cargar la página
   * - nosotros decidimos cuándo conectar (al hacer Join)
   */
  const socket = useMemo(() => {
    return io(import.meta.env.VITE_SERVER_URL, {
      autoConnect: false,
    });
  }, []);

  /**
   * Suscripción a eventos del socket.
   * Este useEffect se ejecuta al montar el componente (y cuando cambia socket).
   * - Registramos listeners (socket.on)
   * - Devolvemos una función cleanup para limpiar listeners al desmontar
   */
  useEffect(() => {
    // Evento propio de socket.io: conectado al servidor
    socket.on("connect", () => setConnected(true));

    // Evento propio de socket.io: desconectado
    socket.on("disconnect", () => setConnected(false));

    // Evento que emite tu servidor cuando el join ha sido correcto
    socket.on("room:joined", (data) => {
      setJoinedRoomId(data.roomId); // bloquea inputs y activa estado de "estoy dentro"
      setError(null); // limpiar errores anteriores
    });

    // Evento que emite tu servidor cuando se confirma el leave
    socket.on("room:left", () => {
      setJoinedRoomId(null); // ya no estamos en sala
      setPlayers([]); // limpiamos lista porque ya no aplica
      setError(null);
    });

    // Evento principal: lista actualizada de jugadores (broadcast del servidor)
    socket.on("room:players", (data) => {
      // Si data.players viene undefined, usamos [] como fallback
      setPlayers(data.players ?? []);
    });

    // Evento de error que emite el servidor si hay validación o problemas
    socket.on("error", (e) => {
      setError(e?.details || e?.error || "Unknown error");
    });

    // Cleanup:
    // - removeAllListeners: evita duplicar listeners si el componente se remonta
    // - disconnect: cierra la conexión al salir de la página
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  /**
   * Conecta el socket si aún no está conectado.
   * (En socket.io, socket.connected es boolean)
   */
  function connectIfNeeded() {
    if (!socket.connected) socket.connect();
  }

  /**
   * Handler del botón Join.
   * - valida inputs en el cliente (UX)
   * - conecta el socket si es necesario
   * - emite el evento room:join al servidor
   */
  function joinRoom() {
    setError(null);

    // Validación mínima antes de enviar.
    // (Aun así, el servidor vuelve a validar: seguridad real)
    if (!roomId.trim() || !playerName.trim()) {
      setError("RoomId y playerName son obligatorios");
      return;
    }

    connectIfNeeded();

    socket.emit("room:join", {
      roomId: roomId.trim(),
      playerName: playerName.trim(),
    });
  }

  /**
   * Handler del botón Leave.
   * Emite room:leave al servidor.
   * El servidor:
   * - quita al player del store
   * - saca el socket de la room
   * - emite room:players actualizado
   * - confirma con room:left
   */
  function leaveRoom() {
    setError(null);
    socket.emit("room:leave");
  }

  /**
   * Render (UI)
   * Cada vez que cambian states (players, joinedRoomId, error, etc),
   * React vuelve a ejecutar este return y actualiza el DOM.
   */
  return (
    <div
      style={{
        fontFamily: "system-ui",
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1>PokerVitoria — Lobby</h1>

      <p>
        Socket: <b>{connected ? "connected" : "disconnected"}</b>
      </p>

      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
      >
        {/* roomId input: se deshabilita si ya estás unido a una sala */}
        <input
          placeholder="roomId (UUID)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: 10, flex: "1 1 280px" }}
          disabled={!!joinedRoomId}
        />

        {/* playerName input: también se deshabilita si ya estás unido */}
        <input
          placeholder="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: 10, flex: "1 1 200px" }}
          disabled={!!joinedRoomId}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {/* Join solo activo si NO estás unido */}
        <button
          onClick={joinRoom}
          disabled={!!joinedRoomId}
          style={{ padding: "10px 14px" }}
        >
          Join
        </button>

        {/* Leave solo activo si SÍ estás unido */}
        <button
          onClick={leaveRoom}
          disabled={!joinedRoomId}
          style={{ padding: "10px 14px" }}
        >
          Leave
        </button>
      </div>

      {/* Panel de error (solo si hay error) */}
      {error && (
        <div
          style={{
            background: "#ffe6e6",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <b>Error:</b> {error}
        </div>
      )}

      {/* Panel de players */}
      <div style={{ background: "#f6f6f6", padding: 16, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>
          Players {joinedRoomId ? `(room ${joinedRoomId})` : ""}
        </h2>

        {/* Si no hay jugadores, mostramos texto */}
        {players.length === 0 ? (
          <p>No players</p>
        ) : (
          // Si hay jugadores, renderizamos lista
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.name}{" "}
                <span style={{ color: "#666" }}>({p.id.slice(0, 6)})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
