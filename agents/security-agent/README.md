# BookMyVenue Security Agent (Azure Function, Node.js)

Fixed, explainable rules (see 07_security_agent.sql). No AI model.

POST  /api/security/scan             run the rules now; returns how many NEW flags were written
GET   /api/security/flags            list flags  (?status=open|reviewed|dismissed  &severity=high|medium|low  &limit=50)
PATCH /api/security/flags/{id}       body {"status":"reviewed"|"dismissed", "reviewedBy":"<admin user id, optional>"}
(timer) runs the scan automatically every 10 minutes

Needs the database objects from 07_security_agent.sql.
Settings: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
