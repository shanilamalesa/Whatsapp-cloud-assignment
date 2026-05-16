const express = require("express");
const router = express.Router();
const db = require("../db/init");

// GET /api/leads - list with pagination, search, filter
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

// GET /api/leads/stats/counts - must be ABOVE /:id
router.get("/stats/counts", (req, res) => {
  const stats = db.prepare(
    "SELECT status, COUNT(*) as count FROM leads GROUP BY status"
  ).all();
  res.json({ data: stats });
});

// GET /api/leads/export - download CSV
router.get("/export", (req, res) =>{
  const q = req.query.q || "";
  const status = req.query.status || "";

  let query = "SELECT * FROM leads WHERE 1=1";
  const params = [];

  if (q){
    query += "AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    query += "AND status = ?";
    params.push(status);
  }

  const leads = db.prepare(query).all(...params);

  const csv = [
    "Name, Phone, Email, Inquiry, Status, Created",
    ...leads.map((l) => `${l.name},${l.wa_phone},${l.email},${l.inquiry_type},${l.status},${l.created_at}`)
  ].join("\n");
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename= leads.csv");
  res.send(csv);
});

// GET /api/leads/:id - single lead
router.get("/:id", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  res.json({ data: lead });
});

// PATCH /api/leads/:id - update status or notes
router.patch("/:id", (req, res) => {
  const { status, notes } = req.body;
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  db.prepare("UPDATE leads SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status ?? lead.status, notes ?? lead.notes, req.params.id);

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json({ data: updated });
});



module.exports = router;