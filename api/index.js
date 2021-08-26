var express = require("express");
const { v4: uuid } = require("uuid");
const { Pool } = require("pg");

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(1);
});

process.on("SIGTERM", function () {
  console.log("\nGracefully shutting down from SIGTERM");
  process.exit(1);
});

const pool = new Pool({
  user: requireEnv("POSTGRES_USER"),
  host: requireEnv("POSTGRES_HOST"),
  database: requireEnv("POSTGRES_DB"),
  password: requireEnv("POSTGRES_PASSWORD"),
  port: requireEnv("POSTGRES_PORT"),
});

var app = express();
app.use(express.json());

app.post(
  "/add",
  withErrorHandling(async function (req, res) {
    const id = uuid();
    console.log(req.query);
    const queue = ensureDefined(req.query.queue, "?queue");
    const timeoutMs = parseInt(
      ensureDefined(req.query.timeout_ms, "?timeout_ms")
    );
    const msg = ensureDefined(req.body, "POST body");
    await pool.query({
      text: "INSERT INTO tasks (id, queue_path, msg, timeout_ms) VALUES ($1, $2, $3, $4)",
      values: [id, queue, msg, timeoutMs],
    });
    console.log("Added task to " + queue, { id, queue, msg, timeoutMs });
    res.status(200).send(id);
  })
);

app.get(
  "/take",
  withErrorHandling(async function (req, res) {
    const queue = ensureDefined(req.query.queue, "?queue");
    const result = await pool.query({
      text:
        "UPDATE tasks " +
        "SET state_name = 'in_progress', " +
        "in_progress_expire_at = extract(epoch from current_timestamp) * 1000 + extract(milliseconds from current_timestamp) + timeout_ms " +
        "WHERE id=(SELECT id FROM tasks WHERE state_name = 'wait' AND queue_path = $1 LIMIT 1 FOR UPDATE SKIP LOCKED) " +
        "RETURNING *",
      values: [queue],
    });
    if (result.rows.length > 0) {
      const msg = result.rows[0].msg;
      console.log("Taken one task from " + queue, msg);
      res.status(200).send(msg);
    } else {
      console.log("No tasks to take");
      res.status(204).send("0");
    }
  })
);

app.get(
  "/ack",
  withErrorHandling(async function (req, res) {
    console.log("Begin ack");
    const id = ensureDefined(req.query.id, "?id");
    const result = await pool.query({
      text: "UPDATE tasks SET state_name='done' WHERE id = $1 RETURNING *",
      values: [id],
    });
    if (result.rows.length === 0) {
      res.status(410).send({ error: "No such task" });
    } else {
      res.status(200).send({ ok: true });
    }
    console.log("Ack done");
  })
);

app.get(
  "/nack",
  withErrorHandling(async function (req, res) {
    const id = ensureDefined(req.query.id, "?id");
    const result = await pool.query({
      text: "UPDATE tasks SET state_name='failed' WHERE id = $1 RETURNING *",
      values: [id],
    });
    if (result.rows.length === 0) {
      res.status(410).send({ error: "No such task" });
    } else {
      res.status(200).send({ ok: true });
    }
  })
);

async function returnTimeouts() {
  try {
    await pool.query(
      "UPDATE tasks SET state_name='wait', retry_no = retry_no + 1 WHERE state_name = 'in_progress' AND in_progress_expire_at < (extract(epoch from current_timestamp) * 1000)"
    );
    console.log("Return timeouts executed");
  } catch (error) {
    console.error("Return timeouts failed");
    console.error(error);
  }
  setTimeout(returnTimeouts, 3000);
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

function withErrorHandling(fHandler) {
  return async (req, res) => {
    try {
      await fHandler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: err.message });
    }
  };
}
