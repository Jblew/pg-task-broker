var express = require("express");
var app = express();
app.use(express.json());

app.post("/put", async function (req, res) {
  const id = uuid();
  const queue = req.query.queue;
  const timeoutMs = parseInt(req.query.timeout_ms);
  const msg = req.body;
  pg.query(
    "INSERT INTO tasks (id, queue, msg, timeoutMs) VALUES (?, ?, ?, ?)",
    id,
    queue,
    msg,
    timeoutMs
  );
  response.status(200).send(id);
});

app.get("/take", async function (req, res) {
  const queue = req.query.queue;
  const result = await pg.query(
    "UPDATE tasks SET state=in_proggress, in_proggress_expire_at = NOW() + timeout WHERE state == wait AND queue = ? LIMIT 1 RETURNING *",
    queue
  );
  response.status(200).send(result.msg);
});

app.get("/ack", async function (req, res) {
  const id = req.query.id;
  pg.query("UPDATE tasks SET state=done, WHERE id = ?", id);
});

app.get("/nack", async function (req, res) {
  const id = req.query.id;
  pg.query("UPDATE tasks SET state=failed, WHERE id = ?", id);
});

callWithFrequency(1000 * ms, () => {
  pg.query(
    "UPDATE tasks SET state=waiting, retry_no = retry_no + 1 WHERE in_proggress_expire_at < NOW()"
  );
});

app.listen(80);
