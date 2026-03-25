# @robonen/renovate

Shared [Renovate](https://docs.renovatebot.com/) configuration preset.

## Usage

Reference it in your `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>robonen/tools//infra/renovate/default.json"]
}
```

## What's Included

- Extends `config:base` and `group:allNonMajor`
- Semantic commit type: `chore`
- Range strategy: `bump`
- Auto-approves & auto-merges minor, patch, pin, and digest updates (scheduled 1–3 AM)