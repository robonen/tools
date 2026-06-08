<script setup lang="ts">
import { ref } from 'vue';
import { createReusableTemplate } from './index';

interface Member {
  name: string;
  role: string;
  online: boolean;
}

// Define a stat card template once, reuse it for every metric below.
const [DefineStat, ReuseStat] = createReusableTemplate<{ label: string; value: string }>();

// Object form + typed bindings for a richer row template.
const { define: DefineMember, reuse: ReuseMember } = createReusableTemplate<Member>();

const team = ref<Member[]>([
  { name: 'Ada Lovelace', role: 'Engineering', online: true },
  { name: 'Grace Hopper', role: 'Design', online: false },
  { name: 'Alan Turing', role: 'Research', online: true },
]);

function toggle(member: Member) {
  member.online = !member.online;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <!-- Templates are captured here, rendered wherever Reuse* appears -->
    <DefineStat v-slot="{ label, value }">
      <div class="flex-1 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          {{ label }}
        </div>
        <div class="mt-1 font-mono text-2xl font-bold tabular-nums text-(--fg)">
          {{ value }}
        </div>
      </div>
    </DefineStat>

    <DefineMember v-slot="{ name, role, online }">
      <div class="flex items-center gap-3">
        <span
          class="inline-block size-2 shrink-0 rounded-full transition"
          :class="online ? 'bg-emerald-500' : 'bg-(--border-strong)'"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-(--fg)">{{ name }}</div>
          <div class="text-xs text-(--fg-subtle)">{{ role }}</div>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          {{ online ? 'Online' : 'Away' }}
        </span>
      </div>
    </DefineMember>

    <div class="flex gap-2">
      <ReuseStat label="Members" :value="String(team.length)" />
      <ReuseStat label="Online" :value="String(team.filter(m => m.online).length)" />
    </div>

    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Team — click a row to toggle status
      </div>
      <button
        v-for="member in team"
        :key="member.name"
        class="rounded-lg p-2 text-left transition hover:bg-(--bg-inset) active:scale-[0.99] cursor-pointer"
        @click="toggle(member)"
      >
        <ReuseMember
          :name="member.name"
          :role="member.role"
          :online="member.online"
        />
      </button>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Both card and row markup are declared once via <code class="font-mono">DefineTemplate</code> and
      rendered from multiple <code class="font-mono">ReuseTemplate</code> call sites.
    </p>
  </div>
</template>
