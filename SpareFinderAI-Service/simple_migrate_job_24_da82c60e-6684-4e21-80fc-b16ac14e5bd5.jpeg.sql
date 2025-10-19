-- Job 24: da82c60e-6684-4e21-80fc-b16ac14e5bd5.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        'da82c60e-6684-4e21-80fc-b16ac14e5bd5.jpeg',
        'da82c60e-6684-4e21-80fc-b16ac14e5bd5.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts linear motion of pistons into rotational motion to drive the vehicle''s wheels.
- **Typical Applications:** Used in internal combustion engines for passenger vehicles, trucks, ...',
        50.91,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:**']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
