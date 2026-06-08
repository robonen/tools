# Docs MCP server

An [MCP](https://modelcontextprotocol.io) server that exposes the `@robonen/tools`
documentation to any MCP client (Claude Code, Claude Desktop, Cursor, …).

It is **served by the Nuxt/Nitro docs server itself** — there is no separate
process. The documentation metadata is the same data that renders the docs site
(produced by [`../extractor`](../extractor) at build time and injected into Nitro
as the `#docs/server-metadata` virtual), so what an agent reads is always in sync
with the site.

## Run

Start the docs server, and the MCP endpoint comes up with it:

```sh
pnpm docs:dev      # → http://localhost:3000, MCP at http://localhost:3000/mcp
```

`POST /mcp` speaks the MCP **Streamable HTTP** transport (stateless, JSON
responses). The route lives at [`../../server/routes/mcp.post.ts`](../../server/routes/mcp.post.ts).

## Register with a client

A project-scoped [`.mcp.json`](../../../.mcp.json) at the repo root already points
Claude Code at the endpoint — start the docs server, then approve the
`robonen-docs` server:

```json
{
  "mcpServers": {
    "robonen-docs": { "type": "http", "url": "http://localhost:3000/mcp" }
  }
}
```

## Tools

| Tool            | Arguments                       | Returns                                                                 |
| --------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `list_packages` | —                               | Every documented package grouped by core / vue / configs / infra.       |
| `search_docs`   | `query`, `limit?`               | Ranked `package/slug` matches across items, components and guides.      |
| `get_package`   | `slug`                          | A package's table of contents (categories, components or sections).     |
| `get_doc`       | `package`, `name`               | Full reference for one item: signatures, params, examples, props/emits. |

`name` accepts either the URL slug (`use-clipboard`) or the exported name
(`useClipboard`). Slugs are unique within a package; case-only collisions (e.g.
the `useProjection` function vs the `UseProjection` type) are disambiguated with
a kind suffix (`use-projection-type`).

## Resources

- `robonen-docs://index` — the documentation index.
- `robonen-docs://{package}/{slug}` — full Markdown for a single documented item
  (listable, one entry per leaf).

## Layout

| File                                  | Responsibility                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `../../server/routes/mcp.post.ts`     | Nitro HTTP route — bridges the request to the MCP transport.            |
| `create-server.ts`                    | Builds the configured `McpServer` (tools + resources) from metadata.   |
| `docs-index.ts`                       | Pure query layer — flatten, unique-slug, search, resolve.              |
| `format.ts`                           | Markdown renderers for tool/resource payloads.                          |
| `*.test.ts`                           | Unit tests for the query layer.                                         |
