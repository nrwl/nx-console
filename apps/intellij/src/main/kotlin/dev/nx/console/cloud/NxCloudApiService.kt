package dev.nx.console.cloud

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.util.io.HttpRequests
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.nxls.NxlsService
import java.net.HttpURLConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Service(Service.Level.PROJECT)
class NxCloudApiService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): NxCloudApiService =
            project.getService(NxCloudApiService::class.java)

        private const val DEFAULT_CLOUD_URL = "https://cloud.nx.app"
    }

    private val logger = thisLogger()
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    @Serializable
    data class UpdateSuggestedFixRequest(
        val aiFixId: String, 
        val action: AITaskFixUserAction,
        val userCommitMessage: String? = null
    ) {
        val actionOrigin: String = "NX_CONSOLE_INTELLIJ"
    }

    suspend fun updateSuggestedFix(
        aiFixId: String, 
        action: AITaskFixUserAction, 
        commitMessage: String? = null
    ): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val cloudStatus = NxlsService.getInstance(project).cloudStatus()
                val nxCloudUrl = cloudStatus?.nxCloudUrl ?: DEFAULT_CLOUD_URL

                if (cloudStatus?.isConnected != true) {
                    logger.warn("Nx Cloud is not connected. Status: $cloudStatus")
                    return@withContext false
                }

                val authHeaders = NxlsService.getInstance(project).cloudAuthHeaders()
                if (authHeaders == null) {
                    logger.warn("Failed to get Nx Cloud auth headers")
                    return@withContext false
                }

                val requestBody = json.encodeToString(
                    UpdateSuggestedFixRequest(aiFixId, action, commitMessage)
                )
                logger.info("suggested fix stringified $requestBody")

                val response =
                    HttpRequests.post(
                            "$nxCloudUrl/nx-cloud/update-suggested-fix",
                            "application/json"
                        )
                        .tuner { connection ->
                            authHeaders.nxCloudId?.let {
                                connection.setRequestProperty("Nx-Cloud-Id", it)
                            }
                            authHeaders.nxCloudPersonalAccessToken?.let {
                                connection.setRequestProperty("Nx-Cloud-Personal-Access-Token", it)
                            }
                            authHeaders.authorization?.let {
                                connection.setRequestProperty("Authorization", it)
                            }
                        }
                        .connect { request ->
                            request.write(requestBody)

                            val httpConnection = request.connection as HttpURLConnection
                            val statusCode = httpConnection.responseCode

                            if (statusCode == 401) {
                                val errorResponse =
                                    try {
                                        httpConnection.errorStream?.bufferedReader()?.readText()
                                            ?: ""
                                    } catch (e: Exception) {
                                        "Unable to read error response"
                                    }
                                logger.error(
                                    "Authentication failed (401). Please check your Nx Cloud credentials."
                                )
                                logger.error("Response body: $errorResponse")
                            }

                            statusCode in 200..299
                        }

                return@withContext response
            } catch (e: Exception) {
                logger.error("Failed to update suggested fix", e)
                return@withContext false
            }
        }
}
