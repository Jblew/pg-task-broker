CREATE TYPE task_state AS ENUM ('wait', 'in_progress', 'done', 'failed');

CREATE TABLE tasks (
    id VARCHAR(37) NOT NULL PRIMARY KEY,
    queue_path VARCHAR(150) NOT NULL,
    state_name task_state DEFAULT 'wait',
    timeout_ms INT DEFAULT 3600000,
    in_progress_expire_at BIGINT DEFAULT 0,
    retry_no INT DEFAULT 0,
    msg NOT NULL LONGTEXT,
);

CREATE INDEX tasks_in_progress_expire_at_idx ON tasks (in_progress_expire_at);
CREATE INDEX tasks_id_idx ON tasks (id);
CREATE INDEX tasks_state_idx ON tasks (queue_path, state_name);


