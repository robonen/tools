import { describe, expect, it } from 'vitest';
import { createNode, createSlice, nodeInline, nodeText } from '../model';
import { createDefaultRegistry } from '../preset';
import { isStructureless, parseHtmlSlice, parseJsonSlice, parseTextSlice, readSlice, serializeSlice, writeSlice } from '../view/clipboard';

const registry = createDefaultRegistry();
const types = (slice: { blocks: ReadonlyArray<{ type: string }> }) => slice.blocks.map(block => block.type);
const texts = (slice: { blocks: ReadonlyArray<Parameters<typeof nodeText>[0]> }) => slice.blocks.map(nodeText);

describe('parseHtmlSlice', () => {
  it('reads Google Docs markup: a normal-weight <b> wrapper and styled spans', () => {
    const html = '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">'
      + '<p dir="ltr" style="line-height:1.38;"><span style="font-size:11pt;font-family:Arial;">Plain </span>'
      + '<span style="font-weight:700;">bold</span><span style="font-style:italic;"> italic</span></p>'
      + '<p dir="ltr"><span style="text-decoration:underline;">under</span></p></b>';
    const slice = parseHtmlSlice(html, registry);

    expect(types(slice)).toEqual(['paragraph', 'paragraph']);
    expect(nodeInline(slice.blocks[0]!)).toEqual([
      { text: 'Plain ', marks: [] },
      { text: 'bold', marks: [{ type: 'bold' }] },
      { text: ' italic', marks: [{ type: 'italic' }] },
    ]);
    expect(nodeInline(slice.blocks[1]!)).toEqual([{ text: 'under', marks: [{ type: 'underline' }] }]);
  });

  it('maps headings, quotes, lists and rules onto registered blocks', () => {
    const html = '<h2>Title</h2><blockquote><p>one</p><p>two</p></blockquote>'
      + '<ul><li>a<ul><li>nested</li></ul></li><li><p>b</p></li></ul><ol><li>first</li></ol><hr><pre>  x\n y</pre>';
    const slice = parseHtmlSlice(html, registry);

    expect(types(slice)).toEqual([
      'heading', 'blockquote', 'blockquote',
      'bulleted-list', 'bulleted-list', 'bulleted-list', 'numbered-list',
      'divider', 'code-block',
    ]);
    expect(slice.blocks[0]!.attrs).toEqual({ level: 2 });
    expect(texts(slice).slice(1, 3)).toEqual(['one', 'two']);
    expect(slice.blocks[4]!.attrs).toEqual({ indent: 1 });
    expect(nodeText(slice.blocks[4]!)).toBe('nested');
    expect(nodeText(slice.blocks[8]!)).toBe('  x\n y');
  });

  it('collapses whitespace like a browser and keeps it inside white-space: pre', () => {
    const slice = parseHtmlSlice('<p>  a \n\n b&nbsp;&nbsp;c <br> d  </p><div style="white-space: pre;"><div>  indented</div></div>', registry);
    expect(texts(slice)).toEqual(['a b c\nd', '  indented']);
  });

  it('never keeps the source markup, styles, scripts or unsafe links', () => {
    const slice = parseHtmlSlice(
      '<div style="white-space:pre;font-family:Menlo"><script>alert(1)</script><span style="color:red">x</span>'
      + ' <a href="javascript:alert(1)">bad</a> <a href="https://a.b/c">good</a><img src="x" onerror="alert(1)"></div>',
      registry,
    );
    expect(types(slice)).toEqual(['paragraph', 'image']);
    expect(nodeInline(slice.blocks[0]!)).toEqual([
      { text: 'x bad ', marks: [] },
      { text: 'good', marks: [{ type: 'link', attrs: { href: 'https://a.b/c', target: '_blank' } }] },
    ]);
    expect(slice.blocks[1]!.attrs).toEqual({ src: 'x', alt: '', caption: '' });
  });

  it('drops blank lines and treats a lone paragraph as inline', () => {
    const slice = parseHtmlSlice('<p><br></p><p>only</p><p>\n</p>', registry);
    expect(texts(slice)).toEqual(['only']);
    expect(slice.openStart && slice.openEnd).toBe(true);
  });

  it('tells structureless markup from real structure', () => {
    expect(isStructureless(parseHtmlSlice('<div><div>a</div><div>b</div></div>', registry), registry)).toBe(true);
    expect(isStructureless(parseHtmlSlice('<div>a <b>b</b></div>', registry), registry)).toBe(false);
    expect(isStructureless(parseHtmlSlice('<h1>a</h1>', registry), registry)).toBe(false);
  });
});

describe('parseTextSlice', () => {
  it('turns markdown-style lines into blocks through the input rules', () => {
    const slice = parseTextSlice('## Title\n\n- one\n* two\n1. first\n> quoted\n---\nplain\n```ts\nconst x = 1;\n\nreturn x;\n```', registry);
    expect(types(slice)).toEqual(['heading', 'bulleted-list', 'bulleted-list', 'numbered-list', 'blockquote', 'divider', 'paragraph', 'code-block']);
    expect(slice.blocks[0]!.attrs).toEqual({ level: 2 });
    expect(texts(slice)).toEqual(['Title', 'one', 'two', 'first', 'quoted', '', 'plain', 'const x = 1;\n\nreturn x;']);
    expect(slice.blocks[7]!.attrs).toEqual({ language: 'ts' });
  });

  it('a single line is inline; several lines are open at both ends', () => {
    expect(parseTextSlice('just words', registry)).toMatchObject({ openStart: true, openEnd: true });
    const multi = parseTextSlice('a\nb', registry);
    expect(multi.blocks).toHaveLength(2);
    expect(multi.openStart && multi.openEnd).toBe(true);
  });

  it('a marker that is not a marker stays text', () => {
    expect(texts(parseTextSlice('#hashtag', registry))).toEqual(['#hashtag']);
    expect(types(parseTextSlice('--- not a rule', registry))).toEqual(['paragraph']);
  });
});

describe('serialize ↔ parse', () => {
  it('round-trips marks with attrs through the writekit format', () => {
    const slice = createSlice([
      createNode('heading', { id: 'h', attrs: { level: 3 }, content: [{ text: 'T', marks: [] }] }),
      createNode('paragraph', { id: 'p', content: [{ text: 'link', marks: [{ type: 'link', attrs: { href: 'https://x.y', target: '_self' } }] }] }),
      createNode('divider', { id: 'd' }),
    ], true, false);
    const { html, text, json } = serializeSlice(slice, registry);

    expect(html).toBe('<h3>T</h3><p><a href="https://x.y" target="_self" rel="noopener noreferrer" data-mark="link">link</a></p><hr>');
    expect(text).toBe('T\nlink');

    const back = parseJsonSlice(json, registry)!;
    expect(back.openStart).toBe(true);
    expect(back.blocks.map(block => block.type)).toEqual(['heading', 'paragraph', 'divider']);
    expect(nodeInline(back.blocks[1]!)).toEqual(nodeInline(slice.blocks[1]!));
    expect(back.blocks.map(block => block.id)).not.toContain('p'); // fresh ids on the way back
  });

  it('rejects malformed json quietly', () => {
    expect(parseJsonSlice('{', registry)).toBeNull();
    expect(parseJsonSlice('{"blocks":[{"nope":1}]}', registry)).toBeNull();
  });
});

describe('readSlice', () => {
  /** jsdom has no `DataTransfer`; the reader only ever calls these two. */
  function transfer(entries: Record<string, string>): DataTransfer {
    const store = new Map(Object.entries(entries));
    return {
      getData: (type: string) => store.get(type) ?? '',
      setData: (type: string, value: string) => void store.set(type, value),
    } as unknown as DataTransfer;
  }

  it('prefers the writekit format, then html, then text', () => {
    const own = transfer({ 'text/plain': 'x', 'text/html': '<p>x</p>' });
    writeSlice(own, createSlice([createNode('blockquote', { content: [{ text: 'q', marks: [] }] })]), registry);
    expect(types(readSlice(own, registry)!)).toEqual(['blockquote']);

    expect(types(readSlice(transfer({ 'text/plain': 'x', 'text/html': '<h1>x</h1>' }), registry)!)).toEqual(['heading']);
    expect(types(readSlice(transfer({ 'text/plain': '# x' }), registry)!)).toEqual(['heading']);
  });

  it('lets the text win over structureless html, so a code editor paste keeps its markdown', () => {
    const data = transfer({
      'text/html': '<div style="white-space:pre;"><div><span style="color:#569cd6">## Title</span></div><div>- item</div></div>',
      'text/plain': '## Title\n- item',
    });
    expect(types(readSlice(data, registry)!)).toEqual(['heading', 'bulleted-list']);
  });

  it('honours plain mode and returns null for nothing', () => {
    const data = transfer({ 'text/html': '<h1>x</h1>', 'text/plain': 'x' });
    expect(types(readSlice(data, registry, { plain: true })!)).toEqual(['paragraph']);
    expect(readSlice(transfer({}), registry)).toBeNull();
  });
});
