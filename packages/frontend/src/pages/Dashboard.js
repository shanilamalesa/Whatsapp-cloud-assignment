import React, { useState, useEffect} from "react";
import { getLeads, exportLeads } from "../services/api";
import LeadsTable from "../components/LeadsTable";
import LeadDetail from "../components/LeadDetail";

export default function Dashboard() {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
   


useEffect(() => {
  function fetchLeads() {
    setLoading(true);
    setError(null);
    getLeads({ limit: 10, offset, q, status })
      .then((res) => {
        setLeads(res.data);
        setTotal(res.total);
      })
      .catch(() => setError("Failed to load leads"))
      .finally(() => setLoading(false));
  }

  fetchLeads(); // run immediately

  const timer = setInterval(fetchLeads, 30000); // then every 30 seconds

  return () => clearInterval(timer); // cleanup on unmount
}, [q, status, offset]);

return (
  <div className="dashboard">
    <div className="dashboard-header">
      <h1>CRM Dashboard</h1>
    </div>

    <div className="toolbar">
      <input
        type="text"
        placeholder="Search by name or email"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOffset(0); }}
      />
      <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="qualified">Qualified</option>
        <option value="closed">Closed</option>
      </select>
      <button className="btn-primary" onClick={() => exportLeads({ q, status })}>Export CSV</button>
    </div>

    {loading && <p className="state-msg">Loading...</p>}
    {error && <p className="state-msg error">{error}</p>}
    {!loading && !error && leads.length === 0 && (
      <p className="state-msg">No leads yet. Send a WhatsApp to your test number to get started.</p>
    )}

    <div className="table-wrapper">
      <LeadsTable leads={leads} onSelect={setSelectedLead} />
    </div>

    <div className="pagination">
      <button className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(offset - 10)}>Previous</button>
      <button className="btn-secondary" disabled={offset + 10 >= total} onClick={() => setOffset(offset + 10)}>Next</button>
    </div>

    {selectedLead && <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </div>
);
}