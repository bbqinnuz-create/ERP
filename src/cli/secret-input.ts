import { StringDecoder } from 'node:string_decoder';
import { stdin, stdout } from 'node:process';

export async function readSecret(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Для безопасного ввода пароля требуется интерактивный терминал.');
  }
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  const decoder = new StringDecoder('utf8');

  return new Promise<string>((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      for (const char of decoder.write(chunk)) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Ввод отменён.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (char >= ' ' && char !== '\u007f') value += char;
      }
    };
    stdin.on('data', onData);
  });
}
