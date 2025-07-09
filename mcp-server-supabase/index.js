#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

class SupabaseMCPServer {
    constructor() {
        this.server = new Server({
            name: 'supabase-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });

        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        this.setupToolHandlers();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [{
                    name: 'list_tables',
                    description: 'List all tables in the Supabase database',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                    },
                },
                {
                    name: 'describe_table',
                    description: 'Get the structure of a specific table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: {
                                type: 'string',
                                description: 'Name of the table to describe',
                            },
                        },
                        required: ['table_name'],
                    },
                },
                {
                    name: 'query_table',
                    description: 'Query data from a table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: {
                                type: 'string',
                                description: 'Name of the table to query',
                            },
                            select: {
                                type: 'string',
                                description: 'Columns to select (default: *)',
                                default: '*',
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of rows to return',
                                default: 10,
                            },
                            filter: {
                                type: 'object',
                                description: 'Filter conditions (column: value)',
                            },
                        },
                        required: ['table_name'],
                    },
                },
                {
                    name: 'insert_data',
                    description: 'Insert data into a table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: {
                                type: 'string',
                                description: 'Name of the table to insert into',
                            },
                            data: {
                                type: 'object',
                                description: 'Data to insert',
                            },
                        },
                        required: ['table_name', 'data'],
                    },
                },
                {
                    name: 'update_data',
                    description: 'Update data in a table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: {
                                type: 'string',
                                description: 'Name of the table to update',
                            },
                            data: {
                                type: 'object',
                                description: 'Data to update',
                            },
                            filter: {
                                type: 'object',
                                description: 'Filter conditions (column: value)',
                            },
                        },
                        required: ['table_name', 'data', 'filter'],
                    },
                },
                {
                    name: 'delete_data',
                    description: 'Delete data from a table',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            table_name: {
                                type: 'string',
                                description: 'Name of the table to delete from',
                            },
                            filter: {
                                type: 'object',
                                description: 'Filter conditions (column: value)',
                            },
                        },
                        required: ['table_name', 'filter'],
                    },
                },
                {
                    name: 'execute_sql',
                    description: 'Execute raw SQL query',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sql: {
                                type: 'string',
                                description: 'SQL query to execute',
                            },
                        },
                        required: ['sql'],
                    },
                },
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'list_tables':
                        return await this.listTables();
                    case 'describe_table':
                        return await this.describeTable(args.table_name);
                    case 'query_table':
                        return await this.queryTable(args);
                    case 'insert_data':
                        return await this.insertData(args.table_name, args.data);
                    case 'update_data':
                        return await this.updateData(args.table_name, args.data, args.filter);
                    case 'delete_data':
                        return await this.deleteData(args.table_name, args.filter);
                    case 'execute_sql':
                        return await this.executeSql(args.sql);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: `Error: ${error.message}`,
                    },],
                };
            }
        });
    }

    async listTables() {
        try {
            const { data, error } = await this.supabase.rpc('list_tables');

            if (error) {
                // Fallback method
                const { data: tables, error: fallbackError } = await this.supabase
                    .from('information_schema.tables')
                    .select('table_name')
                    .eq('table_schema', 'public');

                if (fallbackError) {
                    throw new Error(`Failed to list tables: ${fallbackError.message}`);
                }

                return {
                    content: [{
                        type: 'text',
                        text: `Tables:\n${tables.map(t => `- ${t.table_name}`).join('\n')}`,
                    },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Tables:\n${data.map(t => `- ${t.table_name}`).join('\n')}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }

    async describeTable(tableName) {
        try {
            const { data, error } = await this.supabase
                .from(tableName)
                .select('*')
                .limit(0);

            if (error) {
                throw new Error(`Failed to describe table: ${error.message}`);
            }

            // Get column information
            const { data: columns, error: columnError } = await this.supabase
                .rpc('get_table_columns', { table_name: tableName });

            if (columnError) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Table: ${tableName}\nTable exists and is accessible.`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Table: ${tableName}\nColumns:\n${columns.map(c => `- ${c.column_name}: ${c.data_type}`).join('\n')}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to describe table: ${error.message}`);
        }
    }

    async queryTable({ table_name, select = '*', limit = 10, filter = {} }) {
        try {
            let query = this.supabase.from(table_name).select(select);

            // Apply filters
            Object.entries(filter).forEach(([column, value]) => {
                query = query.eq(column, value);
            });

            const { data, error } = await query.limit(limit);

            if (error) {
                throw new Error(`Query failed: ${error.message}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Query results from ${table_name}:\n${JSON.stringify(data, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to query table: ${error.message}`);
        }
    }

    async insertData(tableName, data) {
        try {
            const { data: result, error } = await this.supabase
                .from(tableName)
                .insert(data)
                .select();

            if (error) {
                throw new Error(`Insert failed: ${error.message}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully inserted data into ${tableName}:\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to insert data: ${error.message}`);
        }
    }

    async updateData(tableName, data, filter) {
        try {
            let query = this.supabase.from(tableName).update(data);

            // Apply filters
            Object.entries(filter).forEach(([column, value]) => {
                query = query.eq(column, value);
            });

            const { data: result, error } = await query.select();

            if (error) {
                throw new Error(`Update failed: ${error.message}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully updated data in ${tableName}:\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to update data: ${error.message}`);
        }
    }

    async deleteData(tableName, filter) {
        try {
            let query = this.supabase.from(tableName).delete();

            // Apply filters
            Object.entries(filter).forEach(([column, value]) => {
                query = query.eq(column, value);
            });

            const { data: result, error } = await query.select();

            if (error) {
                throw new Error(`Delete failed: ${error.message}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully deleted data from ${tableName}:\n${JSON.stringify(result, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to delete data: ${error.message}`);
        }
    }

    async executeSql(sql) {
        try {
            const { data, error } = await this.supabase.rpc('execute_sql', { sql });

            if (error) {
                throw new Error(`SQL execution failed: ${error.message}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `SQL execution result:\n${JSON.stringify(data, null, 2)}`,
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to execute SQL: ${error.message}`);
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Supabase MCP server running on stdio');
    }
}

const server = new SupabaseMCPServer();
server.run().catch(console.error);