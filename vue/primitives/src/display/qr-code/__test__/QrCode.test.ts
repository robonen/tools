import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { MEDIUM, QrCodeDataType, encodeText } from '@robonen/encoding';
import {
  QrCodeCells,
  QrCodeLogo,
  QrCodeMarker,
  QrCodeMarkers,
  QrCodeRoot,
  cellsPath,
  circlePath,
  markerFramePath,
  markerPlacements,
  roundedRectPath,
} from '../index';

const SVG_NS = 'http://www.w3.org/2000/svg';

function mountQr(rootProps: Record<string, unknown>, children: () => unknown) {
  return mount(defineComponent({
    setup: () => () => h(QrCodeRoot, rootProps, { default: children }),
  }), { attachTo: document.body });
}

describe('qr-code geometry utils', () => {
  it('roundedRectPath emits a sharp rect when all radii are zero', () => {
    const d = roundedRectPath(0, 0, 1, 1, 0, 0, 0, 0);
    expect(d).not.toContain('A');
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('roundedRectPath adds arc commands for non-zero radii', () => {
    expect(roundedRectPath(0, 0, 1, 1, 0.5, 0.5, 0.5, 0.5)).toContain('A');
  });

  it('circlePath produces two arcs centered on the point', () => {
    const d = circlePath(5, 5, 2);
    expect((d.match(/A/g) ?? []).length).toBe(2);
  });

  it('markerPlacements returns the three finder corners for a v1 code', () => {
    const placements = markerPlacements(21);
    expect(placements.map(p => p.corner)).toEqual(['top-left', 'top-right', 'bottom-left']);
    expect(placements.find(p => p.corner === 'top-right')).toMatchObject({ x: 14, y: 0 });
    expect(placements.find(p => p.corner === 'bottom-left')).toMatchObject({ x: 0, y: 14 });
  });

  it('cellsPath excludes finder modules by default and includes them on request', () => {
    const qr = encodeText('hello', MEDIUM);
    const base = { pattern: 'square' as const, radius: 0, gap: 0, isReserved: () => false };
    const withoutMarkers = cellsPath(qr, { ...base, includeMarkers: false });
    const withMarkers = cellsPath(qr, { ...base, includeMarkers: true });
    expect(withMarkers.length).toBeGreaterThan(withoutMarkers.length);
  });

  it('cellsPath skips reserved modules', () => {
    const qr = encodeText('hello world', MEDIUM);
    const base = { pattern: 'square' as const, radius: 0, gap: 0, includeMarkers: true };
    const full = cellsPath(qr, { ...base, isReserved: () => false });
    const knocked = cellsPath(qr, { ...base, isReserved: () => true });
    expect(knocked).toBe('');
    expect(full.length).toBeGreaterThan(0);
  });

  it('markerFramePath uses an annulus (no straight edges) for the circle frame', () => {
    expect(markerFramePath(0, 0, 'circle', 0.5)).toContain('A');
    expect(markerFramePath(0, 0, 'square', 0)).not.toContain('A');
  });
});

describe('QrCodeRoot rendering', () => {
  it('renders an SVG element in the SVG namespace with a viewBox', () => {
    const w = mountQr({ value: 'hello' }, () => h(QrCodeCells));
    const svg = w.element as unknown as SVGSVGElement;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.namespaceURI).toBe(SVG_NS);
    // default margin 4, v1 size 21 → 4 + 21 + 4 = 29
    expect(svg.getAttribute('viewBox')).toBe('-4 -4 29 29');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('data-qr-size')).toBe('21');
    w.unmount();
  });

  it('renders cells as a namespaced <path> with a non-empty d', () => {
    const w = mountQr({ value: 'hello' }, () => h(QrCodeCells));
    const path = w.element.querySelector('[data-qr-cells]') as SVGPathElement;
    expect(path).toBeTruthy();
    expect(path.namespaceURI).toBe(SVG_NS);
    expect(path.getAttribute('d')!.length).toBeGreaterThan(0);
    w.unmount();
  });

  it('square and dot patterns produce different geometry', () => {
    const sq = mountQr({ value: 'pattern' }, () => h(QrCodeCells, { pattern: 'square' }));
    const dot = mountQr({ value: 'pattern' }, () => h(QrCodeCells, { pattern: 'dot' }));
    const sqD = sq.element.querySelector('[data-qr-cells]')!.getAttribute('d')!;
    const dotD = dot.element.querySelector('[data-qr-cells]')!.getAttribute('d')!;
    expect(sqD).not.toBe(dotD);
    expect(sqD).not.toContain('A');
    expect(dotD).toContain('A');
    sq.unmount();
    dot.unmount();
  });
});

describe('QrCodeMarkers', () => {
  it('renders three finder groups, each with a frame and a ball', () => {
    const w = mountQr({ value: 'markers' }, () => [
      h(QrCodeCells),
      h(QrCodeMarkers, { frame: 'rounded', ball: 'circle' }),
    ]);
    expect(w.element.querySelectorAll('[data-qr-marker]').length).toBe(3);
    expect(w.element.querySelectorAll('[data-qr-marker-frame]').length).toBe(3);
    expect(w.element.querySelectorAll('[data-qr-marker-ball]').length).toBe(3);
    w.unmount();
  });

  it('a single QrCodemarker resolves its corner placement and tags it', () => {
    const w = mountQr({ value: 'corner' }, () => h(QrCodeMarker, { corner: 'top-right' }));
    const g = w.element.querySelector('[data-qr-marker]')!;
    expect(g.getAttribute('data-corner')).toBe('top-right');
    expect(g.querySelector('[data-qr-marker-frame]')).toBeTruthy();
    w.unmount();
  });
});

describe('QrCodeLogo', () => {
  it('renders an <image> for src and knocks out the modules behind it', async () => {
    const withLogo = mountQr({ value: 'logo knockout test value', errorCorrection: 'H' }, () => [
      h(QrCodeCells, { includeMarkers: true }),
      h(QrCodeLogo, { src: 'data:image/png;base64,iVBORw0KGgo=', size: 0.3 }),
    ]);
    const without = mountQr({ value: 'logo knockout test value', errorCorrection: 'H' }, () =>
      h(QrCodeCells, { includeMarkers: true }),
    );
    // The logo reserves its region on mount, which invalidates the cells path
    // reactively — flush the resulting re-render before reading the DOM.
    await nextTick();

    const img = withLogo.element.querySelector('[data-qr-logo] image') as SVGImageElement;
    expect(img).toBeTruthy();
    expect(img.namespaceURI).toBe(SVG_NS);
    expect(img.getAttribute('href')).toContain('data:image/png');

    const knockedD = withLogo.element.querySelector('[data-qr-cells]')!.getAttribute('d')!;
    const fullD = without.element.querySelector('[data-qr-cells]')!.getAttribute('d')!;
    expect(knockedD.length).toBeLessThan(fullD.length);

    withLogo.unmount();
    without.unmount();
  });

  it('does not knock out modules when knockout is disabled', async () => {
    const off = mountQr({ value: 'logo knockout test value', errorCorrection: 'H' }, () => [
      h(QrCodeCells, { includeMarkers: true }),
      h(QrCodeLogo, { size: 0.3, knockout: false }),
    ]);
    const without = mountQr({ value: 'logo knockout test value', errorCorrection: 'H' }, () =>
      h(QrCodeCells, { includeMarkers: true }),
    );
    await nextTick();
    expect(off.element.querySelector('[data-qr-cells]')!.getAttribute('d'))
      .toBe(without.element.querySelector('[data-qr-cells]')!.getAttribute('d'));
    off.unmount();
    without.unmount();
  });
});

describe('custom #cell slot', () => {
  it('renders one slotted node per dark data module with its type', () => {
    const qr = encodeText('slot', MEDIUM);
    let dataModules = 0;
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y) && qr.getType(x, y) !== QrCodeDataType.Position)
          dataModules++;
      }
    }

    const w = mountQr({ value: 'slot' }, () => h(QrCodeCells, null, {
      cell: (slotProps: { cx: number; cy: number }) =>
        h('circle', { cx: slotProps.cx, cy: slotProps.cy, r: 0.4, class: 'slotted' }),
    }));

    expect(w.element.querySelectorAll('circle.slotted').length).toBe(dataModules);
    w.unmount();
  });
});
