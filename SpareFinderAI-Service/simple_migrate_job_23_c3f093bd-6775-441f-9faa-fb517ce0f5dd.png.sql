-- Job 23: c3f093bd-6775-441f-9faa-fb517ce0f5dd.png
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        'c3f093bd-6775-441f-9faa-fb517ce0f5dd.png',
        'c3f093bd-6775-441f-9faa-fb517ce0f5dd.png',
        true,
        'completed',
        '- Top Left: Valve Spring',
        'Automotive Parts',
        70,
        '- Valve Spring: Maintains tension on engine valves.
  - Crankshaft: Converts linear piston motion to rotational motion.
  - Bearing: Reduces friction between moving parts.
  - Engine Block/Cylinder Head Gasket: Seals engine components to prevent leaks.',
        49.42,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Valve Spring**: Compatible with most internal combustion engines.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
