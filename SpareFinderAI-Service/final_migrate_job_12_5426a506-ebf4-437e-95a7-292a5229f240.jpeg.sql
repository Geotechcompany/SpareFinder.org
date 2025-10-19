-- Job 12: 5426a506-ebf4-437e-95a7-292a5229f240.jpeg
INSERT INTO jobs (
                id, filename, success, status, class_name, category, precise_part_name,
                material_composition, manufacturer, confidence_score, confidence_explanation,
                estimated_price, description, technical_data_sheet, compatible_vehicles,
                engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                full_analysis, processing_time_seconds, model_version
            ) VALUES (
                '5426a506-ebf4-437e-95a7-292a5229f240.jpeg',
                '5426a506-ebf4-437e-95a7-292a5229f240.jpeg',
                false,
                'failed',
                'Analysis Failed',
                'Error',
                'Analysis Failed',
                'Unknown',
                'Unknown',
                0,
                'Analysis could not be completed',
                '{"new": "Not available", "used": "Not available", "refurbished": "Not available"}',
                'Analysis could not be completed',
                '{"part_type": "Unknown", "material": "Unknown", "common_specs": "Not available", "load_rating": "Unknown", "weight": "Unknown", "reusability": "Unknown", "finish": "Unknown", "temperature_tolerance": "Unknown"}',
                ARRAY[]::text[],
                ARRAY[]::text[],
                '{}',
                ARRAY[]::jsonb,
                'Retry with a clearer image',
                'Please upload a high-quality image and try again',
                '',
                0,
                NULL
            );
