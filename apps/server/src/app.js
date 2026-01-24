const express = require("express");

const rootRouter = require("./routes/root");
const healthRouter = require("./routes/health");
const debugRouter = require("./routes/debug");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use("/", rootRouter);
app.use("/", healthRouter);

// Solo montar /debug/* en desarrollo
if (process.env.NODE_ENV === "development") {
  app.use("/", debugRouter);
}

// 404 (si ninguna ruta anterior coincide)
app.use(notFound);

// Errores
app.use(errorHandler);

module.exports = app;
