#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SpareFinder Backend...\n');

// Change to backend directory
process.chdir(__dirname);

// Install dependencies if node_modules doesn't exist
const fs = require('fs');
if (!fs.existsSync('./node_modules')) {
    console.log('📦 Installing dependencies...');
    const install = spawn('npm', ['install'], { stdio: 'inherit' });

    install.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
        startServer();
    });
} else {
    startServer();
}

function startServer() {
    console.log('🔧 Starting development server...\n');

    const server = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        env: {...process.env, NODE_ENV: 'development' }
    });

    server.on('close', (code) => {
        console.log(`\n🛑 Server stopped with code ${code}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        server.kill('SIGINT');
    });
}