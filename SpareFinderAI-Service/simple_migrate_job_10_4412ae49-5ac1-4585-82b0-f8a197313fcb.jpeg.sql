-- Job 10: 4412ae49-5ac1-4585-82b0-f8a197313fcb.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '4412ae49-5ac1-4585-82b0-f8a197313fcb.jpeg',
        '4412ae49-5ac1-4585-82b0-f8a197313fcb.jpeg',
        true,
        'completed',
        '** Steel Wheel Rim',
        'Automotive Parts',
        70,
        '- **Function:** Steel wheel rims provide a mounting point for tires and are essential for vehicle mobility and stability.
- **Typical Applications & Use-Cases:** Commonly used in passenger vehicles, c...',
        53.18,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Common in brands like Toyota, Ford, Hyundai, and Honda.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
