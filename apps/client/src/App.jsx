import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [connected, setConnected] = useState(false);
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  const socket = useMemo(() => {
    return io(import.meta.env.VITE_SERVER_URL, {
      autoConnect: false,
    });
  }, []);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room:joined", (data) => {
      setJoinedRoomId(data.roomId);
      setError(null);
    });

    socket.on("room:left", () => {
      setJoinedRoomId(null);
      setPlayers([]);
      setError(null);
    });

    socket.on("room:players", (data) => {
      setPlayers(data.players ?? []);
    });

    socket.on("error", (e) => {
      setError(e?.details || e?.error || "Unknown error");
    });

    // Cleanup
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket]);

  function connectIfNeeded() {
    if (!socket.connected) socket.connect();
  }

  function joinRoom() {
    setError(null);
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

  function leaveRoom() {
    setError(null);
    socket.emit("room:leave");
  }

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
        <input
          placeholder="roomId (UUID)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: 10, flex: "1 1 280px" }}
          disabled={!!joinedRoomId}
        />
        <input
          placeholder="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: 10, flex: "1 1 200px" }}
          disabled={!!joinedRoomId}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button
          onClick={joinRoom}
          disabled={!!joinedRoomId}
          style={{ padding: "10px 14px" }}
        >
          Join
        </button>
        <button
          onClick={leaveRoom}
          disabled={!joinedRoomId}
          style={{ padding: "10px 14px" }}
        >
          Leave
        </button>
      </div>

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

      <div style={{ background: "#f6f6f6", padding: 16, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>
          Players {joinedRoomId ? `(room ${joinedRoomId})` : ""}
        </h2>
        {players.length === 0 ? (
          <p>No players</p>
        ) : (
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
