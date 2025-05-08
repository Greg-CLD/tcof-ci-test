
    -- Alter projects table to use UUID instead of serial
    ALTER TABLE projects 
    ALTER COLUMN id TYPE uuid USING uuid_generate_v4();
    
    -- Alter success_factor_ratings table to use UUID for project_id references
    ALTER TABLE success_factor_ratings 
    ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
    
    -- Alter plans table to use UUID for project_id references
    ALTER TABLE plans 
    ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
    
    -- Update other foreign key constraints if needed
    