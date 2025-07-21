#!/usr/bin/env python3
"""
Test script to verify the flat JSON parsing logic for SpareFinderAI Service
"""

import json
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.ai_service import OpenAIImageAnalyzer

def test_parsing_logic():
    """Test the parsing logic with a mock AI response"""
    
    # Mock AI response text with all sections
    mock_analysis_text = """
**🛞 Part Identification**
- Precise part name: Ceramic Brake Pad Set
- Category or type of system: Braking System  
- Material composition: Ceramic Composite
- Typical size, shape, or distinguishing features: D-shaped brake pads with mounting clips

**📘 Technical Description**
High-performance ceramic brake pads designed for daily driving and light performance use. These pads provide excellent stopping power with reduced brake dust and noise compared to semi-metallic pads.

**📊 Technical Data Sheet**
| Part type | Brake Pad Set |
| Material | Ceramic Composite |
| Common sizes or specs | Front axle, 4-pad set |
| Load rating | High performance |
| Weight | 2.5 lbs per set |
| Reusability | Single use |
| Finish options | Anti-squeal backing |
| Temperature tolerance | 800°F operating range |

**🚗 Compatible Vehicles**
- Toyota Camry 2018-2023
- Honda Accord 2018-2022
- Nissan Altima 2019-2023
- Ford Fusion 2017-2020

**💰 Pricing & Availability**
- New: $45 - $120 USD
- Used: $20 - $60 USD  
- Refurbished: $30 - $90 USD
- Include fitment tips: Verify vehicle year and engine size before ordering

**🌍 Where to Buy**
- Supplier Name: RockAuto
- Product Page: https://www.rockauto.com/en/catalog/toyota,2020,camry,2.5l+l4,3449098,brake+&+wheel+hub,brake+pad,1652
- Price Range: $35.99 - $89.99
- Shipping Region: USA, Canada, International
- Contact: 1-608-661-1376

- Supplier Name: AutoZone
- Product Page: https://www.autozone.com/brakes-and-traction-control/brake-pad/p/duralast-gold-ceramic-brake-pads-dgd1160
- Price Range: $45.99 - $119.99
- Shipping Region: USA
- Contact: 1-800-288-6966

- Supplier Name: Euro Car Parts
- Product Page: https://www.eurocarparts.com/brake-pads/ceramic-brake-pads
- Price Range: £32.99 - £89.99
- Shipping Region: UK, EU
- Contact: 0203 788 7842

**📈 Confidence Score**
- 95% confidence score in part identification
- Explain any uncertainty: High confidence due to clear visibility of brake pad shape and mounting hardware

**📤 Additional Instructions**
- Include VIN number for exact part matching
- Upload images with visible part numbers for better accuracy
"""
    
    try:
        # Create analyzer instance
        analyzer = OpenAIImageAnalyzer()
        
        # Test the parsing logic
        parsed_result = analyzer._parse_analysis(mock_analysis_text, max_predictions=3, confidence_threshold=0.3)
        
        print("🎯 FLAT FORMAT PARSING TEST")
        print("="*60)
        
        print(f"✅ Success: {parsed_result is not None}")
        print(f"🔧 Part Name: {parsed_result.get('precise_part_name', 'N/A')}")
        print(f"📂 Category: {parsed_result.get('category', 'N/A')}")
        print(f"🏭 Material: {parsed_result.get('material_composition', 'N/A')}")
        print(f"📊 Confidence: {parsed_result.get('confidence_score', 0)}%")
        
        # Test pricing extraction
        pricing = parsed_result.get('estimated_price', {})
        print(f"💰 Pricing:")
        print(f"   New: {pricing.get('new', 'N/A')}")
        print(f"   Used: {pricing.get('used', 'N/A')}")
        print(f"   Refurbished: {pricing.get('refurbished', 'N/A')}")
        
        # Test supplier extraction
        suppliers = parsed_result.get('suppliers', [])
        print(f"🏪 Suppliers: {len(suppliers)} found")
        for i, supplier in enumerate(suppliers, 1):
            print(f"   {i}. {supplier.get('name', 'Unknown')}")
            print(f"      URL: {supplier.get('url', 'N/A')}")
            print(f"      Price Range: {supplier.get('price_range', 'N/A')}")
            print(f"      Shipping: {supplier.get('shipping_region', 'N/A')}")
            print(f"      Contact: {supplier.get('contact', 'N/A')}")
            print()
        
        # Test buy links (legacy format)
        buy_links = parsed_result.get('buy_links', {})
        print(f"🛒 Buy Links: {len(buy_links)} entries")
        for vendor, url in list(buy_links.items())[:3]:
            print(f"   {vendor}: {url}")
        
        # Validate flat structure
        print("\n" + "="*60)
        print("✅ FLAT FORMAT VALIDATION")
        print("="*60)
        
        # Check essential flat fields
        essential_fields = [
            'class_name', 'category', 'precise_part_name', 'material_composition',
            'confidence_score', 'description', 'suppliers', 'buy_links'
        ]
        
        all_passed = True
        for field in essential_fields:
            if field in parsed_result:
                print(f"✅ PASS: '{field}' is present and accessible")
            else:
                print(f"❌ FAIL: '{field}' is missing")
                all_passed = False
        
        # Check supplier structure
        if suppliers:
            supplier_fields = ['name', 'url', 'price_range', 'shipping_region', 'contact']
            for field in supplier_fields:
                if field in suppliers[0]:
                    print(f"✅ PASS: 'suppliers[0].{field}' is accessible")
                else:
                    print(f"⚠️  WARN: 'suppliers[0].{field}' is missing")
        
        print(f"\n{'🎉 ALL TESTS PASSED!' if all_passed else '⚠️ Some tests failed'}")
        
        # Print full JSON for inspection
        print("\n" + "="*60)
        print("📄 FULL PARSED STRUCTURE")
        print("="*60)
        print(json.dumps(parsed_result, indent=2))
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 SpareFinderAI Flat Format Parsing Test")
    print("="*60)
    test_parsing_logic() 