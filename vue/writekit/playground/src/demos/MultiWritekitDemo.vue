<script setup lang="ts">
import { WritekitRoot } from '@writekit';
import { h, makeWritekit, p } from '../lib';
import Toolbar from '../Toolbar.vue';

const left = makeWritekit([h(2, 'Writekit A'), p('Type and select here.')]);
const right = makeWritekit([h(2, 'Writekit B'), p('This writekit is fully independent.')]);
</script>

<template>
  <section>
    <h2>Multiple writekits</h2>
    <p class="hint">Two independent writekits on one page — selection and editing in one must never affect the other.</p>
    <div class="cols">
      <div>
        <Toolbar :writekit="left" />
        <WritekitRoot :writekit="left" class="writekit" />
      </div>
      <div>
        <Toolbar :writekit="right" />
        <WritekitRoot :writekit="right" class="writekit" />
      </div>
    </div>
  </section>
</template>
