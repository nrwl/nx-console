package dev.nx.console.nx_toolwindow.cloud_tree.models

import dev.nx.console.models.*

object MockCIPEDataProvider {
    
    fun getMockCIPEData(): List<CIPEInfo> {
        val now = System.currentTimeMillis()
        
        return listOf(
            // Currently running pipeline
            CIPEInfo(
                ciPipelineExecutionId = "cipe-1",
                branch = "feature/user-authentication",
                status = CIPEExecutionStatus.IN_PROGRESS,
                createdAt = now - 2 * 60 * 1000, // 2 minutes ago
                completedAt = null,
                commitTitle = "Add user authentication flow",
                commitUrl = "https://github.com/myorg/myrepo/commit/abc123",
                author = "John Doe",
                authorAvatarUrl = null,
                cipeUrl = "https://cloud.nx.app/cipe/cipe-1",
                runGroups = listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "github",
                        runGroup = "Affected Projects",
                        createdAt = now - 2 * 60 * 1000,
                        completedAt = null,
                        status = CIPEExecutionStatus.IN_PROGRESS,
                        runs = listOf(
                            CIPERun(
                                linkId = "link-1-1",
                                executionId = "exec-1-1",
                                command = "nx affected:build",
                                status = CIPEExecutionStatus.SUCCEEDED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 5,
                                runUrl = "https://cloud.nx.app/runs/run-1-1"
                            ),
                            CIPERun(
                                linkId = "link-1-2",
                                executionId = "exec-1-2",
                                command = "nx affected:test",
                                status = CIPEExecutionStatus.IN_PROGRESS,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 8,
                                runUrl = "https://cloud.nx.app/runs/run-1-2"
                            ),
                            CIPERun(
                                linkId = "link-1-3",
                                executionId = "exec-1-3",
                                command = "nx affected:lint",
                                status = CIPEExecutionStatus.NOT_STARTED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 3,
                                runUrl = "https://cloud.nx.app/runs/run-1-3"
                            )
                        ),
                        aiFix = null
                    )
                )
            ),
            
            // Failed pipeline with AI fixes
            CIPEInfo(
                ciPipelineExecutionId = "cipe-2",
                branch = "main",
                status = CIPEExecutionStatus.FAILED,
                createdAt = now - 30 * 60 * 1000, // 30 minutes ago
                completedAt = now - 25 * 60 * 1000,
                commitTitle = "Update dependencies",
                commitUrl = "https://github.com/myorg/myrepo/commit/def456",
                author = "Jane Smith",
                authorAvatarUrl = null,
                cipeUrl = "https://cloud.nx.app/cipe/cipe-2",
                runGroups = listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "github",
                        runGroup = "Build & Test",
                        createdAt = now - 30 * 60 * 1000,
                        completedAt = now - 25 * 60 * 1000,
                        status = CIPEExecutionStatus.FAILED,
                        runs = listOf(
                            CIPERun(
                                linkId = "link-2-1",
                                executionId = "exec-2-1",
                                command = "nx run-many -t build",
                                status = CIPEExecutionStatus.FAILED,
                                failedTasks = listOf("api:build", "shared-ui:build"),
                                numFailedTasks = 2,
                                numTasks = 10,
                                runUrl = "https://cloud.nx.app/runs/run-2-1"
                            ),
                            CIPERun(
                                linkId = "link-2-2",
                                executionId = "exec-2-2",
                                command = "nx run-many -t test",
                                status = CIPEExecutionStatus.FAILED,
                                failedTasks = listOf("api:test"),
                                numFailedTasks = 1,
                                numTasks = 12,
                                runUrl = "https://cloud.nx.app/runs/run-2-2"
                            )
                        ),
                        aiFix = NxAiFix(
                            aiFixId = "fix-1",
                            taskIds = listOf("api:build", "shared-ui:build"),
                            terminalLogsUrls = mapOf(
                                "api:build" to "https://cloud.nx.app/terminal/task-1",
                                "shared-ui:build" to "https://cloud.nx.app/terminal/task-2"
                            ),
                            suggestedFix = "Update TypeScript imports",
                            suggestedFixDescription = "The imports need to be updated after the dependency upgrade",
                            verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                            userAction = AITaskFixUserAction.NONE
                        )
                    )
                )
            ),
            
            // Successful pipeline
            CIPEInfo(
                ciPipelineExecutionId = "cipe-3",
                branch = "release/v2.0",
                status = CIPEExecutionStatus.SUCCEEDED,
                createdAt = now - 2 * 60 * 60 * 1000, // 2 hours ago
                completedAt = now - 110 * 60 * 1000,
                commitTitle = "Prepare v2.0 release",
                commitUrl = "https://github.com/myorg/myrepo/commit/ghi789",
                author = "Bob Johnson",
                authorAvatarUrl = null,
                cipeUrl = "https://cloud.nx.app/cipe/cipe-3",
                runGroups = listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "github",
                        runGroup = "CI Pipeline",
                        createdAt = now - 2 * 60 * 60 * 1000,
                        completedAt = now - 110 * 60 * 1000,
                        status = CIPEExecutionStatus.SUCCEEDED,
                        runs = listOf(
                            CIPERun(
                                linkId = "link-3-1",
                                executionId = "exec-3-1",
                                command = "nx run-many -t build --prod",
                                status = CIPEExecutionStatus.SUCCEEDED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 15,
                                runUrl = "https://cloud.nx.app/runs/run-3-1"
                            ),
                            CIPERun(
                                linkId = "link-3-2",
                                executionId = "exec-3-2",
                                command = "nx run-many -t test --coverage",
                                status = CIPEExecutionStatus.SUCCEEDED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 20,
                                runUrl = "https://cloud.nx.app/runs/run-3-2"
                            ),
                            CIPERun(
                                linkId = "link-3-3",
                                executionId = "exec-3-3",
                                command = "nx run-many -t e2e",
                                status = CIPEExecutionStatus.SUCCEEDED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 5,
                                runUrl = "https://cloud.nx.app/runs/run-3-3"
                            )
                        ),
                        aiFix = null
                    )
                )
            ),
            
            // Pipeline with applied AI fix
            CIPEInfo(
                ciPipelineExecutionId = "cipe-4",
                branch = "fix/memory-leak",
                status = CIPEExecutionStatus.FAILED,
                createdAt = now - 4 * 60 * 60 * 1000, // 4 hours ago
                completedAt = now - (3.5 * 60 * 60 * 1000).toLong(),
                commitTitle = "Fix memory leak in dashboard",
                commitUrl = "https://github.com/myorg/myrepo/commit/jkl012",
                author = "Alice Cooper",
                authorAvatarUrl = null,
                cipeUrl = "https://cloud.nx.app/cipe/cipe-4",
                runGroups = listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "github",
                        runGroup = "Performance Tests",
                        createdAt = now - 4 * 60 * 60 * 1000,
                        completedAt = now - (3.5 * 60 * 60 * 1000).toLong(),
                        status = CIPEExecutionStatus.FAILED,
                        runs = listOf(
                            CIPERun(
                                linkId = "link-4-1",
                                executionId = "exec-4-1",
                                command = "nx e2e web-e2e --performance",
                                status = CIPEExecutionStatus.FAILED,
                                failedTasks = listOf("web-e2e:e2e"),
                                numFailedTasks = 1,
                                numTasks = 1,
                                runUrl = "https://cloud.nx.app/runs/run-4-1"
                            )
                        ),
                        aiFix = NxAiFix(
                            aiFixId = "fix-3",
                            taskIds = listOf("web-e2e:e2e"),
                            terminalLogsUrls = mapOf(
                                "web-e2e:e2e" to "https://cloud.nx.app/terminal/task-3"
                            ),
                            suggestedFix = "Add cleanup in useEffect",
                            suggestedFixDescription = "Memory leak detected due to missing cleanup function",
                            verificationStatus = AITaskFixVerificationStatus.COMPLETED,
                            userAction = AITaskFixUserAction.APPLIED
                        )
                    )
                )
            ),
            
            // Canceled pipeline
            CIPEInfo(
                ciPipelineExecutionId = "cipe-5",
                branch = "experiment/new-feature",
                status = CIPEExecutionStatus.CANCELED,
                createdAt = now - 24 * 60 * 60 * 1000, // 1 day ago
                completedAt = now - (23.5 * 60 * 60 * 1000).toLong(),
                commitTitle = "Experimental feature",
                commitUrl = "https://github.com/myorg/myrepo/commit/mno345",
                author = "Eve Wilson",
                authorAvatarUrl = null,
                cipeUrl = "https://cloud.nx.app/cipe/cipe-5",
                runGroups = listOf(
                    CIPERunGroup(
                        ciExecutionEnv = "github",
                        runGroup = "Tests",
                        createdAt = now - 24 * 60 * 60 * 1000,
                        completedAt = now - (23.5 * 60 * 60 * 1000).toLong(),
                        status = CIPEExecutionStatus.CANCELED,
                        runs = listOf(
                            CIPERun(
                                linkId = "link-5-1",
                                executionId = "exec-5-1",
                                command = "nx affected:test",
                                status = CIPEExecutionStatus.CANCELED,
                                failedTasks = emptyList(),
                                numFailedTasks = 0,
                                numTasks = 10,
                                runUrl = "https://cloud.nx.app/runs/run-5-1"
                            )
                        ),
                        aiFix = null
                    )
                )
            )
        )
    }
    
    fun getEmptyCIPEData(): List<CIPEInfo> = emptyList()
}