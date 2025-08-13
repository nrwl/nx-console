package dev.nx.console.models

/**
 * Mirrors libs/shared/types/src/lib/graph-data.ts GraphDataResult
 */
data class NxGraphDataResult(
    val resultType: String, // 'NO_GRAPH_ERROR' | 'OLD_NX_VERSION' | 'ERROR' | 'SUCCESS'
    val graphBasePath: String?,
    val graphDataSerialized: String?, // stringified ProjectGraph
    val errorsSerialized: String?, // stringified NxError[] | undefined
    val errorMessage: String?,
    val isPartial: Boolean?,
) {
    init {
        require(
            resultType == "NO_GRAPH_ERROR" ||
                resultType == "OLD_NX_VERSION" ||
                resultType == "ERROR" ||
                resultType == "SUCCESS"
        ) {
            "resultType must be of known type"
        }
    }
}
