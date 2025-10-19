-- Job 18: 8f4d7347-0edb-4370-9623-2486dd9ab5ca.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '8f4d7347-0edb-4370-9623-2486dd9ab5ca.jpeg',
        '8f4d7347-0edb-4370-9623-2486dd9ab5ca.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons Assembly',
        'Automotive Parts',
        70,
        '- **Function:** Converts the linear motion of pistons into rotational motion to drive the vehicle''s drivetrain.
- **Typical Applications & Use-Cases:** Found in internal combustion engines of cars, tr...',
        55.06,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Used in a variety of gasoline and diesel engines across multiple brands.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
