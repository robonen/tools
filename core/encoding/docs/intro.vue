<script setup lang="ts">
// Landing hero for @robonen/encoding. Static content only — no live demo,
// so nothing here touches the DOM or runs at setup top-level.
</script>

<template>
  <div class="docs-section">
    <!-- Hero -->
    <div class="prose-docs">
      <h1>@robonen/encoding</h1>
      <p>
        Encoding utilities for TypeScript — a dependency-free QR Code generator
        and the Reed-Solomon error-correction primitives that power it.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Generating a QR Code correctly is deceptively hard: segment-mode selection,
        version sizing, Reed-Solomon ECC over a finite field, block interleaving, and
        the eight masking patterns each have to be just right for a scanner to read the
        result. <code>@robonen/encoding</code> packages all of that into a small set of
        pure functions and immutable classes, with zero runtime dependencies and an
        output you render however you like — SVG, canvas, a DOM grid, or a terminal.
      </p>
    </div>

    <!-- Feature cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">High-level QR in one call</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          <code>encodeText</code> and <code>encodeBinary</code> pick the smallest
          version and optimal segment modes for you, then hand back an immutable
          <code>QrCode</code> grid.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Render-agnostic output</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          A <code>QrCode</code> is just a square of modules. Read each one with
          <code>getModule(x, y)</code> and draw to SVG, canvas, or anything else —
          no rendering opinions baked in.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Standalone Reed-Solomon</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          The GF(2^8) error-correction core — <code>multiply</code>,
          <code>computeDivisor</code>, <code>computeRemainder</code> — is exported
          on its own, reusable beyond QR.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Zero dependencies, fully typed</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Tree-shakeable ESM and CJS builds with no third-party runtime deps, hot
          loops backed by typed arrays, and end-to-end TypeScript types.
        </p>
      </div>
    </div>

    <!-- Install -->
    <div class="prose-docs">
      <h2>Install</h2>
    </div>

    <DocsCode :code="`pnpm add @robonen/encoding`" lang="bash" />

    <!-- Usage -->
    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Encode a string into a <code>QrCode</code> and walk its modules to render
        it. <code>EccMap.M</code> selects the medium (~15% recovery) error-correction
        level; <code>EccMap.L</code>, <code>.Q</code>, and <code>.H</code> are also
        available.
      </p>
    </div>

    <DocsCode lang="ts" :code="quickStart" />

    <div class="prose-docs">
      <p>
        Need raw error-correction codewords without the QR machinery? The
        Reed-Solomon primitives stand on their own:
      </p>
    </div>

    <DocsCode lang="ts" :code="reedSolomon" />

    <!-- Where to next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <ul>
        <li>
          <NuxtLink to="/encoding/encode-text">encodeText</NuxtLink> and
          <NuxtLink to="/encoding/encode-binary">encodeBinary</NuxtLink> — the
          high-level entry points for text and binary payloads.
        </li>
        <li>
          <NuxtLink to="/encoding/encode-segments">encodeSegments</NuxtLink> — the
          mid-level API for mixed-mode payloads and version/mask control.
        </li>
        <li>
          <NuxtLink to="/encoding/qr-code">QrCode</NuxtLink> — the immutable grid,
          with <code>size</code>, <code>getModule</code>, and <code>getType</code>.
        </li>
        <li>
          <NuxtLink to="/encoding/compute-remainder">computeRemainder</NuxtLink> and
          <NuxtLink to="/encoding/compute-divisor">computeDivisor</NuxtLink> — the
          standalone Reed-Solomon core.
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
const quickStart = `import { encodeText, EccMap } from '@robonen/encoding';

// Smallest version + optimal segment modes are chosen automatically.
const qr = encodeText('https://robonen.dev', EccMap.M);

console.log(qr.size); // module count per side (21..177)

// Render however you like — here, plain text:
let out = '';
for (let y = 0; y < qr.size; y++) {
  for (let x = 0; x < qr.size; x++)
    out += qr.getModule(x, y) ? '##' : '  ';
  out += '\\n';
}
console.log(out);`

const reedSolomon = `import { computeDivisor, computeRemainder } from '@robonen/encoding';

// Build a degree-10 generator polynomial over GF(2^8/0x11D)...
const divisor = computeDivisor(10);

// ...then derive the 10 error-correction codewords for your data block.
const data = [0x40, 0xd2, 0x75, 0x47, 0x76, 0x17, 0x32, 0x06, 0x27, 0x26];
const ecc = computeRemainder(data, divisor); // Uint8Array(10)`
</script>
