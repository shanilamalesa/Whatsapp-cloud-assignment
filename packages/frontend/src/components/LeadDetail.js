import React, {useState} from "react";
import { updateLead } from "../services/api";

export default function LeadDetail({ lead, onClose }) {
    const [status, setStatus] = useState(lead.status);
    const [notes, setNotes] = useState(lead.notes || "");

    function handleStatusChange(e) {
        setStatus(e.target.value);
        updateLead(lead.id, { status: e.target.value, notes });
    }

    function handleNoteBlur() {
        updateLead(lead.id, { status, notes });
    }

    return (
        <div className="detail-panel">
            <button className="close-btn" onClick={onClose}>✕</button>
            <h2>{lead.name}</h2>

            <p>Phone: {lead.wa_phone}</p>
            <p>Email: {lead.email}</p>
            <p>Inquiry: {lead.inquiry_type}</p>

            <select value={status} onChange={handleStatusChange}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="closed">Closed</option>
            </select>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNoteBlur}
            />
        </div>
    );
}