package dev.nx.console.telemetry

const val MEASUREMENT_ID = "G-TNJ97NGX40"

const val API_TOKEN = "3J_QsvygSLKfjxMXFSG03Q"

const val BASE_URL = "mp/collect?api_secret=$API_TOKEN&measurement_id=$MEASUREMENT_ID"

object TelemetryValues {
    val URL = "https://www.google-analytics.com/$BASE_URL"
    val DEBUG_URL = "https://www.google-analytics.com/debug/$BASE_URL"
}
