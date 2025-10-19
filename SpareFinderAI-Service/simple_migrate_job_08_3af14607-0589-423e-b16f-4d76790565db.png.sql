-- Job 8: 3af14607-0589-423e-b16f-4d76790565db.png
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '3af14607-0589-423e-b16f-4d76790565db.png',
        '3af14607-0589-423e-b16f-4d76790565db.png',
        true,
        'completed',
        '** Valve Spring, Crankshaft, Bearing, Engine Block',
        'Automotive Parts',
        70,
        '- **Valve Spring:** Provides tension to keep engine valves closed, used in internal combustion engines.
- **Crankshaft:** Converts linear piston motion into rotational motion, critical in engine opera...',
        47.63,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Valve Spring:** Common in most internal combustion engines.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
