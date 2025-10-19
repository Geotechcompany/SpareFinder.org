-- Job 11: 50d6f0fc-fa03-4d35-90cd-f20a7b16883c.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '50d6f0fc-fa03-4d35-90cd-f20a7b16883c.jpeg',
        '50d6f0fc-fa03-4d35-90cd-f20a7b16883c.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts linear motion of pistons into rotational motion to drive the vehicle’s drivetrain.
- **Typical Applications:** Used in internal combustion engines for cars, trucks, motorcycle...',
        57.2,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Common in most gasoline and diesel engines from manufacturers like Ford, Toyota, Honda.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
