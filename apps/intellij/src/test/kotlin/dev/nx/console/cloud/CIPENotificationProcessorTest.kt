package dev.nx.console.cloud

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.*
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CIPENotificationProcessorTest : BasePlatformTestCase() {

    private lateinit var processor: CIPENotificationProcessor
    private lateinit var mockListener: TestNotificationListener

    override fun setUp() {
        super.setUp()
        processor = CIPENotificationProcessor(project)
        mockListener = TestNotificationListener()
        processor.addNotificationListener(mockListener)
    }

    override fun tearDown() {
        processor.removeNotificationListener(mockListener)
        super.tearDown()
    }

    fun testNoNotificationOnInitialLoad() {
        // When comparing null (initial load) with any state, should not show notification
        val event =
            CIPEDataChangedEvent(
                oldData = null,
                newData = CIPEDataResponse(info = listOf(createSuccessfulCIPE())),
            )

        processor.onDataChanged(event)

        assertTrue(mockListener.events.isEmpty(), "Should not show notifications on initial load")
    }

    fun testNoNotificationForNoChange() {
        // When old and new data are the same, should not show notifications
        val cipeData = CIPEDataResponse(info = listOf(createSuccessfulCIPE()))
        val event = CIPEDataChangedEvent(oldData = cipeData, newData = cipeData)

        processor.onDataChanged(event)

        assertTrue(
            mockListener.events.isEmpty(),
            "Should not show notifications when nothing changes",
        )
    }

    fun testSuccessNotification() {
        // Progress -> Success should show success notification
        val progressCIPE = createProgressCIPE()
        val successCIPE =
            progressCIPE.copy(
                status = CIPEExecutionStatus.SUCCEEDED,
                completedAt = System.currentTimeMillis(),
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(successCIPE)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPESucceeded)
    }

    fun testFailureNotificationWithoutAiFix() {
        // Progress -> Failed (without AI fix) should show error notification
        val progressCIPE = createProgressCIPE()
        val failedCIPE =
            progressCIPE.copy(
                status = CIPEExecutionStatus.FAILED,
                completedAt = System.currentTimeMillis(),
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedCIPE)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)
    }

    fun testRunFailureNotificationWithoutAiFix() {
        // Progress with failed run (without AI fix) should show error notification
        val progressCIPE = createProgressCIPE()
        val failedRunCIPE = createProgressWithFailedRun()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedRunCIPE)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        val notificationEvent = mockListener.events[0]
        assertTrue(notificationEvent is CIPENotificationEvent.RunFailed)
        assertEquals("nx test", (notificationEvent as CIPENotificationEvent.RunFailed).run.command)
    }

    fun testAiFixSuppressesFailureNotifications() {
        // Progress -> Failed with AI fix should NOT show error notification
        val progressCIPE = createProgressCIPE()
        val failedWithAiFix = createFailedCIPEWithAiFix()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedWithAiFix)),
            )

        processor.onDataChanged(event)

        // Should only show AI fix notification, not failure notification
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testAiFixNotificationWhenSuggestedFixBecomesAvailable() {
        // Progress -> Progress with AI fix (with suggestedFix) should show AI fix notification
        val progressCIPE = createProgressCIPE()
        val progressWithAiFix = createProgressWithAiFixAndSuggestion()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(progressWithAiFix)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        val notificationEvent = mockListener.events[0]
        assertTrue(notificationEvent is CIPENotificationEvent.AiFixAvailable)
        assertEquals(
            "test-task-1",
            (notificationEvent as CIPENotificationEvent.AiFixAvailable)
                .runGroup
                .aiFix
                ?.taskIds
                ?.first(),
        )
    }

    fun testNoAiFixNotificationWhenSuggestedFixAlreadyExists() {
        // If AI fix with suggestedFix already existed, should not show notification
        val withAiFix = createProgressWithAiFixAndSuggestion()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(withAiFix)),
                newData = CIPEDataResponse(info = listOf(withAiFix)),
            )

        processor.onDataChanged(event)

        assertTrue(mockListener.events.isEmpty())
    }

    fun testAiFixNotificationOnlyWhenSuggestedFixAppears() {
        // AI fix without suggestion -> AI fix with suggestion should notify
        val withoutSuggestion = createProgressWithAiFixNoSuggestion()
        val withSuggestion = createProgressWithAiFixAndSuggestion()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(withoutSuggestion)),
                newData = CIPEDataResponse(info = listOf(withSuggestion)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testNoNotificationWhenAiFixWithoutSuggestion() {
        // Progress -> Progress with AI fix (without suggestedFix) should NOT notify
        val progressCIPE = createProgressCIPE()
        val withAiFixNoSuggestion = createProgressWithAiFixNoSuggestion()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(withAiFixNoSuggestion)),
            )

        processor.onDataChanged(event)

        assertTrue(mockListener.events.isEmpty())
    }

    fun testMultipleRunGroupsWithMixedAiFixStates() {
        val progressCIPE = createProgressCIPE()

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
                                        runUrl = "http://test.url",
                                    )
                                ),
                            aiFix =
                                NxAiFix(
                                    aiFixId = "ai-fix-1",
                                    taskIds = listOf("test-task-1"),
                                    terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                    suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                    verificationStatus = AITaskFixStatus.COMPLETED,
                                    suggestedFix = "git diff content...",
                                    suggestedFixDescription = "Fix test",
                                    userAction = AITaskFixUserAction.NONE,
                                ),
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
                                        runUrl = "http://test2.url",
                                    )
                                ),
                        ),
                    ),
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(mixedCIPE)),
            )

        processor.onDataChanged(event)

        // Should only show AI fix notification, not failure
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testNoNotificationWhenOldStateAlreadyCompleted() {
        // If old state was already completed, should not show notifications
        val completedCIPE = createFailedCIPEWithAiFix()

        // Any change after completion should not notify
        val stillCompleted = completedCIPE.copy(completedAt = System.currentTimeMillis() + 1000)

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(completedCIPE)),
                newData = CIPEDataResponse(info = listOf(stillCompleted)),
            )

        processor.onDataChanged(event)

        assertTrue(mockListener.events.isEmpty())
    }

    fun testNoNotificationWhenOldStateHadFailedRun() {
        // If old state had a failed run, should not show notifications
        val withFailedRun = createProgressWithFailedRun()

        // Change to failed CIPE should not notify (already notified for run failure)
        val failedCIPE = withFailedRun.copy(status = CIPEExecutionStatus.FAILED)

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(withFailedRun)),
                newData = CIPEDataResponse(info = listOf(failedCIPE)),
            )

        processor.onDataChanged(event)

        assertTrue(mockListener.events.isEmpty())
    }

    fun testNewCIPEWithCompletedAiFixShowsNotification() {
        // When a new CIPE appears with an already-completed AI fix, should show notification
        val oldCIPE = createProgressCIPE()
        val newCIPEWithAiFix =
            createFailedCIPEWithAiFix()
                .copy(
                    ciPipelineExecutionId = "2" // Different ID - new CIPE
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(oldCIPE)),
                newData = CIPEDataResponse(info = listOf(newCIPEWithAiFix)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        val notificationEvent = mockListener.events[0]
        assertTrue(notificationEvent is CIPENotificationEvent.AiFixAvailable)
        assertEquals(
            "test-task-1",
            (notificationEvent as CIPENotificationEvent.AiFixAvailable)
                .runGroup
                .aiFix
                ?.taskIds
                ?.first(),
        )
    }

    fun testNewCIPEWithAiFixInProgressDoesNotShowNotification() {
        // When a new CIPE has AI fix without suggestedFix (still generating), should not notify
        val oldCIPE = createProgressCIPE()
        val newCIPEWithAiFixInProgress =
            createProgressWithAiFixNoSuggestion()
                .copy(
                    ciPipelineExecutionId = "4" // Different ID - new CIPE
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(oldCIPE)),
                newData = CIPEDataResponse(info = listOf(newCIPEWithAiFixInProgress)),
            )

        processor.onDataChanged(event)

        // Should not show notification since suggestedFix is null
        assertTrue(mockListener.events.isEmpty())
    }

    fun testNewCIPEWithAiFixNotStartedDoesNotShowNotification() {
        // When a new CIPE has AI fix with status NOT_STARTED, should not notify
        val oldCIPE = createProgressCIPE()
        val newCIPEWithAiFixNotStarted =
            createProgressWithAiFixNotStarted()
                .copy(
                    ciPipelineExecutionId = "4" // Different ID - new CIPE
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(oldCIPE)),
                newData = CIPEDataResponse(info = listOf(newCIPEWithAiFixNotStarted)),
            )

        processor.onDataChanged(event)

        // Should not show notification since suggestedFix is null
        assertTrue(mockListener.events.isEmpty())
    }

    fun testCIPEWithAiFixNotStartedDoesNotShowNotification() {
        // When an existing CIPE has AI fix with status NOT_STARTED, should not notify
        val oldCIPE = createProgressCIPE()
        val newCIPEWithAiFixNotStarted = createProgressWithAiFixNotStarted()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(oldCIPE)),
                newData = CIPEDataResponse(info = listOf(newCIPEWithAiFixNotStarted)),
            )

        processor.onDataChanged(event)

        // Should not show notification since suggestedFix is null
        assertTrue(mockListener.events.isEmpty())
    }

    fun testNoNotificationForFailureWithAiFixesEnabled() {
        // When aiFixesEnabled=true but failure just happened, should not show notification
        // (waiting to see if AI fix comes)
        val tenMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 10
        val oneMinuteAgo = System.currentTimeMillis() - 1000 * 60 * 1

        val progressCIPE = createProgressCIPE()
        val failedWithAiFixesEnabled =
            progressCIPE.copy(
                aiFixesEnabled = true,
                status = CIPEExecutionStatus.FAILED,
                completedAt = oneMinuteAgo,
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedWithAiFixesEnabled)),
            )

        processor.onDataChanged(event)

        // Should not show notification - waiting for AI fix
        assertTrue(mockListener.events.isEmpty())
    }

    fun testNotificationForFailureWithAiFixesEnabledAfterTimeout() {
        // When aiFixesEnabled=true but failure was more than 5 minutes ago, should show
        // notification
        val tenMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 10
        val sixMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 6

        val progressCIPE = createProgressCIPE()
        val failedWithAiFixesEnabledTimedOut =
            progressCIPE.copy(
                aiFixesEnabled = true,
                status = CIPEExecutionStatus.FAILED,
                createdAt = tenMinutesAgo,
                completedAt = sixMinutesAgo,
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedWithAiFixesEnabledTimedOut)),
            )

        processor.onDataChanged(event)

        // Should show notification - timeout passed
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)
    }

    fun testNoNotificationForProgressFailedRunWithAiFixesEnabled() {
        // When aiFixesEnabled=true and run failed during progress, should not show notification
        val progressCIPE = createProgressCIPE()
        val progressWithFailedRunAiEnabled =
            createProgressWithFailedRun().copy(aiFixesEnabled = true)

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(progressWithFailedRunAiEnabled)),
            )

        processor.onDataChanged(event)

        // Should not show notification - waiting for AI fix
        assertTrue(mockListener.events.isEmpty())
    }

    fun testSuccessNotificationShowsEvenWithAiFixesEnabled() {
        // Success notifications should still show even when aiFixesEnabled=true
        val progressCIPE = createProgressCIPE()
        val successWithAiEnabled =
            progressCIPE.copy(
                aiFixesEnabled = true,
                status = CIPEExecutionStatus.SUCCEEDED,
                completedAt = System.currentTimeMillis(),
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(successWithAiEnabled)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPESucceeded)
    }

    fun testTransitionFromAiFixesEnabledToActualAiFix() {
        // When a CIPE transitions from aiFixesEnabled to actually having an AI fix with suggestion
        val progressWithAiEnabled = createProgressCIPE().copy(aiFixesEnabled = true)
        val progressWithAiFix = createProgressWithAiFixAndSuggestion()

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressWithAiEnabled)),
                newData = CIPEDataResponse(info = listOf(progressWithAiFix)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testAutoAppliedFixNotification() {
        // When userAction changes to APPLIED_AUTOMATICALLY, should show notification
        val progressCIPE = createProgressCIPE()
        val withAutoAppliedFix =
            createFailedCIPEWithAiFix()
                .copy(
                    status = CIPEExecutionStatus.FAILED,
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
                                            runUrl = "http://test.url",
                                        )
                                    ),
                                aiFix =
                                    NxAiFix(
                                        aiFixId = "ai-fix-auto",
                                        taskIds = listOf("test-task-1"),
                                        terminalLogsUrls =
                                            mapOf("test-task-1" to "http://logs.url"),
                                        suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                        verificationStatus = AITaskFixStatus.COMPLETED,
                                        suggestedFix = "git diff content...",
                                        suggestedFixDescription = "Auto-applied fix",
                                        userAction = AITaskFixUserAction.APPLIED_AUTOMATICALLY,
                                        couldAutoApplyTasks = true,
                                    ),
                            )
                        ),
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(withAutoAppliedFix)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        val notificationEvent = mockListener.events[0]
        assertTrue(notificationEvent is CIPENotificationEvent.AiFixAvailable)
        assertEquals(
            AITaskFixUserAction.APPLIED_AUTOMATICALLY,
            (notificationEvent as CIPENotificationEvent.AiFixAvailable).runGroup.aiFix?.userAction,
        )
    }

    fun testNoNotificationDuringAutoApplyVerification() {
        // When couldAutoApplyTasks=true but verification is not complete, should not notify
        val progressCIPE = createProgressCIPE()
        val withAutoApplyInProgress =
            createFailedCIPEWithAiFix()
                .copy(
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
                                            runUrl = "http://test.url",
                                        )
                                    ),
                                aiFix =
                                    NxAiFix(
                                        aiFixId = "ai-fix-verifying",
                                        taskIds = listOf("test-task-1"),
                                        terminalLogsUrls =
                                            mapOf("test-task-1" to "http://logs.url"),
                                        suggestedFix = "git diff content...",
                                        suggestedFixDescription = "Verifying fix",
                                        suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                        verificationStatus = AITaskFixStatus.IN_PROGRESS,
                                        userAction = AITaskFixUserAction.NONE,
                                        couldAutoApplyTasks = true,
                                    ),
                            )
                        )
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(withAutoApplyInProgress)),
            )

        processor.onDataChanged(event)

        // Should not show notification while verification is in progress
        assertTrue(mockListener.events.isEmpty())
    }

    fun testNotificationAfterAutoApplyVerificationCompletes() {
        // When verification completes for auto-apply, should show notification
        val withVerifying =
            createFailedCIPEWithAiFix()
                .copy(
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
                                            runUrl = "http://test.url",
                                        )
                                    ),
                                aiFix =
                                    NxAiFix(
                                        aiFixId = "ai-fix-verifying",
                                        taskIds = listOf("test-task-1"),
                                        terminalLogsUrls =
                                            mapOf("test-task-1" to "http://logs.url"),
                                        suggestedFix = "git diff content...",
                                        suggestedFixDescription = "Verifying fix",
                                        suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                        verificationStatus = AITaskFixStatus.IN_PROGRESS,
                                        userAction = AITaskFixUserAction.NONE,
                                        couldAutoApplyTasks = true,
                                    ),
                            )
                        )
                )

        val withVerified =
            withVerifying.copy(
                runGroups =
                    listOf(
                        withVerifying.runGroups[0].copy(
                            aiFix =
                                withVerifying.runGroups[0]
                                    .aiFix
                                    ?.copy(
                                        verificationStatus = AITaskFixStatus.COMPLETED,
                                        userAction = AITaskFixUserAction.APPLIED_AUTOMATICALLY,
                                    )
                        )
                    )
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(withVerifying)),
                newData = CIPEDataResponse(info = listOf(withVerified)),
            )

        processor.onDataChanged(event)

        // Should show notification after verification completes
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testUserActionChangeTriggersNotification() {
        // When userAction changes from NONE to APPLIED, should trigger notification
        val withNoneAction = createFailedCIPEWithAiFix()
        val withAppliedAction =
            withNoneAction.copy(
                runGroups =
                    listOf(
                        withNoneAction.runGroups[0].copy(
                            aiFix =
                                withNoneAction.runGroups[0]
                                    .aiFix
                                    ?.copy(userAction = AITaskFixUserAction.APPLIED)
                        )
                    )
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(withNoneAction)),
                newData = CIPEDataResponse(info = listOf(withAppliedAction)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.AiFixAvailable)
    }

    fun testNoDuplicateNotificationsForSameCIPE() {
        // Should not send duplicate notifications for the same CIPE
        val progressCIPE = createProgressCIPE()
        val failedCIPE =
            progressCIPE.copy(
                status = CIPEExecutionStatus.FAILED,
                completedAt = System.currentTimeMillis(),
            )

        // First transition - should notify
        val event1 =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(progressCIPE)),
                newData = CIPEDataResponse(info = listOf(failedCIPE)),
            )
        processor.onDataChanged(event1)
        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)

        // Reset listener but processor keeps tracking sent notifications
        mockListener.reset()

        // Same CIPE appears again - should NOT notify (already sent)
        val event2 =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(failedCIPE)),
                newData = CIPEDataResponse(info = listOf(failedCIPE)),
            )
        processor.onDataChanged(event2)
        assertTrue(mockListener.events.isEmpty())
    }

    fun testRegularErrorNotificationAfterAiFixTimeoutFromEmpty() {
        // When a new CIPE with aiFixesEnabled failed more than 5 minutes ago without AI fix, show
        // regular error
        val tenMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 10
        val sixMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 6

        val failedCipeWithAiEnabledTimedOut =
            createProgressCIPE()
                .copy(
                    aiFixesEnabled = true,
                    status = CIPEExecutionStatus.FAILED,
                    createdAt = tenMinutesAgo,
                    completedAt = sixMinutesAgo,
                )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = emptyList()),
                newData = CIPEDataResponse(info = listOf(failedCipeWithAiEnabledTimedOut)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)
    }

    fun testDelayedNotificationAfterAiFixTimeout() {
        // When transitioning from waiting for AI fix to timeout, show delayed notification
        val tenMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 10
        val fourMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 4
        val sixMinutesAgo = System.currentTimeMillis() - 1000 * 60 * 6

        val waitingForAiFix =
            createProgressCIPE()
                .copy(
                    aiFixesEnabled = true,
                    status = CIPEExecutionStatus.FAILED,
                    createdAt = tenMinutesAgo,
                    completedAt = fourMinutesAgo,
                )

        val timedOut =
            waitingForAiFix.copy(
                completedAt = sixMinutesAgo // More than 5 minutes
            )

        val event =
            CIPEDataChangedEvent(
                oldData = CIPEDataResponse(info = listOf(waitingForAiFix)),
                newData = CIPEDataResponse(info = listOf(timedOut)),
            )

        processor.onDataChanged(event)

        assertEquals(1, mockListener.events.size)
        assertTrue(mockListener.events[0] is CIPENotificationEvent.CIPEFailed)
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
                                    runUrl = "http://test.url",
                                )
                            ),
                    )
                ),
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
            runGroups = emptyList(),
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
                                    runUrl = "http://test.url",
                                )
                            ),
                    )
                ),
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
            aiFixesEnabled = true,
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
                                    runUrl = "http://test.url",
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-123",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                verificationStatus = AITaskFixStatus.COMPLETED,
                                suggestedFix = "git diff content here...",
                                suggestedFixDescription = "Fix the failing test",
                                userAction = AITaskFixUserAction.NONE,
                            ),
                    )
                ),
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
            aiFixesEnabled = true,
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
                                    runUrl = "http://test.url",
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-456",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFixStatus = AITaskFixStatus.COMPLETED,
                                verificationStatus = AITaskFixStatus.COMPLETED,
                                suggestedFix = "git diff content here...",
                                suggestedFixDescription = "Fix the failing test",
                                userAction = AITaskFixUserAction.NONE,
                            ),
                    )
                ),
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
            aiFixesEnabled = true,
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
                                    runUrl = "http://test.url",
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-789",
                                taskIds = listOf("test-task-1"),
                                terminalLogsUrls = mapOf("test-task-1" to "http://logs.url"),
                                suggestedFixStatus = AITaskFixStatus.IN_PROGRESS,
                                verificationStatus = AITaskFixStatus.IN_PROGRESS,
                                suggestedFix = null,
                                suggestedFixDescription = null,
                                userAction = AITaskFixUserAction.NONE,
                            ),
                    )
                ),
        )

    private fun createProgressWithAiFixNotStarted() =
        CIPEInfo(
            ciPipelineExecutionId = "1",
            branch = "feature",
            status = CIPEExecutionStatus.IN_PROGRESS,
            createdAt = 100000,
            completedAt = null,
            commitTitle = "fix: fix fix",
            commitUrl = "https://github.com/commit/123",
            cipeUrl = "https://cloud.nx.app/cipes/123",
            aiFixesEnabled = true,
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
                                    runUrl = "http://test.url",
                                )
                            ),
                        aiFix =
                            NxAiFix(
                                aiFixId = "ai-fix-789",
                                taskIds = listOf(),
                                terminalLogsUrls = mapOf(),
                                suggestedFixStatus = AITaskFixStatus.NOT_STARTED,
                                verificationStatus = AITaskFixStatus.NOT_STARTED,
                                suggestedFix = null,
                                suggestedFixDescription = null,
                                userAction = AITaskFixUserAction.NONE,
                            ),
                    )
                ),
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
