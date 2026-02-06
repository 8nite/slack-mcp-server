#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BINARY_MAP = {
    darwin_x64:   { name: 'slack-mcp-server-darwin-amd64',    suffix: '' },
    darwin_arm64: { name: 'slack-mcp-server-darwin-arm64',    suffix: '' },
    linux_x64:    { name: 'slack-mcp-server-linux-amd64',     suffix: '' },
    linux_arm64:  { name: 'slack-mcp-server-linux-arm64',     suffix: '' },
    win32_x64:    { name: 'slack-mcp-server-windows-amd64',   suffix: '.exe' },
    win32_arm64:  { name: 'slack-mcp-server-windows-arm64',   suffix: '.exe' },
};

function resolveBinaryPath() {
    const key = `${process.platform}_${process.arch}`;
    const binary = BINARY_MAP[key];
    if (!binary) {
        return null;
    }

    try {
        // Try to resolve the binary package
        // This might fail if the optional dependency wasn't installed
        return require.resolve(`${binary.name}/bin/${binary.name}${binary.suffix}`);
    } catch (e) {
        return null;
    }
}

// Simple check if go is in path
function checkGoAvailability() {
    return new Promise((resolve) => {
        const check = spawn('go', ['version'], { shell: true, stdio: 'ignore' });
        check.on('error', () => resolve(false));
        check.on('exit', (code) => resolve(code === 0));
    });
}

(async () => {
    // 1. Try to use the pre-compiled binary
    const binPath = resolveBinaryPath();
    if (binPath) {
        // Workaround for https://github.com/anthropics/dxt/issues/13 (from upstream)
        if (process.env.SLACK_MCP_DXT) {
            try {
                const stats = fs.statSync(binPath);
                const execMask = fs.constants.S_IXUSR
                    | fs.constants.S_IXGRP
                    | fs.constants.S_IXOTH;

                if ((stats.mode & execMask) !== execMask) {
                    const newMode = stats.mode | execMask;
                    fs.chmodSync(binPath, newMode);
                }
            } catch (e) {
                // Ignore chmod errors
            }
        }

        const child = spawn(binPath, process.argv.slice(2), {
            stdio: 'inherit'
        });
        child.on('exit', (code) => process.exit(code));
        return;
    }

    // 2. Fallback to Go if binary not found
    const hasGo = await checkGoAvailability();
    if (!hasGo) {
        console.error('Error: Could not find pre-compiled binary for your system.');
        console.error('       And "go" command was not found in PATH.');
        console.error('To fix this, either:');
        console.error('  a) Ensure npm optional dependencies are installed');
        console.error('  b) Install Go from https://go.dev/dl/');
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
