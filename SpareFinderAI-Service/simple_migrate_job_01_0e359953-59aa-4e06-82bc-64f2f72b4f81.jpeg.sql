-- Job 1: 0e359953-59aa-4e06-82bc-64f2f72b4f81.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '0e359953-59aa-4e06-82bc-64f2f72b4f81.jpeg',
        '0e359953-59aa-4e06-82bc-64f2f72b4f81.jpeg',
        true,
        'completed',
        '** Crankshaft with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts linear motion of pistons into rotational motion, driving the vehicle''s drivetrain.
- **Typical Applications & Use-Cases:** Used in internal combustion engines of vehicles for ...',
        67.84,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Typically found in gasoline and diesel engines of various vehicle models, ranging from small cars to heavy-duty trucks.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
