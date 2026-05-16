const BASE_URL = "http://localhost:3001";

export async function getLeads({ limit = 10, offset = 0, q = "", status = "" }) {
  const res = await fetch(`${BASE_URL}/api/leads?limit=${limit}&offset=${offset}&q=${q}&status=${status}`);
  return res.json();
}

export async function getLead(id) {
    const res = await fetch(`${BASE_URL}/api/leads/${id}`);
    return res.json();
  // fetch GET /api/leads/:id
  // return the json response
}

export async function updateLead(id, { status, notes }) {
    const res = await fetch(`${BASE_URL}/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
    });
    return res.json();
  
}

export function exportLeads({ q = "", status=""}){
    window.open(`${BASE_URL}/api/leads/export?q=${q}&status=${status}`);
}