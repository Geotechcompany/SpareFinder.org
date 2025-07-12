const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🚀 Starting enhanced part_searches migration...');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    try {
        console.log('📄 Reading migration file...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/010_enhance_part_searches_for_full_data.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🗄️ Applying enhanced migration to database...');

        // Execute the migration
        const { error } = await supabase.rpc('execute_sql', {
            query: migrationSQL
        });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Enhanced migration applied successfully!');

        // Verify the migration by checking new columns
        console.log('🔍 Verifying enhanced migration...');

        const { data: columns, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'part_searches')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (columnError) {
            console.error('❌ Failed to verify migration:', columnError);
        } else {
            console.log('📋 Enhanced part_searches table structure:');
            columns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));

            // Check for the new columns specifically
            const newColumns = [
                'full_analysis',
                'ai_confidence',
                'technical_specifications',
                'pricing_information',
                'compatibility_info',
                'estimated_price_range'
            ];

            const existingColumns = columns.map(col => col.column_name);
            const missingColumns = newColumns.filter(col => !existingColumns.includes(col));

            if (missingColumns.length === 0) {
                console.log('✅ All enhanced columns are present!');
            } else {
                console.warn('⚠️ Missing columns:', missingColumns);
            }
        }

        // Test the extraction function
        console.log('🧪 Testing analysis extraction function...');
        const testAnalysis = `
**🛞 Part Identification**
Test part data

**📊 Technical Data Sheet**
| Specification | Details |
| Part type | Test Part |

**💰 Pricing & Availability**
- New price range: $100 - $500 USD
- Used price range: $50 - $200 USD
    `;

        const { data: testResult, error: testError } = await supabase
            .rpc('extract_analysis_section', {
                analysis_text: testAnalysis,
                section_name: 'Technical Data Sheet'
            });

        if (testError) {
            console.warn('⚠️ Test function error:', testError);
        } else {
            console.log('✅ Analysis extraction function working!');
        }

    } catch (error) {
        console.error('❌ Error during enhanced migration:', error);
        process.exit(1);
    }
}

// Run the migration
applyMigration().then(() => {
    console.log('🎉 Enhanced migration completed successfully!');
    console.log('📊 Your part_searches table can now store:');
    console.log('  • Complete AI analysis text');
    console.log('  • Detailed technical specifications');
    console.log('  • Pricing and compatibility information');
    console.log('  • Automatic section extraction');
    console.log('  • Full-text search capabilities');
    process.exit(0);
}).catch(error => {
    console.error('❌ Enhanced migration failed:', error);
    process.exit(1);
});