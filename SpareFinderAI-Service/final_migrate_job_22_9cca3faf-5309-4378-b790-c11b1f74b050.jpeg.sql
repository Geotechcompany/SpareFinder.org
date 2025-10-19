-- Job 22: 9cca3faf-5309-4378-b790-c11b1f74b050.jpeg
INSERT INTO jobs (
                id, filename, success, status, class_name, category, precise_part_name,
                material_composition, manufacturer, confidence_score, confidence_explanation,
                estimated_price, description, technical_data_sheet, compatible_vehicles,
                engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                full_analysis, processing_time_seconds, model_version
            ) VALUES (
                '9cca3faf-5309-4378-b790-c11b1f74b050.jpeg',
                '9cca3faf-5309-4378-b790-c11b1f74b050.jpeg',
                true,
                'completed',
                'Automotive Component',
                'Automotive Parts',
                'Automotive Component',
                'Unknown',
                'Not Specified',
                70,
                'Analysis based on visible features and patterns',
                '{"new": "Price not available", "used": "Price not available", "refurbished": "Price not available"}',
                'Technical description not available',
                '{"part_type": "Automotive Component", "material": "Unknown", "common_specs": "Varies by application", "load_rating": "Standard", "weight": "Varies", "reusability": "Depends on condition", "finish": "Standard finish", "temperature_tolerance": "Standard operating range"}',
                ARRAY[]::text[],
                ARRAY['Inline', 'V-type', 'Flat']::text[],
                '{}',
                ARRAY[]::jsonb,
                'Verify compatibility with your specific vehicle before purchase',
                'Upload clearer images with visible part numbers for better accuracy',
                'I''m unable to provide a detailed analysis of this image. However, I can guide you on how to identify and source automotive parts. Please provide additional details or context if available.',
                5.0,
                'SpareFinderAI Part Analysis v1.0'
            );
