package dev.nx.console.cloud

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.*
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CIPEDataSyncServiceTest : BasePlatformTestCase() {

    private lateinit var dataService: CIPEDataSyncService
    private lateinit var mockListener: TestNotificationListener

    override fun setUp() {
        super.setUp()
        dataService = CIPEDataSyncService(project)
        mockListener = TestNotificationListener()
        dataService.addNotificationListener(mockListener)
    }

    override fun tearDown() {
        dataService.removeNotificationListener(mockListener)
        super.tearDown()
    }

    fun testNoNotificationOnInitialLoad() {
        // When comparing null (initial load) with any state, should not show notification
        val newData = CIPEDataResponse(info = listOf(createSuccessfulCIPE()))

        dataService.updateData(newData)

        assertTrue(mockListener.events.isEmpty(), "Should not show notifications on initial load")
    }

    fun testNoNotificationForNoChange() {
        // Set initial state
        dataService.updateData(CIPEDataResponse(info = listOf(createSuccessfulCIPE())))
        mockListener.reset()

        // Update with same state
        dataService.updateData(CIPEDataResponse(info = listOf(createSuccessfulCIPE())))

        assertTrue(
            mockListener.events.isEmpty(),
            "Should not show notifications when nothing changes"
        )
    }

    fun testSuccessNotification() {
        // Progress -> Success should show success notification
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val successCIPE =
            progressCIPE.copy(
                status = CIPEExecutionStatus.SUCCEEDED,
                completedAt = System.currentTimeMillis()
            )
        dataService.updateData(CIPEDataResponse(info = listOf(successCIPE)))

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPESucceeded)
    }

    fun testFailureNotificationWithoutAiFix() {
        // Progress -> Failed (without AI fix) should show error notification
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val failedCIPE =
            progressCIPE.copy(
                status = CIPEExecutionStatus.FAILED,
                completedAt = System.currentTimeMillis()
            )
        dataService.updateData(CIPEDataResponse(info = listOf(failedCIPE)))

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)
    }

    fun testRunFailureNotificationWithoutAiFix() {
        // Progress with failed run (without AI fix) should show error notification
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val failedRunCIPE = createProgressWithFailedRun()
        dataService.updateData(CIPEDataResponse(info = listOf(failedRunCIPE)))

        assertEquals(1, mockListener.events.size)
        val event = mockListener.events[0]
        assertTrue(event is CIPENotificationEvent.RunFailed)
        assertEquals("nx test", (event as CIPENotificationEvent.RunFailed).run.command)
    }

    fun testAiFixSuppressesFailureNotifications() {
        // Progress -> Failed with AI fix should NOT show error notification
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val failedWithAiFix = createFailedCIPEWithAiFix()
        dataService.updateData(CIPEDataResponse(info = listOf(failedWithAiFix)))

        // Should only show AI fix notification, not failure notification
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testAiFixNotificationWhenSuggestedFixBecomesAvailable() {
        // Progress -> Progress with AI fix (with suggestedFix) should show AI fix notification
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val progressWithAiFix = createProgressWithAiFixAndSuggestion()
        dataService.updateData(CIPEDataResponse(info = listOf(progressWithAiFix)))

        assertEquals(1, mockListener.events.size)
        val event = mockListener.events[0]
        assertTrue(event is CIPENotificationEvent.AiFixAvailable)
        assertEquals(
            "test-task-1",
            (event as CIPENotificationEvent.AiFixAvailable).runGroup.aiFix?.taskIds?.first()
        )
    }

    fun testNoAiFixNotificationWhenSuggestedFixAlreadyExists() {
        // If AI fix with suggestedFix already existed, should not show notification
        val withAiFix = createProgressWithAiFixAndSuggestion()
        dataService.updateData(CIPEDataResponse(info = listOf(withAiFix)))
        mockListener.reset()

        // Same state, should not notify
        dataService.updateData(CIPEDataResponse(info = listOf(withAiFix)))

        assertTrue(mockListener.events.isEmpty())
    }

    fun testAiFixNotificationOnlyWhenSuggestedFixAppears() {
        // AI fix without suggestion -> AI fix with suggestion should notify
        val withoutSuggestion = createProgressWithAiFixNoSuggestion()
        dataService.updateData(CIPEDataResponse(info = listOf(withoutSuggestion)))
        mockListener.reset()

        val withSuggestion = createProgressWithAiFixAndSuggestion()
        dataService.updateData(CIPEDataResponse(info = listOf(withSuggestion)))

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testNoNotificationWhenAiFixWithoutSuggestion() {
        // Progress -> Progress with AI fix (without suggestedFix) should NOT notify
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        val withAiFixNoSuggestion = createProgressWithAiFixNoSuggestion()
        dataService.updateData(CIPEDataResponse(info = listOf(withAiFixNoSuggestion)))

        assertTrue(mockListener.events.isEmpty())
    }

    fun testMultipleRunGroupsWithMixedAiFixStates() {
        val progressCIPE = createProgressCIPE()
        dataService.updateData(CIPEDataResponse(info = listOf(progressCIPE)))
        mockListener.reset()

        // Create CIPE with multiple run groups - one with AI fix, one without
        val mixedCIPE =
            CIPEInfo(
                ciPipelineExecutionId = "1",
                branch = "feature",
                status = CIPEExecutionStatus.FAILED,
                createdAt = 100000,
                completedAt = 100001,
                commitTitle = "fix: fix fix",
                commitUrl = "https://github.com/commit/123",
                cipeUrl = "https://cloud.nx.app/cipes/123",
                runGroups =
                    listOf(
                        // First run group with AI fix
                        CIPERunGroup(
                            ciExecutionEnv = "123123",
                            runGroup = "rungroup-1",
                            createdAt = 10000,
                            completedAt = 10001,
                            status = CIPEExecutionStatus.FAILED,
                            runs =
                                listOf(
                                    CIPERun(
                                        linkId = "123123",
                                        command = "nx test",
                                        status = CIPEExecutionStatus.FAILED,
                                        runUrl = "http://test.url"
                                    )
                                ),
                            aiFix =
                                NxAiFix(
                                    aiFixId = "ai-fix-1",
                                    taskIds = listOf("test-task-1"),
                                    terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                    suggestedFix = "git diff content...",
                                    suggestedFixDescription = "Fix test",
                                    verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                                    userAction = AITaskFixUserAction.NONE
                                )
                        ),
                        // Second run group without AI fix
                        CIPERunGroup(
                            ciExecutionEnv = "123123",
                            runGroup = "rungroup-2",
                            createdAt = 10000,
                            completedAt = 10001,
                            status = CIPEExecutionStatus.FAILED,
                            runs =
                                listOf(
                                    CIPERun(
                                        linkId = "456456",
                                        command = "nx build",
                                        status = CIPEExecutionStatus.FAILED,
                                        runUrl = "http://test2.url"
                                    )
                                )
                        )
                    )
            )

        dataService.updateData(CIPEDataResponse(info = listOf(mixedCIPE)))

        // Should only show AI fix notification, not failure
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testNoNotificationWhenOldStateAlreadyCompleted() {
        // If old state was already completed, should not show notifications
        val completedCIPE = createFailedCIPEWithAiFix()
        dataService.updateData(CIPEDataResponse(info = listOf(completedCIPE)))
        mockListener.reset()

        // Any change after completion should not notify
        val stillCompleted = completedCIPE.copy(completedAt = System.currentTimeMillis() + 1000)
        dataService.updateData(CIPEDataResponse(info = listOf(stillCompleted)))

        assertTrue(mockListener.events.isEmpty())
    }

    fun testNoNotificationWhenOldStateHadFailedRun() {
        // If old state had a failed run, should not show notifications
        val withFailedRun = createProgressWithFailedRun()
        dataService.updateData(CIPEDataResponse(info = listOf(withFailedRun)))
        mockListener.reset()

        // Change to failed CIPE should not notify (already notified for run failure)
        val failedCIPE = withFailedRun.copy(status = CIPEExecutionStatus.FAILED)
        dataService.updateData(CIPEDataResponse(info = listOf(failedCIPE)))

        assertTrue(mockListener.events.isEmpty())
    }

    // Helper functions to create test data
    private fun createSuccessfulCIPE() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.SUCCEEDED,
            createdAt = 100000,
            completedAt = 100001,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups =
                listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "123123",
                        runGroup = "rungroup-123123",
                        createdAt = 10000,
                        completedAt = 10001,
                        status = CIPEExecutionStatus.SUCCEEDED,
                        runs =
                            listOf(
                                CIPERun(
                                    linkId = "123123",
                                    command = "nx test",
                                    status = CIPEExecutionStatus.SUCCEEDED,
                                    runUrl = "http://test.url"
                                )
                            )
                    )
                )
        )

    private fun createProgressCIPE() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.IN_PROGRESS,
            createdAt = 100000,
            completedAt = null,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups = emptyList()
        )

    private fun createProgressWithFailedRun() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.IN_PROGRESS,
            createdAt = 100000,
            completedAt = null,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups =
                listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "123123",
                        runGroup = "rungroup-123123",
                        createdAt = 10000,
                        completedAt = null,
                        status = CIPEExecutionStatus.IN_PROGRESS,
                        runs =
                            listOf(
                                CIPERun(
                                    linkId = "123123",
                                    command = "nx test",
                                    status = CIPEExecutionStatus.FAILED,
                                    runUrl = "http://test.url"
                                )
                            )
                    )
                )
        )

    private fun createFailedCIPEWithAiFix() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.FAILED,
            createdAt = 100000,
            completedAt = 100001,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups =
                listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "123123",
                        runGroup = "rungroup-123123",
                        createdAt = 10000,
                        completedAt = 10001,
                        status = CIPEExecutionStatus.FAILED,
                        runs =
                            listOf(
                                CIPERun(
                                    linkId = "123123",
                                    command = "nx test",
                                    status = CIPEExecutionStatus.FAILED,
                                    runUrl = "http://test.url"
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-123",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFix = "git diff content here...",
                                suggestedFixDescription = "Fix the failing test",
                                verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                                userAction = AITaskFixUserAction.NONE
                            )
                    )
                )
        )

    private fun createProgressWithAiFixAndSuggestion() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.IN_PROGRESS,
            createdAt = 100000,
            completedAt = null,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups =
                listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "123123",
                        runGroup = "rungroup-123123",
                        createdAt = 10000,
                        completedAt = null,
                        status = CIPEExecutionStatus.IN_PROGRESS,
                        runs =
                            listOf(
                                CIPERun(
                                    linkId = "123123",
                                    command = "nx test",
                                    status = CIPEExecutionStatus.FAILED,
                                    runUrl = "http://test.url"
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-456",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFix = "git diff content here...",
                                suggestedFixDescription = "Fix the failing test",
                                verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                                userAction = AITaskFixUserAction.NONE
                            )
                    )
                )
        )

    private fun createProgressWithAiFixNoSuggestion() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.IN_PROGRESS,
            createdAt = 100000,
            completedAt = null,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            runGroups =
                listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "123123",
                        runGroup = "rungroup-123123",
                        createdAt = 10000,
                        completedAt = null,
                        status = CIPEExecutionStatus.IN_PROGRESS,
                        runs =
                            listOf(
                                CIPERun(
                                    linkId = "123123",
                                    command = "nx test",
                                    status = CIPEExecutionStatus.FAILED,
                                    runUrl = "http://test.url"
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-789",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFix = null,
                                suggestedFixDescription = null,
                                verificationStatus = AITaskFixVerificationStatus.IN_PROGRESS,
                                userAction = AITaskFixUserAction.NONE
                            )
                    )
                )
        )

    // Test helper class
    private class TestNotificationListener : CIPENotificationListener {
        val events = mutableListOf<CIPENotificationEvent>()

        override fun onNotificationEvent(event: CIPENotificationEvent) {
            events.add(event)
        }

        fun reset() {
            events.clear()
        }
    }
}
