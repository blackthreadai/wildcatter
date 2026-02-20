CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('asset', 'operator')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX idx_saved_items_user_id ON saved_items(user_id);
