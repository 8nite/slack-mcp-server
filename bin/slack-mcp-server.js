#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Simple check if go is in path
function checkGoAvailability() {
    return new Promise((resolve) => {
        const check = spawn('go', ['version'], { shell: true, stdio: 'ignore' });
        check.on('error', () => resolve(false));
        check.on('exit', (code) => resolve(code === 0));
    });
}

(async () => {
    const hasGo = await checkGoAvailability();
    if (!hasGo) {
        console.error('Error: "go" command not found in PATH.');
        console.error('To run this server via npx without pre-compiled binaries, you must have Go installed.');
        console.error('Install Go from https://go.dev/dl/');
        process.exit(1);
    }

    // Locate the Go entry point relative to this script
    // This script is in /bin, so we go up one level to root, then into cmd/slack-mcp-server
    const goFile = path.join(__dirname, '..', 'cmd', 'slack-mcp-server', 'main.go');

    const args = ['run', goFile, ...process.argv.slice(2)];

    // console.error(`Running: go ${args.join(' ')}`);

    const child = spawn('go', args, {
        stdio: 'inherit',
        shell: true 
    });

    child.on('exit', (code) => {
        process.exit(code);
    });
})();
