-- Job 12: 5426a506-ebf4-437e-95a7-292a5229f240.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '5426a506-ebf4-437e-95a7-292a5229f240.jpeg',
        '5426a506-ebf4-437e-95a7-292a5229f240.jpeg',
        false,
        'failed',
        'Analysis Failed',
        'Error',
        0,
        'Analysis could not be completed',
        0,
        NULL,
        '{}'::text[],
        '{}'::text[]
    );
