# BookMyVenue Recommendation Agent (Azure Function, Node.js)

POST /api/recommend   {"query": "hall for 150 with a projector tomorrow 2-5 pm"}
GET  /api/recommend?q=hall for 150 with a projector tomorrow 2-5 pm

Needs the database function from 06_recommend_venues.sql.
Setting: DATABASE_URL = postgresql://USER:PASSWORD@SERVER:5432/bookyvenue   (no "sslmode" in it)

Run the parser tests:  npm install   then   npm test
