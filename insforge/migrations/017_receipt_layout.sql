-- Receipt editor layout (blocks + style) stored as JSON on merchant
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS receipt_layout_json jsonb;
