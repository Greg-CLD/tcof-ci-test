-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  stage VARCHAR(50) NOT NULL,
  origin VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  priority VARCHAR(50),
  due_date VARCHAR(50),
  owner VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_stage_idx ON project_tasks(stage);