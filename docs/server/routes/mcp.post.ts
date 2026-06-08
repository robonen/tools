/**
 * MCP endpoint, served by the Nuxt/Nitro server itself — no separate process.
 *
 * Speaks the MCP Streamable HTTP transport in stateless mode (one fresh server
 * per request, plain JSON responses), reusing the shared `createDocsMcpServer`
 * factory and the build-time documentation metadata injected by the extractor
 * module as the `#docs/server-metadata` virtual.
 *
 * POST /mcp  →  start the dev server (`pnpm docs:dev`) and point your MCP client
 * at http://localhost:3000/mcp.
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import metadata from '#docs/server-metadata';
import pkg from '../../package.json';
import { createDocsMcpServer } from '../../modules/mcp/create-server';

export default defineEventHandler(async (event) => {
  // h3 has already buffered the JSON body; hand it to the transport so it does
  // not try to re-read the consumed request stream.
  const body = await readBody(event);

  const server = createDocsMcpServer(metadata, pkg.version);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no session tracking for read-only docs
    enableJsonResponse: true, // return a single JSON response rather than an SSE stream
  });

  // Tear both down once the response is flushed.
  event.node.res.on('close', () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  // The transport writes the status, headers and body directly to res and ends
  // it; h3 sees `res.writableEnded` and does not attempt a second response.
  await transport.handleRequest(event.node.req, event.node.res, body);
});
