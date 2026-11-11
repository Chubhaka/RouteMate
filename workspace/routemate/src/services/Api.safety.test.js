import { describe, it, expect } from 'vitest';
import { submitSafetyReport } from './api';

describe('submitSafetyReport threshold with place coordinates', () => {
  it('counts reports for the same place together even when typed differently, and promotes on the 3rd', async () => {
    const coords = { lat: -26.1466, lng: 28.0412 };
    const a = await submitSafetyReport({ type: 'unsafe', location: 'Noord St, Johannesburg', details: '', coords });
    const b = await submitSafetyReport({ type: 'unsafe', location: 'noord street stop', details: '', coords });
    const c = await submitSafetyReport({ type: 'unsafe', location: 'Noord Street', details: '', coords });
    expect(a).toMatchObject({ promoted: false, count: 1, remaining: 2 });
    expect(b).toMatchObject({ promoted: false, count: 2, remaining: 1 });
    expect(c.promoted).toBe(true);
    expect(c.alert.coords).toEqual(coords);
  });

  it('does not merge reports for different places', async () => {
    const one = await submitSafetyReport({ type: 'crowd', location: 'A', details: '', coords: { lat: -26.0, lng: 28.0 } });
    const two = await submitSafetyReport({ type: 'crowd', location: 'B', details: '', coords: { lat: -25.5, lng: 28.5 } });
    expect(one.count).toBe(1);
    expect(two.count).toBe(1);
  });

  it('falls back to case-insensitive text matching when no coordinates exist (offline / free text)', async () => {
    await submitSafetyReport({ type: 'other', location: 'Park Station', details: '' });
    const second = await submitSafetyReport({ type: 'other', location: '  park station ', details: '' });
    expect(second.count).toBe(2);
  });
});