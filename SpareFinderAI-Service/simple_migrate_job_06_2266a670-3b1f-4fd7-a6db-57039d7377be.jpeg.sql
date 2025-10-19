-- Job 6: 2266a670-3b1f-4fd7-a6db-57039d7377be.jpeg
INSERT INTO jobs (
        id, filename, success, status, class_name, category, 
        confidence_score, description, processing_time_seconds, model_version,
        compatible_vehicles, engine_types
    ) VALUES (
        '2266a670-3b1f-4fd7-a6db-57039d7377be.jpeg',
        '2266a670-3b1f-4fd7-a6db-57039d7377be.jpeg',
        true,
        'completed',
        '** Kawasaki FR651V Engine',
        'Automotive Parts',
        70,
        '- **Function:** The Kawasaki FR651V is a V-twin engine used to power lawn mowers and small equipment. It provides efficient power delivery and is known for durability.
- **Typical Applications & Use-C...',
        63.39,
        'SpareFinderAI Part Analysis v1.0',
        ARRAY['**Example OEM Makes/Models:** Used in brands like John Deere, Husqvarna, and Cub Cadet lawn tractors.']::text[],
        ARRAY['Inline', 'V-type', 'Flat']::text[]
    );
