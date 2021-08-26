var express = require("express");
const { v4: uuid } = require("uuid");
const { Pool } = require("pg");
const pool = new Pool({
  user: requireEnv("POSTGRES_USER"),
  host: requireEnv("POSTGRES_HOST"),
  database: requireEnv("POSTGRES_DB"),
  password: requireEnv("POSTGRES_PASSWORD"),
  port: requireEnv("POSTGRES_PORT"),
});

var app = express();
app.use(express.json());

app.post("/put", async function (req, res) {
  const id = uuid();
  const queue = ensureDefined(req.query.queue, "?queue");
  const timeoutMs = parseInt(
    ensureDefined(req.query.timeout_ms, "?timeout_ms")
  );
  const msg = ensureDefined(req.body, "POST body");
  await pool.query({
    text: "INSERT INTO tasks (id, queue_path, msg, timeout_ms) VALUES ($1, $2, $3, $4)",
    values: [id, queue, msg, timeoutMs],
  });
  response.status(200).send(id);
});

app.get("/take", async function (req, res) {
  const queue = ensureDefined(req.query.queue, "?queue");
  const result = await pool.query({
    text: "UPDATE tasks SET state_name = 'in_progress', in_progress_expire_at = extract(epoch from current_timestamp) * 1000 + extract(milliseconds from current_timestamp) + timeout_ms WHERE state = 'wait' AND queue = $1 LIMIT 1 RETURNING *",
    values: [queue],
  });
  if (result.rows.length > 0) {
    response.status(200).send(result.msg);
  } else {
    response.status(204).send();
  }
});

app.get("/ack", async function (req, res) {
  const id = req.query.id;
  await pool.query({
    text: "UPDATE tasks SET state='done' WHERE id = $1",
    values: [id],
  });
});

app.get("/nack", async function (req, res) {
  const id = req.query.id;
  await pool.query({
    text: "UPDATE tasks SET state='failed' WHERE id = $1",
    values: [id],
  });
});

async function returnTimeouts() {
  try {
    await pool.query(
      "UPDATE tasks SET state='waiting', retry_no = retry_no + 1 WHERE in_progress_expire_at < (extract(epoch from current_timestamp) * 1000 + extract(milliseconds from current_timestamp))"
    );
    console.log("Return timeouts executed");
  } catch (error) {
    console.error("Return timeouts failed");
    console.error(error);
  }
  setTimeout(returnTimeouts, 500);
}
setTimeout(returnTimeouts, 500);

app.listen(80);

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value === "undefined")
    throw new Error(`Env ${name} is not defined!`);
  return value;
}

function ensureDefined(value, name) {
  if (typeof value === "undefined")
    throw new Error(`Value ${name} is not defined!`);
  return value;
}
