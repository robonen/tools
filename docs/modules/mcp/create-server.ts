/**
 * Builds a configured MCP server exposing the @robonen/tools documentation.
 *
 * Transport-agnostic: the same server is mounted on the Nuxt/Nitro HTTP route
 * (see `docs/server/routes/mcp.post.ts`). Given already-extracted
 * {@link DocsMetadata}, it registers the docs tools and resources.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocsMetadata } from '../extractor/types';
import type { Leaf } from './docs-index';
import { buildLeaves, getPackage, resolveEntry, search } from './docs-index';
import {
  renderDocEntry,
  renderPackageList,
  renderPackageOverview,
  renderSearchResults,
} from './format';

const INSTRUCTIONS = [
  'Documentation for the @robonen/tools monorepo (core utilities, Vue composables &',
  'primitives, shared configs). Workflow: call `list_packages` to see what exists,',
  '`search_docs` to find an item by keyword, `get_package` for a package\'s table of',
  'contents, and `get_doc` for the full reference (signatures, params, examples,',
  'props/emits, demo source) of one item. Slugs are kebab-case; names are as exported.',
].join(' ');

/** Wrap a not-found message as a non-fatal tool error. */
function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

/** Wrap rendered Markdown as a successful tool result. */
function toolText(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function registerTools(server: McpServer, metadata: DocsMetadata, leaves: Leaf[]): void {
  server.registerTool(
    'list_packages',
    {
      title: 'List documentation packages',
      description:
        'List every documented @robonen/tools package (core, vue, configs, infra) with its kind, '
        + 'version, description and entry count. Start here to discover what is available.',
      inputSchema: {},
    },
    async () => toolText(renderPackageList(metadata)),
  );

  server.registerTool(
    'search_docs',
    {
      title: 'Search documentation',
      description:
        'Full-text search across all documented functions, classes, types, components and guide '
        + 'sections. Returns ranked matches as `package/slug` references to pass to get_doc.',
      inputSchema: {
        query: z.string().min(1).describe('Search terms, e.g. "debounce", "clipboard", "eslint imports".'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results (default 20).'),
      },
    },
    async ({ query, limit }) => toolText(renderSearchResults(search(leaves, query, limit ?? 20), query)),
  );

  server.registerTool(
    'get_package',
    {
      title: 'Get a package overview',
      description:
        'Show a package\'s full table of contents: categories and items (api), components and their '
        + 'parts (components), or sections (guide). Pass the package slug from list_packages.',
      inputSchema: {
        slug: z.string().min(1).describe('Package slug, e.g. "stdlib", "toolkit", "primitives".'),
      },
    },
    async ({ slug }) => {
      const pkg = getPackage(metadata, slug);
      if (!pkg) return toolError(`No package with slug "${slug}". Call list_packages to see available slugs.`);
      return toolText(renderPackageOverview(pkg));
    },
  );

  server.registerTool(
    'get_doc',
    {
      title: 'Get full documentation for an item',
      description:
        'Return the complete documentation for a single function, class, type, component or guide '
        + 'section: signatures, parameters, return type, examples, props/emits, demo source and the '
        + 'source path. Pass the package slug plus the item slug or its exported name.',
      inputSchema: {
        package: z.string().min(1).describe('Package slug, e.g. "stdlib".'),
        name: z.string().min(1).describe('Item slug or exported name, e.g. "clamp" or "useClipboard".'),
      },
    },
    async ({ package: pkgSlug, name }) => {
      const entry = resolveEntry(leaves, pkgSlug, name);
      if (!entry) {
        return toolError(
          `No documented item "${name}" in package "${pkgSlug}". Call get_package("${pkgSlug}") to list its items.`,
        );
      }
      return toolText(renderDocEntry(entry));
    },
  );
}

function registerResources(server: McpServer, metadata: DocsMetadata, leaves: Leaf[]): void {
  // The whole table of contents as a single browsable resource.
  server.registerResource(
    'docs-index',
    'robonen-docs://index',
    {
      title: '@robonen/tools documentation index',
      description: 'Table of contents for every documented package.',
      mimeType: 'text/markdown',
    },
    async uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: renderPackageList(metadata) }],
    }),
  );

  // One resource per documented leaf, addressable as robonen-docs://<package>/<slug>.
  server.registerResource(
    'docs-entry',
    new ResourceTemplate('robonen-docs://{package}/{slug}', {
      list: async () => ({
        resources: leaves.map(leaf => ({
          uri: `robonen-docs://${leaf.packageSlug}/${leaf.slug}`,
          name: `${leaf.packageName} / ${leaf.name}`,
          description: leaf.description || `${leaf.badge} in ${leaf.packageName}`,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    {
      title: 'Documentation entry',
      description: 'Full documentation for a single documented item.',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const pkgSlug = String(variables.package);
      const slug = String(variables.slug);
      const entry = resolveEntry(leaves, pkgSlug, slug);
      if (!entry) throw new Error(`Unknown documentation resource: ${uri.href}`);
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: renderDocEntry(entry) }] };
    },
  );
}

/** Build an MCP server for the given documentation metadata, ready to connect to a transport. */
export function createDocsMcpServer(metadata: DocsMetadata, version = '0.0.0'): McpServer {
  const leaves = buildLeaves(metadata);
  const server = new McpServer({ name: 'robonen-docs', version }, { instructions: INSTRUCTIONS });
  registerTools(server, metadata, leaves);
  registerResources(server, metadata, leaves);
  return server;
}
