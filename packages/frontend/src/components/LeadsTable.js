import React from "react";

export default function LeadsTable( {leads, onSelect}){
    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Inquiry</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                {leads.map((lead) =>{
                    return(
                        <tr key={lead.id} onClick={() => onSelect(lead)}>
                        <td>{lead.name}</td>
                        <td>{lead.wa_phone}</td>
                        <td>{lead.email}</td>
                        <td>{lead.inquiry_type}</td>
                        <td>{lead.status}</td>
                        <td>{lead.created_at}</td>
                    </tr>
                    )
                })}
            </tbody>
        </table>
    )
}