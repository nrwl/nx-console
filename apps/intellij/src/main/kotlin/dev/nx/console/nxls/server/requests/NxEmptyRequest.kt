package dev.nx.console.nxls.server.requests

/**
 * Parameter for nxls requests that take no arguments. nxls declares them with one parameter and
 * rejects a request whose `params` member is missing. lsp4j 1.0 (IntelliJ 2026.3) omits `params`
 * when it is null, so these requests must send `{}` instead of nothing.
 */
class NxEmptyRequest
