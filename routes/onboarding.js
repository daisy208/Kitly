const express = require("express");
const router = express.Router();

router.get("/onboarding", (req, res) => {
  res.send(`
    <h1>Welcome to Kitly 🎉</h1>
    <p>Create your first bundle to start increasing AOV.</p>
    <a href="/admin">Go to Dashboard</a>
  `);
});

module.exports = router;
