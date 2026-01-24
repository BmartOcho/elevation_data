-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create nodes table
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  height_agl DOUBLE PRECISION NOT NULL DEFAULT 10.0, -- Height above ground level in meters
  frequency DOUBLE PRECISION NOT NULL DEFAULT 915.0, -- Frequency in MHz
  power DOUBLE PRECISION NOT NULL DEFAULT 1.0, -- Power in Watts
  antenna_gain DOUBLE PRECISION NOT NULL DEFAULT 2.15, -- Antenna gain in dBi
  sensitivity DOUBLE PRECISION NOT NULL DEFAULT -110.0, -- Sensitivity in dBm (receiver only)
  cable_loss DOUBLE PRECISION NOT NULL DEFAULT 0.5, -- Cable loss in dB (receiver only)
  position INTEGER NOT NULL, -- Order position for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for nodes table
CREATE POLICY "Users can view nodes in their projects"
  ON nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = nodes.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert nodes in their projects"
  ON nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = nodes.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in their projects"
  ON nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = nodes.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes in their projects"
  ON nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = nodes.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_nodes_project_id ON nodes(project_id);
CREATE INDEX idx_nodes_position ON nodes(project_id, position);
