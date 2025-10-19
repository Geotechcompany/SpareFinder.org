-- Job 7: 2b6bf337-4c56-4b07-b671-e1905d62a06c.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '2b6bf337-4c56-4b07-b671-e1905d62a06c.jpeg',
        '2b6bf337-4c56-4b07-b671-e1905d62a06c.jpeg',
        true,
        'completed',
        '** Crankshaft Assembly with Pistons',
        'Automotive Parts',
        70,
        '- **Function:** Converts linear motion of pistons into rotational motion to drive the vehicle''s drivetrain.
- **Typical Applications:** Used in internal combustion engines for passenger vehicles, comm...',
        63.7,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Typically used in vehicles from manufacturers like Ford, Toyota, BMW (specific models depend on engine design).']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
