import { describe, expect, it } from 'vitest';
import { getServerStartupUrls, listLanConnectionAddresses } from '../src/web/connection-info';

const interfaces = {
  Ethernet: [
    { address: '192.168.0.102', family: 'IPv4', internal: false },
    { address: '127.0.0.1', family: 'IPv4', internal: false },
    { address: '169.254.1.2', family: 'IPv4', internal: false },
    { address: '8.8.8.8', family: 'IPv4', internal: false },
    { address: 'fd00::1', family: 'IPv6', internal: false },
  ],
  WiFi: [
    { address: '10.0.0.15', family: 'IPv4', internal: false },
    { address: '172.20.1.10', family: 'IPv4', internal: false },
  ],
};

describe('адреса подключения по локальной сети', () => {
  it('формирует ссылку для этого компьютера и ссылки частных сетевых интерфейсов', () => {
    expect(getServerStartupUrls('0.0.0.0', 3456, interfaces)).toEqual({
      localUrl: 'http://localhost:3456/',
      lanAddresses: [
        { interfaceName: 'Ethernet', address: '192.168.0.102', url: 'http://192.168.0.102:3456/' },
        { interfaceName: 'WiFi', address: '10.0.0.15', url: 'http://10.0.0.15:3456/' },
        { interfaceName: 'WiFi', address: '172.20.1.10', url: 'http://172.20.1.10:3456/' },
      ],
    });
    expect(getServerStartupUrls('127.0.0.1', 3000, interfaces)).toEqual({
      localUrl: 'http://localhost:3000/',
      lanAddresses: [],
    });
    expect(getServerStartupUrls('192.168.0.102', 3000, interfaces).localUrl)
      .toBe('http://192.168.0.102:3000/');
  });

  it('показывает частные IPv4-адреса всех интерфейсов с фактическим портом', () => {
    const addresses = listLanConnectionAddresses('0.0.0.0', 3456, interfaces);

    expect(addresses).toHaveLength(3);
    expect(addresses).toEqual(expect.arrayContaining([
      { interfaceName: 'Ethernet', address: '192.168.0.102', url: 'http://192.168.0.102:3456/' },
      { interfaceName: 'WiFi', address: '10.0.0.15', url: 'http://10.0.0.15:3456/' },
      { interfaceName: 'WiFi', address: '172.20.1.10', url: 'http://172.20.1.10:3456/' },
    ]));
  });

  it('не показывает интерфейсы, на которых сервер не слушает', () => {
    expect(listLanConnectionAddresses('192.168.0.102', 3000, interfaces))
      .toEqual([{
        interfaceName: 'Ethernet',
        address: '192.168.0.102',
        url: 'http://192.168.0.102:3000/',
      }]);
    expect(listLanConnectionAddresses('127.0.0.1', 3000, interfaces)).toEqual([]);
  });
});
