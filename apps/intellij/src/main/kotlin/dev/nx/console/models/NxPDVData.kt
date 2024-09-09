package dev.nx.console.models

data class NxPDVData(
    val resultType: String,
    val graphBasePath: String?,
    val pdvDataSerialized: String?,
    val errorsSerialized: String?,
    val errorMessage: String?,
) {
    init {
        require(
            resultType == "SUCCESS" || resultType == "ERROR" || resultType == "NO_GRAPH_ERROR"
        ) {
            "resultType must be 'success' or 'error'"
        }
    }
}
