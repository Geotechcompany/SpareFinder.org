-- Job 25: dc535904-c3ec-4e60-b7bf-0b260742047f.png
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        'dc535904-c3ec-4e60-b7bf-0b260742047f.png',
        'dc535904-c3ec-4e60-b7bf-0b260742047f.png',
        true,
        'completed',
        'Automotive Component',
        'Automotive Parts',
        70,
        'Technical description not available',
        18.11,
        'SpareFinderAI Part Analysis v1.0',
        '{}'::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
