const express = require("express");
const router = express.Router();
const db = require("../db/init");

// GET /api/leads
router.get("/", (req, res) => {
  const leads = db.prepare("SELECT * FROM leads").all();
  res.json({ data: leads, total: leads.length });
});

// GET /api/stats - must be ABOVE /:id
router.get("/stats/counts", (req, res) => {
  const stats = db.prepare(
    "SELECT status, COUNT(*) as count FROM leads GROUP BY status"
  ).all();
  res.json({ data: stats });
});

// GET /api/leads/:id
router.get("/", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const q = req.query.q || "";
  const status = req.query.status || "";

  let query = "SELECT * FROM leads WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM leads WHERE 1=1";
  const params = [];

  if (q) {
    query += " AND (name LIKE ? OR email LIKE ?)";
    countQuery += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    query += " AND status = ?";
    countQuery += " AND status = ?";
    params.push(status);
  }

  query += " LIMIT ? OFFSET ?";

  const leads = db.prepare(query).all(...params, limit, offset);
  const total = db.prepare(countQuery).get(...params).total;

  res.json({ data: leads, total, limit, offset });
});

// PATCH /api/leads/:id
router.patch("/:id", (req, res) => {
  const { status, notes } = req.body;
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  db.prepare("UPDATE leads SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status || lead.status, notes || lead.notes, req.params.id);

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json({ data: updated });
});

module.exports = router;