package dev.nx.console.utils.jcef

import kotlinx.serialization.json.JsonPrimitive

/** Escapes text for HTML element content and quoted attribute values. */
fun escapeHtml(text: String): String =
    text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#039;")

/**
 * Escapes `<` and `>` in serialized JSON so it can't close the `<script>` tag it is embedded in.
 * The `<` and `>` escapes are valid in both JSON and JavaScript strings.
 */
fun escapeScriptTag(serializedJson: String): String =
    serializedJson.replace("<", "\\u003c").replace(">", "\\u003e")

/** Quotes text as a JavaScript string literal, safe to embed in scripts and `<script>` tags. */
fun jsStringLiteral(text: String): String = escapeScriptTag(JsonPrimitive(text).toString())
