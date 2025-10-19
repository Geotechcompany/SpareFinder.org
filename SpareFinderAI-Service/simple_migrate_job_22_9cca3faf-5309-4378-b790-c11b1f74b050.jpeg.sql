-- Job 22: 9cca3faf-5309-4378-b790-c11b1f74b050.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '9cca3faf-5309-4378-b790-c11b1f74b050.jpeg',
        '9cca3faf-5309-4378-b790-c11b1f74b050.jpeg',
        true,
        'completed',
        'Automotive Component',
        'Automotive Parts',
        70,
        'Technical description not available',
        5.0,
        'SpareFinderAI Part Analysis v1.0',
        '{}'::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
