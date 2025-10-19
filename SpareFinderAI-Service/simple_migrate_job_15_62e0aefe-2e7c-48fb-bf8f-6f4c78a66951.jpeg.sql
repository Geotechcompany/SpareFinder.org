-- Job 15: 62e0aefe-2e7c-48fb-bf8f-6f4c78a66951.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '62e0aefe-2e7c-48fb-bf8f-6f4c78a66951.jpeg',
        '62e0aefe-2e7c-48fb-bf8f-6f4c78a66951.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts the linear motion of pistons into rotational motion to power a vehicle.
- **Typical Applications & Use-Cases:** Used in internal combustion engines across various vehicle type...',
        35.49,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models and Model Years:** Typically used in various gasoline and diesel engines.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
