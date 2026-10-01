CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    filename VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);