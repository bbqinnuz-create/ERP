import { spawn } from 'node:child_process';
import type { ReceiptData, ReceiptMode } from './receipt';
import { renderReceipt } from './receipt';

export interface PrintDriver {
  print(receipt: ReceiptData): Promise<void>;
}

export class PrintOutcomeUncertainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrintOutcomeUncertainError';
  }
}

export class CupsEscPosDriver implements PrintDriver {
  constructor(
    private readonly printerName: string,
    private readonly mode: ReceiptMode = 'raster',
    private readonly timeoutMs = 60_000,
  ) {
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(printerName)) {
      throw new TypeError('printer_name_invalid');
    }
  }

  async print(receipt: ReceiptData): Promise<void> {
    const bytes = renderReceipt(receipt, this.mode);
    await new Promise<void>((resolve, reject) => {
      const child = spawn('lp', ['-d', this.printerName, '-o', 'raw', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        finish(new PrintOutcomeUncertainError('cups_print_timeout'));
      }, this.timeoutMs);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => { stdout += chunk; });
      child.stderr.on('data', (chunk: string) => { stderr += chunk; });
      child.once('error', (error) => finish(new Error(`cups_spawn_failed: ${error.message}`)));
      child.once('close', (code) => {
        if (code === 0) finish();
        else finish(new Error(`cups_print_failed (${code ?? 'signal'}): ${(stderr || stdout).trim() || 'unknown error'}`));
      });
      child.stdin.once('error', (error) =>
        finish(new PrintOutcomeUncertainError(`cups_stdin_failed: ${error.message}`)));
      child.stdin.end(bytes);
    });
  }
}
