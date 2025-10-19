-- Job 3: 13c8320f-1974-43c8-8d92-a20f8979c595.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '13c8320f-1974-43c8-8d92-a20f8979c595.jpeg',
        '13c8320f-1974-43c8-8d92-a20f8979c595.jpeg',
        true,
        'completed',
        '** Front Car Door Panel',
        'Automotive Parts',
        70,
        '- **Function:** Provides access to the vehicle interior and supports window mechanisms, locks, and side mirrors. It contributes to vehicle aerodynamics and safety.
- **Typical Applications & Use-Cases...',
        74.62,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Compatibility depends on specific vehicle make, model, and year.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
