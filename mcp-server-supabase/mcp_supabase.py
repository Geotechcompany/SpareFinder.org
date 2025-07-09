import argparse
import json
import os
import sys
from supabase import create_client, Client

def run_migration(config_path):
    """
    Run Supabase migrations based on configuration file
    """
    # Read configuration
    with open(config_path, 'r') as config_file:
        config = json.load(config_file)
    
    # Extract Supabase configuration
    supabase_config = config.get('supabase', {})
    project_url = supabase_config.get('project_url')
    service_role_key = supabase_config.get('service_role_key')
    migrations_path = supabase_config.get('migrations_path', '.')
    database_name = supabase_config.get('database_name', 'postgres')
    
    # Validate configuration
    if not project_url or not service_role_key:
        print("Error: Missing Supabase project URL or service role key")
        sys.exit(1)
    
    # Create Supabase client
    supabase: Client = create_client(project_url, service_role_key)
    
    # Run migrations
    migrations = config.get('migrations', [])
    for migration in migrations:
        migration_file = os.path.join(migrations_path, migration.get('file'))
        migration_name = migration.get('name', 'Unknown Migration')
        
        try:
            # Read migration SQL
            with open(migration_file, 'r') as sql_file:
                migration_sql = sql_file.read()
            
            # Execute migration
            print(f"Running migration: {migration_name}")
            
            # Use supabase.rpc() to execute raw SQL
            response = supabase.rpc('execute_sql', {'sql': migration_sql})
            
            print(f"Migration {migration_name} completed successfully.")
        except Exception as e:
            print(f"Error running migration {migration_name}: {e}")
            sys.exit(1)
    
    print("All migrations completed successfully.")

def main():
    """
    Main function to parse arguments and run migrations
    """
    parser = argparse.ArgumentParser(description='Supabase Migration Tool')
    parser.add_argument('--config', required=True, help='Path to migration configuration file')
    parser.add_argument('--migrate', action='store_true', help='Run migrations')
    
    args = parser.parse_args()
    
    if args.migrate:
        run_migration(args.config)

if __name__ == '__main__':
    main() 