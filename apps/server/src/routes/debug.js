const express = require("express");
const router = express.Router();

router.get("/debug/error", (_req, _res) => {
  throw new Error("Debug error (intentional)");
});

module.exports = router;
