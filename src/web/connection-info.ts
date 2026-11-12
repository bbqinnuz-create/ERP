import { networkInterfaces } from 'node:os';

export interface ConnectionAddress {
  interfaceName: string;
  address: string;
  url: string;
}

interface InterfaceAddress {
  address: string;
  family: string | number;
  internal: boolean;
}

type InterfaceMap = Record<string, InterfaceAddress[] | undefined>;

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second! >= 16 && second! <= 31) || (first === 192 && second === 168);
}

export function listLanConnectionAddresses(
  bindAddress: string,
  port: number,
  interfaces: InterfaceMap = networkInterfaces(),
): ConnectionAddress[] {
  const listensOnAllInterfaces = bindAddress === '0.0.0.0' || bindAddress === '::';
  const seen = new Set<string>();
  const result: ConnectionAddress[] = [];

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    for (const entry of addresses ?? []) {
      if (entry.family !== 'IPv4' && entry.family !== 4) continue;
      if (entry.internal || !isPrivateIPv4(entry.address)) continue;
      if (!listensOnAllInterfaces && entry.address !== bindAddress) continue;
      if (seen.has(entry.address)) continue;
      seen.add(entry.address);
      result.push({
        interfaceName,
        address: entry.address,
        url: `http://${entry.address}:${port}/`,
      });
    }
  }

  return result.sort((left, right) =>
    left.interfaceName.localeCompare(right.interfaceName) || left.address.localeCompare(right.address));
}
