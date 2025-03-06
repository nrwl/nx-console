package dev.nx.console.models

data class NxPDVData(
    val resultType: String,
    val graphBasePath: String?,
    val pdvDataSerialized: String?,
    val pdvDataSerializedMulti: Map<String, String>?,
    val errorsSerialized: String?,
    val errorMessage: String?,
) {
    init {
        require(
            resultType == "SUCCESS" ||
                resultType == "SUCCESS_MULTI" ||
                resultType == "ERROR" ||
                resultType == "NO_GRAPH_ERROR" ||
                resultType == "OLD_NX_VERSION"
        ) {
            "resultType must be of known type"
        }
    }
}
