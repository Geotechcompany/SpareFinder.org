-- Job 5: 1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg',
        '1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg',
        true,
        'completed',
        '** Turbocharger Kit',
        'Automotive Parts',
        70,
        '- **Function:** A turbocharger increases an engine''s efficiency and power output by forcing extra air into the combustion chamber.
- **Typical Applications:** Used in performance and racing vehicles, ...',
        59.8,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Often used in models like Subaru WRX, Mitsubishi Lancer Evo, various performance trims from Ford, GM, etc.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
