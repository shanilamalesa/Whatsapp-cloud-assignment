What would break first if 100 conversations happened simultaneously? Why?

-->The server would crash because the in-memory sessions Map would grow too large with 100 simultaneous users. SQLite also handles one write at a time, so 100 concurrent writes would queue up and slow everything down, eventually timing out or crashing the server.

If a sales rep says "I need to see which leads have not replied in 3 days", what feature would you add and where?

-->i would add a new filter in the dashboard like a "inactive 3+ days button  and A new API endpoint like `GET /api/leads?inactive=true` that queries the messages table. The query would look at the messages table and find leads where the last inbound message created_at was more than 3 days ago.


How would you prevent one rep from accidentally overwriting another rep's status update?

-->I would check when the lead was last updated. If someone else updated it after you opened it, the system should show a warning saying 'This lead has been updated by someone else. Are you sure you want to overwrite it?