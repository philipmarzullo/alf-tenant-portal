-- Add propagated_from column for cross-agent instruction propagation.
-- When a super-admin approves an instruction and propagates it to other agents,
-- independent copies are created with propagated_from pointing to the original.

ALTER TABLE agent_instructions
  ADD COLUMN propagated_from uuid REFERENCES agent_instructions(id) ON DELETE SET NULL;

CREATE INDEX idx_agent_instructions_propagated
  ON agent_instructions(propagated_from) WHERE propagated_from IS NOT NULL;
