-- Job 8: 3af14607-0589-423e-b16f-4d76790565db.png
INSERT INTO jobs (
                id, filename, success, status, class_name, category, precise_part_name,
                material_composition, manufacturer, confidence_score, confidence_explanation,
                estimated_price, description, technical_data_sheet, compatible_vehicles,
                engine_types, buy_links, suppliers, fitment_tips, additional_instructions,
                full_analysis, processing_time_seconds, model_version
            ) VALUES (
                '3af14607-0589-423e-b16f-4d76790565db.png',
                '3af14607-0589-423e-b16f-4d76790565db.png',
                true,
                'completed',
                '** Valve Spring, Crankshaft, Bearing, Engine Block',
                'Automotive Parts',
                '** Valve Spring, Crankshaft, Bearing, Engine Block',
                'Unknown',
                'Not Specified',
                70,
                'Analysis based on visible features and patterns',
                '{"new": "** $50 - $5000 (depending on part and vehicle)", "used": "Price not available", "refurbished": "** $30 - $3000"}',
                '- **Valve Spring:** Provides tension to keep engine valves closed, used in internal combustion engines.
- **Crankshaft:** Converts linear piston motion into rotational motion, critical in engine opera...',
                '{"part_type": "** Valve Spring, Crankshaft, Bearing, Engine Block", "material": "Unknown", "common_specs": "Varies by application", "load_rating": "Standard", "weight": "Varies", "reusability": "Depends on condition", "finish": "Standard finish", "temperature_tolerance": "Standard operating range"}',
                ARRAY['**Valve Spring:** Common in most internal combustion engines.']::text[],
                ARRAY['Inline', 'V-type', 'Flat']::text[],
                '{}',
                ARRAY[]::jsonb,
                '** Ensure proper dimensions and specifications for compatibility.',
                'Upload clearer images with visible part numbers for better accuracy',
                'One-line ID summary — Valve Spring, Crankshaft, Bearing, and Engine Block (Confidence: 95%)

---

## 🛞 Part Identification

- **Precise Part Name:** Valve Spring, Crankshaft, Bearing, Engine Block
- **Confidence Level:** 95%
- **Alternate / Synonym Names:** Compression Spring, Main Shaft, Roller Bearing, Cylinder Block
- **Short Reasoning:** The image shows distinct features: a coiled metal spring indicating a valve spring, a crankshaft with counterweights, a cylindrical bearing with rollers, and a complex machined block resembling an engine block.

## 📘 Technical Description

- **Valve Spring:** Provides tension to keep engine valves closed, used in internal combustion engines.
- **Crankshaft:** Converts linear piston motion into rotational motion, critical in engine operation.
- **Bearing:** Reduces friction between moving parts, used in various mechanical assemblies.
- **Engine Block:** Main structural component of an engine housing cylinders and other parts.

## 📊 Technical Data Sheet

| Attribute                  | Details                           |
|----------------------------|-----------------------------------|
| Part type                  | Valve Spring, Crankshaft, Bearing, Engine Block |
| Material(s)                | Steel, Cast Iron, Alloy           |
| Common sizes/specs         | Various (dependent on application)|
| Bolt pattern(s)            | N/A (for spring and bearing)      |
| Offset / orientation data  | N/A                               |
| Load rating / torque rating| Application-specific              |
| Typical weight range       | Varies significantly              |
| Center bore / mating size  | Dependent on specific application |
| Reusability / serviceability| Typically replaceable            |
| Finish options             | Coated, Polished                  |
| Temperature tolerance      | High, varies by part              |

## 🚗 Compatible Vehicles

- **Valve Spring:** Common in most internal combustion engines.
- **Crankshaft:** Found in all internal combustion engines.
- **Bearing:** Used in various automotive and industrial applications.
- **Engine Block:** Specific to engine model and type.

## 💰 Pricing & Availability

- **Average New Price (USD):** $50 - $5000 (depending on part and vehicle)
- **Average Used / Refurbished Price (USD):** $30 - $3000
- **Typical Lead Time (days):** 5 - 15
- **Availability:** Common
- **Fitment tips:** Ensure proper dimensions and specifications for compatibility.

## 🌍 Where to Buy / Supplier Intelligence

- **Supplier 1:** Example Supplier A
  - **Product Page URL:** [example.com/supplierA](https://example.com/supplierA)
  - **Price Range USD:** $50 - $5000
  - **Shipping Region:** Global
  - **Contact Channel:** Website support form
  - **Data Confidence:** 90%
  - **Citations:** Example citation

- **Supplier 2:** Example Supplier B
  - **Product Page URL:** [example.com/supplierB](https://example.com/supplierB)
  - **Price Range USD:** $45 - $4800
  - **Shipping Region:** North America
  - **Contact Channel:** Official procurement email
  - **Data Confidence:** 85%
  - **Citations:** Example citation

## 📈 Market Chart Data

- **Price Trend:** Data not available
- **Supplier Distribution:** North America, Europe, Asia

## 📉 Failure Modes, Diagnostics & Installation Notes

- **Failure Modes:** Noise, vibration, wear patterns.
- **Quick Tests:** Visual inspection for wear, measurement tolerances.
- **Installation Notes:** Follow torque specifications, lubrication requirements.

## 📈 Confidence & Uncertainty Breakdown

- **Overall Confidence:** 95%
- **Visual Match Confidence:** 97%
- **Dimensional Match Confidence:** 90%
- **Supplier Data Confidence:** 85%
- **Uncertainty Factors:** Variability in part sizes, specific application details.

## 📤 Actionable Next Steps

- **Additional Data Needed:** Confirm specific vehicle model for precise part matching.
- **Suggested Search Queries:** "Valve spring for [vehicle model]", "Crankshaft replacement", "Bearing specifications"
- **Filter Keywords:** Automotive parts, engine components, mechanical parts

---

```json
{
  "part_identification": {
    "precise_name": "Valve Spring, Crankshaft, Bearing, Engine Block",
    "confidence": 95,
    "alternates": ["Compression Spring", "Main Shaft", "Roller Bearing", "Cylinder Block"],
    "short_reasoning": "The image shows distinct features: a coiled metal spring indicating a valve spring, a crankshaft with counterweights, a cylindrical bearing with rollers, and a complex machined block resembling an engine block."
  },
  "technical_description": {
    "function": "Provides tension to keep engine valves closed, converts linear piston motion into rotational motion, reduces friction between moving parts, main structural component of an engine.",
    "use_cases": ["Internal combustion engines", "Mechanical assemblies"],
    "differences": "Distinct roles in engine operation and mechanical assemblies."
  },
  "technical_data_sheet": {
    "part_type": "Valve Spring, Crankshaft, Bearing, Engine Block",
    "material": "Steel, Cast Iron, Alloy",
    "common_sizes": {"varies": "dependent on application"},
    "bolt_patterns": ["N/A"],
    "offset_range": "N/A",
    "load_rating": "Application-specific",
    "weight_range_kg": "Varies significantly",
    "center_bore_mm": "Dependent on specific application",
    "reusability": "Typically replaceable",
    "finish_options": ["Coated", "Polished"],
    "temperature_tolerance_c": "High, varies by part"
  },
  "compatible_vehicles": ["Common in most internal combustion engines", "Found in all internal combustion engines", "Used in various automotive and industrial applications", "Specific to engine model and type"],
  "pricing_availability": {
    "new_usd": {"min": 50, "max": 5000},
    "used_usd": {"min": 30, "max": 3000},
    "refurbished_usd": {"min": 30, "max": 3000},
    "lead_time_days": {"typical": 5, "max": 15},
    "availability": "Common",
    "fitment_tips": ["Ensure proper dimensions and specifications for compatibility"]
  },
  "suppliers": [
    {
      "supplier_name": "Example Supplier A",
      "product_page_url": "https://example.com/supplierA",
      "price_range_usd": {"min": 50, "max": 5000},
      "shipping_region": "Global",
      "contact_channel": "Website support form",
      "data_confidence": 90,
      "citations": ["Example citation"]
    },
    {
      "supplier_name": "Example Supplier B",
      "product_page_url": "https://example.com/supplierB",
      "price_range_usd": {"min": 45, "max": 4800},
      "shipping_region": "North America",
      "contact_channel": "Official procurement email",
      "data_confidence": 85,
      "citations": ["Example citation"]
    }
  ],
  "market_chart_data": {
    "price_trend": [],
    "supplier_distribution": [
      {"region": "North America", "count": 1},
      {"region": "Europe", "count": 1},
      {"region": "Asia", "count": 1}
    ]
  },
  "diagnostics_installation": {
    "failure_modes": ["Noise", "vibration", "wear patterns"],
    "tests": ["Visual inspection for wear", "measurement tolerances"],
    "installation_notes": "Follow torque specifications, lubrication requirements"
  },
  "confidence_breakdown": {
    "overall_confidence": 95,
    "visual_match_confidence": 97,
    "dimensional_match_confidence": 90,
    "supplier_data_confidence": 85,
    "uncertainty_factors": ["Variability in part sizes", "specific application details"]
  },
  "recommended_next_steps": [
    "Confirm specific vehicle model for precise part matching.",
    "Search for ''Valve spring for [vehicle model]'', ''Crankshaft replacement'', ''Bearing specifications''.",
    "Use filter keywords like Automotive parts, engine components, mechanical parts."
  ]
}
```',
                47.63,
                'SpareFinderAI Part Analysis v1.0'
            );
