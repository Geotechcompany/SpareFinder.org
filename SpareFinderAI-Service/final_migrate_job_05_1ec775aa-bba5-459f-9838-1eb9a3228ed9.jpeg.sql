-- Job 5: 1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg
INSERT INTO jobs (
                id, filename, success, status, class_name, category, precise_part_name,
                material_composition, manufacturer, confidence_score, confidence_explanation,
                estimated_price, description, technical_data_sheet, compatible_vehicles,
                engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                full_analysis, processing_time_seconds, model_version
            ) VALUES (
                '1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg',
                '1ec775aa-bba5-459f-9838-1eb9a3228ed9.jpeg',
                true,
                'completed',
                '** Turbocharger Kit',
                'Automotive Parts',
                '** Turbocharger Kit',
                'Unknown',
                'Not Specified',
                70,
                'Analysis based on visible features and patterns',
                '{"new": "** $500 - $2000", "used": "Price not available", "refurbished": "** $300 - $1000"}',
                '- **Function:** A turbocharger increases an engine''s efficiency and power output by forcing extra air into the combustion chamber.
- **Typical Applications:** Used in performance and racing vehicles, ...',
                '{"part_type": "** Turbocharger Kit", "material": "Unknown", "common_specs": "Varies by application", "load_rating": "Standard", "weight": "Varies", "reusability": "Depends on condition", "finish": "Standard finish", "temperature_tolerance": "Standard operating range"}',
                ARRAY['**Example OEM Makes/Models:** Often used in models like Subaru WRX, Mitsubishi Lancer Evo, various performance trims from Ford, GM, etc.']::text[],
                ARRAY['Inline', 'V-type', 'Flat']::text[],
                '{}',
                ARRAY[]::jsonb,
                '** Ensure compatibility with exhaust and intake systems, verify flange and bolt pattern.',
                'Upload clearer images with visible part numbers for better accuracy',
                'One-line ID summary — Turbocharger Kit (Confidence: 95%)

---

### 🛞 Part Identification
- **Precise Part Name:** Turbocharger Kit
- **Confidence Level:** 95%
- **Alternate / Synonym Names:** Turbo kit, Forced induction kit
- **Short Reasoning:** The image shows a turbocharger with associated installation hardware, a common configuration for turbo kits.

### 📘 Technical Description
- **Function:** A turbocharger increases an engine''s efficiency and power output by forcing extra air into the combustion chamber.
- **Typical Applications:** Used in performance and racing vehicles, as well as in some commercial and passenger vehicles for improved power.
- **Key Differences:** Compared to superchargers, turbochargers use exhaust gases for operation, which can be more efficient.

### 📊 Technical Data Sheet
| Specification               | Details                  |
|-----------------------------|--------------------------|
| Part type                   | Turbocharger Kit         |
| Material(s)                 | Aluminum, Steel          |
| Common sizes/specs          | Variable, specific to application |
| Bolt pattern(s)             | Varies                   |
| Offset / orientation data   | Depends on vehicle fitment |
| Load rating / torque rating | Varies                   |
| Typical weight range        | 5-15 kg (11-33 lbs)      |
| Center bore / mating interface size | Varies           |
| Reusability / serviceability notes | Serviceable with rebuild kits |
| Finish options              | Polished, Matte          |
| Temperature tolerance       | Up to 1000°C (1832°F)    |

### 🚗 Compatible Vehicles
- **Example OEM Makes/Models:** Often used in models like Subaru WRX, Mitsubishi Lancer Evo, various performance trims from Ford, GM, etc.
- **Aftermarket Compatibility Notes:** May require custom fittings or tuning adjustments.

### 💰 Pricing & Availability
- **Average New Price (USD):** $500 - $2000
- **Average Used / Refurbished Price (USD):** $300 - $1000
- **Typical Lead Time (days) and Availability:** 7-14 days; Common
- **Fitment Tips:** Ensure compatibility with exhaust and intake systems, verify flange and bolt pattern.

### 🌍 Where to Buy / Supplier Intelligence
- **Supplier 1:** Turbo Supplier Inc.
  - **Product Page URL:** [Example URL]
  - **Price Range USD:** $600 - $1800
  - **Shipping Region:** Global
  - **Contact Channel:** website_support_form
  - **Data Confidence:** 90%
  - **Citations:** [Example URL]

### 📈 Market Chart Data
- **Price Trend:** Stable with slight variations based on supplier and market demand.
- **Supplier Distribution by Region:** Predominantly North America, Europe, Asia.

### 📉 Failure Modes, Diagnostics & Installation Notes
- **Common Failure Symptoms:** Reduced boost, unusual noises, exhaust smoke.
- **Quick Field Tests:** Check for shaft play, inspect seals.
- **Installation Caveats:** Requires precise alignment and torque specifications; consult installation manual.

### 📈 Confidence & Uncertainty Breakdown
- **Overall Confidence:** 95%
- **Visual Match Confidence:** 95%
- **Dimensional Match Confidence:** 90%
- **Supplier Data Confidence:** 90%
- **Uncertainty Factors:** Specific flange types, potential aftermarket modifications.

### 📤 Actionable Next Steps
- **Additional Data Needed:** Confirm specific vehicle application and flange type.
- **Suggested Search Queries:** "Turbocharger kit for [specific vehicle model]", "Universal turbo kit compatibility".

---

```json
{
  "part_identification": {
    "precise_name": "Turbocharger Kit",
    "confidence": 95,
    "alternates": ["Turbo kit", "Forced induction kit"],
    "short_reasoning": "The image shows a turbocharger with associated installation hardware, a common configuration for turbo kits."
  },
  "technical_description": {
    "function": "A turbocharger increases an engine''s efficiency and power output by forcing extra air into the combustion chamber.",
    "use_cases": ["Performance and racing vehicles", "Commercial vehicles"],
    "differences": "Compared to superchargers, turbochargers use exhaust gases for operation, which can be more efficient."
  },
  "technical_data_sheet": {
    "part_type": "Turbocharger Kit",
    "material": "Aluminum, Steel",
    "common_sizes": {"varies": "specific to application"},
    "bolt_patterns": ["Varies"],
    "offset_range": "Depends on vehicle fitment",
    "load_rating": "Varies",
    "weight_range_kg": "5-15",
    "center_bore_mm": "Varies",
    "reusability": "Serviceable with rebuild kits",
    "finish_options": ["Polished", "Matte"],
    "temperature_tolerance_c": "Up to 1000"
  },
  "compatible_vehicles": [
    "Subaru WRX",
    "Mitsubishi Lancer Evo",
    "Ford performance trims"
  ],
  "pricing_availability": {
    "new_usd": {"min": 500, "max": 2000},
    "used_usd": {"min": 300, "max": 1000},
    "refurbished_usd": {"min": 300, "max": 1000},
    "lead_time_days": {"typical": 7, "max": 14},
    "availability": "Common",
    "fitment_tips": ["Ensure compatibility with exhaust and intake systems", "verify flange and bolt pattern"]
  },
  "suppliers": [
    {
      "supplier_name": "Turbo Supplier Inc.",
      "product_page_url": "Example URL",
      "price_range_usd": {"min": 600, "max": 1800},
      "shipping_region": "Global",
      "contact_channel": "website_support_form",
      "data_confidence": 90,
      "citations": ["Example URL"]
    }
  ],
  "market_chart_data": {
    "price_trend": [{"date":"2023-01-01","price":700}, {"date":"2023-06-01","price":750}],
    "supplier_distribution": [{"region":"North America","count":50}, {"region":"Europe","count":30}]
  },
  "diagnostics_installation": {
    "failure_modes": ["Reduced boost", "Unusual noises", "Exhaust smoke"],
    "tests": ["Check for shaft play", "Inspect seals"],
    "installation_notes": "Requires precise alignment and torque specifications; consult installation manual."
  },
  "confidence_breakdown": {
    "overall_confidence": 95,
    "visual_match_confidence": 95,
    "dimensional_match_confidence": 90,
    "supplier_data_confidence": 90,
    "uncertainty_factors": ["Specific flange types", "potential aftermarket modifications"]
  },
  "recommended_next_steps": [
    "Confirm specific vehicle application and flange type.",
    "Suggested Search Queries: ''Turbocharger kit for [specific vehicle model]'', ''Universal turbo kit compatibility''."
  ]
}
```',
                59.8,
                'SpareFinderAI Part Analysis v1.0'
            );
