import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { Camera, Lens } from '../types';
import { CAMERAS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import { cameraToFacet, lensToFacet, facetToItem, libraryIdFor, proposalCore } from '../library/facet';
import { emptyCache, mergeSync, readCache } from '../library/sync';
import type { SyncDevice, SyncResponse } from '../utils/deviceLibraryClient';

// ---------------------------------------------------------------------------
// Geraetebibliothek (devices.zumpelars.de): das multicam-Facet hin und
// zurueck, der inkrementelle Abgleich und die Vorgabe-Adresse.
// ---------------------------------------------------------------------------

const fx9 = CAMERAS.find((c) => c.id === 'sony-fx9')!;
const ua107 = LENSES.find((l) => l.id === 'fuj-ua107x8.4')!;

const eigeneKamera: Camera = {
  ...fx9,
  id: 'custom-cam-1726000000000',
  model: 'PXW-FX9 (eigene)',
  specSource: { 'sensor.widthMm': { value: '35.7', source: 'Datenblatt S. 4' } },
};
const eigeneOptik: Lens = { ...ua107, id: 'custom-lens-1', isCustom: true };

const geraet = (slug: string, seq: number, facet: Record<string, unknown> | null, extra: Partial<SyncDevice> = {}): SyncDevice => ({
  slug,
  version: 1,
  seq,
  removed: false,
  status: 'confirmed',
  confirmations: 2,
  core: { manufacturer: 'Sony', model: 'X', category: 'Camera', sourceUrl: 'https://example.com/datasheet.pdf' },
  facet,
  ...extra,
});

const antwort = (latestSeq: number, devices: SyncDevice[]): SyncResponse => ({
  format: 'avplan-device-sync',
  version: 1,
  planner: 'multicam',
  latestSeq,
  devices,
});

describe('facet mapping', () => {
  it('camera → facet → camera keeps the native entry, only the id changes', () => {
    const facet = cameraToFacet(eigeneKamera);
    expect(facet.kind).toBe('camera');
    expect('id' in (facet as { camera: object }).camera).toBe(false);
    const back = facetToItem({ slug: 'sony-pxw-fx9', facet: JSON.parse(JSON.stringify(facet)), core: geraet('s', 1, null).core });
    expect(back).toEqual({ kind: 'camera', camera: { ...eigeneKamera, id: libraryIdFor('sony-pxw-fx9') } });
  });

  it('keeps deviceTypeId, notes, sensor modes and datasheet sources (nested, so the server does not strip notes)', () => {
    const facet = cameraToFacet(eigeneKamera) as unknown as { camera: Camera };
    expect(facet.camera.deviceTypeId).toBe(fx9.deviceTypeId);
    expect(facet.camera.notes).toBe(fx9.notes);
    expect(facet.camera.sensorModes).toEqual(fx9.sensorModes);
    expect(facet.camera.specSource).toEqual(eigeneKamera.specSource);
  });

  it('lens → facet → lens drops id and isCustom and comes back read-only', () => {
    const facet = lensToFacet(eigeneOptik) as { lens: Record<string, unknown> };
    expect(facet.lens.id).toBeUndefined();
    expect(facet.lens.isCustom).toBeUndefined();
    const back = facetToItem({ slug: 'fujinon-ua107', facet: { kind: 'lens', version: 1, lens: facet.lens }, core: geraet('s', 1, null).core });
    expect(back).toEqual({ kind: 'lens', lens: { ...ua107, id: 'devlib-fujinon-ua107', isCustom: false } });
  });

  it('takes the datasheet link from the core when the facet has none', () => {
    const { manufacturerUrl: _u, ...ohne } = eigeneKamera;
    const back = facetToItem({ slug: 'a', facet: cameraToFacet(ohne as Camera), core: geraet('a', 1, null).core });
    expect(back?.kind === 'camera' && back.camera.manufacturerUrl).toBe('https://example.com/datasheet.pdf');
  });

  it('proposal core: category from kind, required datasheet link', () => {
    expect(proposalCore({ kind: 'lens', lens: eigeneOptik }, ' https://x.example/ds.pdf ')).toEqual({
      manufacturer: 'Fujinon',
      model: 'UA107x8.4BESM',
      category: 'Lens',
      sourceUrl: 'https://x.example/ds.pdf',
      description: 'Box lens 107x, 4K Premier',
    });
  });

  it('rejects what the planner would not take from a project file either', () => {
    const core = geraet('x', 1, null).core;
    expect(facetToItem({ slug: 'x', facet: null, core })).toBeNull();
    expect(facetToItem({ slug: 'x', facet: { kind: 'camera', camera: { manufacturer: 'A', model: 'B', mount: 'E' } }, core })).toBeNull();
    expect(facetToItem({ slug: 'x', facet: { kind: 'lens', lens: { ...ua107, focalLengthMin: 0 } }, core })).toBeNull();
    expect(facetToItem({ slug: 'x', facet: { kind: 'tripod', tripod: {} }, core })).toBeNull();
    // Ein flaches Objekt ohne `kind` ist nicht das multicam-Format.
    expect(facetToItem({ slug: 'x', facet: { ...fx9 }, core })).toBeNull();
  });
});

describe('sync merge', () => {
  const kamera = cameraToFacet(eigeneKamera);
  const optik = lensToFacet(eigeneOptik);

  it('adds, updates and advances latestSeq', () => {
    const a = mergeSync(emptyCache('https://s'), antwort(2, [geraet('cam', 1, kamera), geraet('lens', 2, optik)]));
    expect(a.stats).toEqual({ added: 2, updated: 0, removed: 0, invalid: 0 });
    expect(a.cache.latestSeq).toBe(2);
    const b = mergeSync(a.cache, antwort(5, [geraet('cam', 5, kamera, { version: 2, status: 'verified', confirmations: 7 })]));
    expect(b.stats).toEqual({ added: 0, updated: 1, removed: 0, invalid: 0 });
    expect(b.cache.entries).toHaveLength(2);
    expect(b.cache.entries.find((e) => e.slug === 'cam')).toMatchObject({ version: 2, status: 'verified', confirmations: 7 });
    expect(b.cache.latestSeq).toBe(5);
  });

  it('removed takes the entry out', () => {
    const a = mergeSync(emptyCache('https://s'), antwort(1, [geraet('cam', 1, kamera)]));
    const b = mergeSync(a.cache, antwort(3, [geraet('cam', 3, null, { removed: true })]));
    expect(b.stats.removed).toBe(1);
    expect(b.cache.entries).toEqual([]);
    expect(b.cache.latestSeq).toBe(3);
  });

  it('skips and counts invalid facets; an invalid new version drops the old one', () => {
    const a = mergeSync(emptyCache('https://s'), antwort(1, [geraet('cam', 1, kamera)]));
    const b = mergeSync(a.cache, antwort(4, [geraet('cam', 3, { kind: 'camera', camera: {} }), geraet('neu', 4, { foo: 1 })]));
    expect(b.stats).toEqual({ added: 0, updated: 0, removed: 0, invalid: 2 });
    expect(b.cache.entries).toEqual([]);
    expect(b.cache.latestSeq).toBe(4);
  });

  it('a cache of another server is not reused', () => {
    const a = mergeSync(emptyCache('https://a'), antwort(1, [geraet('cam', 1, kamera)]));
    expect(readCache(a.cache, 'https://a').entries).toHaveLength(1);
    expect(readCache(a.cache, 'https://b')).toEqual(emptyCache('https://b'));
    expect(readCache('kaputt', 'https://b')).toEqual(emptyCache('https://b'));
  });
});

describe('store against a mocked server', () => {
  const speicher: Record<string, string> = {};
  const fetchMock = vi.fn();

  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in speicher ? speicher[k] : null),
      setItem: (k: string, v: string) => {
        speicher[k] = String(v);
      },
      removeItem: (k: string) => {
        delete speicher[k];
      },
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => {
    for (const k of Object.keys(speicher)) delete speicher[k];
    fetchMock.mockReset();
    vi.resetModules();
  });

  const json = (body: unknown, headers: Record<string, string> = {}, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

  it('without a setting every build talks to https://devices.zumpelars.de', async () => {
    const { loadServer, useDeviceLibrary } = await import('../library/store');
    const { DEFAULT_DEVICE_LIBRARY_URL } = await import('../utils/deviceLibraryClient');
    expect(DEFAULT_DEVICE_LIBRARY_URL).toBe('https://devices.zumpelars.de');
    expect(loadServer()).toBe('https://devices.zumpelars.de');
    expect(useDeviceLibrary.getState().server).toBe('https://devices.zumpelars.de');
  });

  it('signs in, syncs incrementally and puts library cameras into the catalog', async () => {
    const user = { id: 'u1', email: 'a@b.de', username: 'lars', emailVerified: true };
    fetchMock
      .mockResolvedValueOnce(json({ user }, { 'set-auth-token': 'TOKEN-123' }))
      .mockResolvedValueOnce(json(antwort(7, [geraet('sony-fx9-lib', 7, cameraToFacet(eigeneKamera)), geraet('kaputt', 6, { kind: 'lens' })])))
      .mockResolvedValueOnce(json(antwort(9, [geraet('sony-fx9-lib', 9, null, { removed: true })])));

    const { useDeviceLibrary } = await import('../library/store');
    const { getCameraById } = await import('../data/cameras');
    await useDeviceLibrary.getState().signIn('a@b.de', 'geheim');

    expect(fetchMock.mock.calls[0][0]).toBe('https://devices.zumpelars.de/api/auth/sign-in/email');
    expect(fetchMock.mock.calls[1][0]).toBe('https://devices.zumpelars.de/api/sync?planner=multicam&after=0');
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({ authorization: 'Bearer TOKEN-123' });

    const s = useDeviceLibrary.getState();
    expect(s.signedIn).toBe(true);
    expect(s.lastSync?.stats).toEqual({ added: 1, updated: 0, removed: 0, invalid: 1 });
    expect(getCameraById('devlib-sony-fx9-lib')?.model).toBe('PXW-FX9 (eigene)');
    // Das Token steht nie im Zustand und nie im Cache.
    expect(JSON.stringify(s)).not.toContain('TOKEN-123');
    expect(speicher['multicam-device-library-cache']).not.toContain('TOKEN-123');

    await useDeviceLibrary.getState().syncNow();
    expect(fetchMock.mock.calls[2][0]).toBe('https://devices.zumpelars.de/api/sync?planner=multicam&after=7');
    expect(getCameraById('devlib-sony-fx9-lib')).toBeUndefined();
    expect(JSON.parse(speicher['multicam-device-library-cache']).latestSeq).toBe(9);
  });

  it('second factor: challenge header goes back with the code', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ twoFactorRedirect: true }, { 'x-auth-challenge': 'CH' }))
      .mockResolvedValueOnce(json({ user: { id: 'u', email: 'a@b.de', username: 'l' } }, { 'set-auth-token': 'T' }))
      .mockResolvedValueOnce(json(antwort(0, [])));
    const { useDeviceLibrary } = await import('../library/store');
    await useDeviceLibrary.getState().signIn('lars', 'pw');
    expect(fetchMock.mock.calls[0][0]).toBe('https://devices.zumpelars.de/api/auth/sign-in/username');
    expect(useDeviceLibrary.getState().phase).toBe('second-factor');
    await useDeviceLibrary.getState().verifyCode('123 456');
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({ 'x-auth-challenge': 'CH' });
    expect(useDeviceLibrary.getState().signedIn).toBe(true);
  });

  it('proposes the native entry as the multicam facet', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ user: { id: 'u', email: 'a@b.de', username: 'l' } }, { 'set-auth-token': 'T' }))
      .mockResolvedValueOnce(json(antwort(0, [])))
      .mockResolvedValueOnce(json({ slug: 'sony-pxw-fx9', state: 'pending' }));
    const { useDeviceLibrary } = await import('../library/store');
    await useDeviceLibrary.getState().signIn('a@b.de', 'pw');
    const r = await useDeviceLibrary.getState().propose({ kind: 'camera', camera: eigeneKamera }, 'https://pro.sony/fx9.pdf');
    expect(r.slug).toBe('sony-pxw-fx9');
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(url).toBe('https://devices.zumpelars.de/api/proposals');
    const body = JSON.parse(String(init.body));
    expect(body.data).toMatchObject({ manufacturer: 'Sony', category: 'Camera', sourceUrl: 'https://pro.sony/fx9.pdf' });
    expect(body.data.planners.multicam).toEqual(JSON.parse(JSON.stringify(cameraToFacet(eigeneKamera))));
  });

  it('409 on proposal is `exists`, guidelines-outdated keeps the sign-in', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ user: { id: 'u', email: 'a@b.de', username: 'l' } }, { 'set-auth-token': 'T' }))
      .mockResolvedValueOnce(json(antwort(0, [])))
      .mockResolvedValueOnce(json({ error: 'exists' }, {}, 409))
      .mockResolvedValueOnce(json({ error: 'guidelines-outdated' }, {}, 403));
    const { useDeviceLibrary } = await import('../library/store');
    const { libraryErrorText } = await import('../library/messages');
    const messageText = (c: 'exists' | 'guidelines-outdated') => libraryErrorText((_k, en) => en, c);
    await useDeviceLibrary.getState().signIn('a@b.de', 'pw');
    const item = { kind: 'camera' as const, camera: eigeneKamera };
    await expect(useDeviceLibrary.getState().propose(item, 'https://x.example/a.pdf')).rejects.toMatchObject({ code: 'exists', status: 409 });
    await expect(useDeviceLibrary.getState().propose(item, 'https://x.example/a.pdf')).rejects.toMatchObject({ code: 'guidelines-outdated' });
    expect(useDeviceLibrary.getState().signedIn).toBe(true);
    expect(messageText('exists')).toMatch(/already in the library/);
    expect(messageText('guidelines-outdated')).toMatch(/guidelines/);
  });

  it('a changed server forgets the token and the cache; bad addresses are refused', async () => {
    const { useDeviceLibrary, normaliseServerUrl } = await import('../library/store');
    expect(normaliseServerUrl('http://devices.example.com')).toBeNull();
    expect(normaliseServerUrl('http://localhost:8080/')).toBe('http://localhost:8080');
    expect(normaliseServerUrl('https://devices.example.com///')).toBe('https://devices.example.com');
    expect(await useDeviceLibrary.getState().setServer('ftp://x')).toBe(false);
    expect(await useDeviceLibrary.getState().setServer('https://devices.example.com')).toBe(true);
    expect(useDeviceLibrary.getState().server).toBe('https://devices.example.com');
    expect(useDeviceLibrary.getState().signedIn).toBe(false);
    expect(JSON.parse(speicher['multicam-device-library-server'])).toBe('https://devices.example.com');
    await useDeviceLibrary.getState().setServer('https://devices.zumpelars.de');
    expect(JSON.parse(speicher['multicam-device-library-server'])).toBeNull();
  });

  it('guidelines link follows the server address', async () => {
    const { guidelinesUrl } = await import('../library/messages');
    expect(guidelinesUrl('https://devices.zumpelars.de')).toBe('https://devices.zumpelars.de/guidelines');
    expect(guidelinesUrl('http://localhost:8080/')).toBe('http://localhost:8080/guidelines');
  });
});
