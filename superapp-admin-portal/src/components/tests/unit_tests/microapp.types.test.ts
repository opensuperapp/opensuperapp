import { describe, it, expect } from '@jest/globals';
import type { MicroApp, MicroAppVersion, MicroAppRole } from '../../../types/microapp.types';

describe('MicroApp types (runtime shape check)', () => {
  it('should accept a valid MicroApp-shaped object', () => {
    const version: MicroAppVersion = {
      version: '1.0.0',
      build: 1,
      releaseNotes: 'Initial release',
      iconUrl: '/icons/app.png',
      downloadUrl: 'https://cdn.example.com/app-1.0.0.apk',
    };

    const role: MicroAppRole = { role: 'admin' };

    const app: MicroApp = {
      appId: 'calendar',
      name: 'Calendar',
      description: 'Org calendar app',
      promoText: 'Stay up to date',
      iconUrl: '/icons/calendar.png',
      bannerImageUrl: '/banners/calendar.png',
      isMandatory: 0,
      versions: [version],
      roles: [role],
    };

    // Basic runtime assertions to catch accidental field changes
    expect(app).toHaveProperty('appId', 'calendar');
    expect(app.versions).toHaveLength(1);
    expect(app.roles[0]).toEqual({ role: 'admin' });
    expect(typeof app.isMandatory).toBe('number');
    expect(app.iconUrl).toContain('/icons/');
  });
});
