
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='project_tasks' AND column_name='source_id'
        ) THEN
          ALTER TABLE project_tasks RENAME COLUMN source_id TO "sourceId";
          RAISE NOTICE 'Renamed source_id column to sourceId';
        ELSE
          RAISE NOTICE 'Column sourceId already exists or source_id does not exist';
        END IF;
      END
      $$;
    