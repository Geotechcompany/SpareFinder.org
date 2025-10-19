-- Job 9: 3d25877e-b60f-45ec-bfa1-8501033bd757.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '3d25877e-b60f-45ec-bfa1-8501033bd757.jpeg',
        '3d25877e-b60f-45ec-bfa1-8501033bd757.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts the linear motion of pistons into rotational motion to drive the vehicle''s drivetrain.
- **Typical Applications & Use-Cases:** Commonly used in internal combustion engines for...',
        42.98,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['Ford', 'Chevrolet', 'and Honda.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
