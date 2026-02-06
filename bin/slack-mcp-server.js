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
    // Check for pre-built binary first
    const binaryName = process.platform === 'win32' ? 'slack-mcp-server.exe' : 'slack-mcp-server';
    const binaryPath = path.resolve(__dirname, '..', 'build', binaryName);

    if (fs.existsSync(binaryPath)) {
        // console.error(`Found pre-built binary at ${binaryPath}`);
        const child = spawn(binaryPath, process.argv.slice(2), {
            stdio: 'inherit',
            shell: false
        });

        child.on('exit', (code) => {
            process.exit(code);
        });
        return;
    }

    const hasGo = await checkGoAvailability();
    if (!hasGo) {
        console.error('Error: "go" command not found in PATH.');
        console.error('To run this server via npx without pre-compiled binaries, you must have Go installed.');
        console.error('Install Go from https://go.dev/dl/');
        console.error('Or run "make build" if you have Go installed elsewhere to create a binary.');
        process.exit(1);
    }

    // Locate the project root (where go.mod is)
    const projectRoot = path.resolve(__dirname, '..');

    // Use the Go package path, not the file path
    const args = ['run', './cmd/slack-mcp-server', ...process.argv.slice(2)];

    // console.error(`Running: go ${args.join(' ')} from ${projectRoot}`);

    const child = spawn('go', args, {
        stdio: 'inherit',
        shell: true,
        cwd: projectRoot
    });

    child.on('exit', (code) => {
        process.exit(code);
    });
})();
