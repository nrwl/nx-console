package dev.nx.console.cloud

import dev.nx.console.models.AITaskFixStatus
import dev.nx.console.models.AITaskFixUserAction
import dev.nx.console.models.NxAiFix
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CIPEPollingServiceTest {

    @Test
    fun testAiFixActiveWhenGenerationInProgress() {
        val aiFix = createAiFix(suggestedFixStatus = AITaskFixStatus.IN_PROGRESS)
        assertTrue(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixActiveWhenGenerationNotStarted() {
        val aiFix = createAiFix(suggestedFixStatus = AITaskFixStatus.NOT_STARTED)
        assertTrue(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixActiveWhenVerificationNeededAndNotComplete() {
        // Generation complete, verification NOT_STARTED, failureClassification = "code_change"
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                failureClassification = "code_change",
            )
        assertTrue(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixActiveWhenVerificationInProgressWithCodeChange() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.IN_PROGRESS,
                failureClassification = "code_change",
            )
        assertTrue(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixActiveWhenVerificationNeededWithNullClassification() {
        // null failureClassification should be treated as needing verification (backwards compat)
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                failureClassification = null,
            )
        assertTrue(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenUserApplied() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.COMPLETED,
                userAction = AITaskFixUserAction.APPLIED,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenUserRejected() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                userAction = AITaskFixUserAction.REJECTED,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenUserAppliedAutomatically() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.COMPLETED,
                userAction = AITaskFixUserAction.APPLIED_AUTOMATICALLY,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenGenerationFailed() {
        // When generation fails, verification is typically marked as NOT_EXECUTABLE or the
        // classification is set to something other than "code_change"
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.FAILED,
                verificationStatus = AITaskFixStatus.NOT_EXECUTABLE,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenGenerationFailedWithNullClassification() {
        // Bug regression test: FAILED with null failureClassification and NOT_STARTED verification
        // should still return false (not active)
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.FAILED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                failureClassification = null,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenGenerationNotExecutable() {
        // When generation is not executable, verification is also typically not executable
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.NOT_EXECUTABLE,
                verificationStatus = AITaskFixStatus.NOT_EXECUTABLE,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenGenerationFailedWithEnvClassification() {
        // When generation fails and classification indicates env issue, not active
        val aiFix =
            createAiFix(suggestedFixStatus = AITaskFixStatus.FAILED, failureClassification = "env")
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenVerificationComplete() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.COMPLETED,
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenVerificationNotNeeded() {
        // failureClassification = "env" means no verification needed
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                failureClassification = "env",
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenVerificationNotNeededWithFlaky() {
        // failureClassification = "flaky" means no verification needed
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_STARTED,
                failureClassification = "flaky",
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenVerificationFailed() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.FAILED,
                failureClassification = "code_change",
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    @Test
    fun testAiFixNotActiveWhenVerificationNotExecutable() {
        val aiFix =
            createAiFix(
                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                verificationStatus = AITaskFixStatus.NOT_EXECUTABLE,
                failureClassification = "code_change",
            )
        assertFalse(CIPEPollingService.isAIFixActive(aiFix))
    }

    private fun createAiFix(
        suggestedFixStatus: AITaskFixStatus = AITaskFixStatus.NOT_STARTED,
        verificationStatus: AITaskFixStatus = AITaskFixStatus.NOT_STARTED,
        userAction: AITaskFixUserAction? = AITaskFixUserAction.NONE,
        failureClassification: String? = null,
    ): NxAiFix {
        return NxAiFix(
            aiFixId = "test-ai-fix",
            taskIds = listOf("task-1"),
            terminalLogsUrls = mapOf("task-1" to "http://logs.url"),
            suggestedFixStatus = suggestedFixStatus,
            verificationStatus = verificationStatus,
            userAction = userAction,
            failureClassification = failureClassification,
        )
    }
}
