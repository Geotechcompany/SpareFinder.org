-- Job 13: 5454bcfa-d912-47ba-ac7a-fdb3828ecbaa.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '5454bcfa-d912-47ba-ac7a-fdb3828ecbaa.jpeg',
        '5454bcfa-d912-47ba-ac7a-fdb3828ecbaa.jpeg',
        true,
        'completed',
        '** Crankshaft Assembly with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts linear motion of pistons into rotational motion to drive the vehicle''s wheels.
- **Typical Applications & Use-Cases:** Commonly used in internal combustion engines for cars, t...',
        25.01,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['Example OEM makes/models: Varies widely across brands and models; specific to engine types.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
