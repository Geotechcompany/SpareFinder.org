-- Job 4: 153a235b-be73-4cb7-8da3-a4cd4f9a396b.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '153a235b-be73-4cb7-8da3-a4cd4f9a396b.jpeg',
        '153a235b-be73-4cb7-8da3-a4cd4f9a396b.jpeg',
        true,
        'completed',
        'Automotive Component',
        'Automotive Parts',
        70,
        'Technical description not available',
        54.92,
        'SpareFinderAI Part Analysis v1.0',
        '{}'::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
