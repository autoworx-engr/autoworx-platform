-- ============================================================
-- Pure PL/pgSQL PGMQ implementation
-- Works on any standard PostgreSQL ≥ 14 — no C extension needed.
-- If your PostgreSQL already has the official pgmq extension,
-- replace this block with:  CREATE EXTENSION IF NOT EXISTS pgmq;
-- ============================================================

CREATE SCHEMA IF NOT EXISTS pgmq;

-- Queue registry
CREATE TABLE IF NOT EXISTS pgmq.meta (
  queue_name  TEXT        PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a named queue (idempotent)
CREATE OR REPLACE FUNCTION pgmq.create(p_queue_name TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS pgmq.q_%I (
      msg_id      BIGSERIAL    NOT NULL PRIMARY KEY,
      read_ct     INTEGER      NOT NULL DEFAULT 0,
      enqueued_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      vt          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      message     JSONB        NOT NULL
    )
  ', p_queue_name);

  EXECUTE format('
    CREATE INDEX IF NOT EXISTS pgmq_q_%I_vt_idx ON pgmq.q_%I (vt)
  ', p_queue_name, p_queue_name);

  INSERT INTO pgmq.meta (queue_name)
  VALUES (p_queue_name)
  ON CONFLICT (queue_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Enqueue a message (visible immediately)
CREATE OR REPLACE FUNCTION pgmq.send(p_queue_name TEXT, p_msg JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  EXECUTE format(
    'INSERT INTO pgmq.q_%I (vt, message) VALUES (NOW(), $1) RETURNING msg_id',
    p_queue_name
  ) USING p_msg INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Enqueue a message visible after p_delay seconds
CREATE OR REPLACE FUNCTION pgmq.send_with_delay(p_queue_name TEXT, p_msg JSONB, p_delay INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_id       BIGINT;
  v_interval INTERVAL := (p_delay::TEXT || ' seconds')::INTERVAL;
BEGIN
  EXECUTE format(
    'INSERT INTO pgmq.q_%I (vt, message) VALUES (NOW() + $1, $2) RETURNING msg_id',
    p_queue_name
  ) USING v_interval, p_msg INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Read up to p_qty messages, locking them for p_vt seconds
-- (invisible to other consumers during that window)
CREATE OR REPLACE FUNCTION pgmq.read(p_queue_name TEXT, p_vt INTEGER, p_qty INTEGER)
RETURNS TABLE (
  msg_id      BIGINT,
  read_ct     INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt          TIMESTAMPTZ,
  message     JSONB
) AS $$
DECLARE
  v_vt INTERVAL := (p_vt::TEXT || ' seconds')::INTERVAL;
BEGIN
  RETURN QUERY EXECUTE format('
    UPDATE pgmq.q_%I
    SET  read_ct = read_ct + 1,
         vt      = NOW() + $1
    WHERE msg_id IN (
      SELECT msg_id
      FROM   pgmq.q_%I
      WHERE  vt <= NOW()
      ORDER  BY vt ASC
      LIMIT  $2
      FOR UPDATE SKIP LOCKED
    )
    RETURNING msg_id, read_ct, enqueued_at, vt, message
  ', p_queue_name, p_queue_name)
  USING v_vt, p_qty;
END;
$$ LANGUAGE plpgsql;

-- Delete a message by ID; returns TRUE if a row was deleted
CREATE OR REPLACE FUNCTION pgmq.delete(p_queue_name TEXT, p_msg_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  EXECUTE format(
    'DELETE FROM pgmq.q_%I WHERE msg_id = $1',
    p_queue_name
  ) USING p_msg_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Initialise the SMS-agent queue
-- ============================================================
SELECT pgmq.create('sms_agent');

-- ============================================================
-- Debounce tracker: one row per client per active window.
-- Inserted on first SMS of a window; deleted atomically by the
-- worker once 1 minute of silence has passed.
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_agent_debounce (
  client_id    INTEGER      PRIMARY KEY,
  company_id   INTEGER      NOT NULL,
  send_from    TEXT         NOT NULL,
  send_to      TEXT         NOT NULL,
  window_start TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
