import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('first-start scripts', () => {
  it('runs administrator creation before starting the server on Windows and Linux', () => {
    const windowsScript = readFileSync(join(projectRoot, 'start', 'start-windows.bat'), 'utf8');
    const linuxScript = readFileSync(join(projectRoot, 'start', 'start-linux.sh'), 'utf8');

    for (const script of [windowsScript, linuxScript]) {
      expect(script.indexOf('npm run create-admin')).toBeGreaterThanOrEqual(0);
      expect(script.indexOf('npm start')).toBeGreaterThan(script.indexOf('npm run create-admin'));
    }

    expect(windowsScript).toContain('cd /d "%~dp0.."');
    expect(windowsScript).toContain('if errorlevel 1 exit /b %errorlevel%');
    expect(linuxScript).toContain('cd "$SCRIPT_DIR/.."');
  });
});
