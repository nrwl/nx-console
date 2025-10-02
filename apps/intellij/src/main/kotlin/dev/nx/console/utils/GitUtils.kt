package dev.nx.console.utils

import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.changes.ChangeListManager
import com.intellij.openapi.vcs.changes.VcsIgnoreManager
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.xml.util.XmlStringUtil
import git4idea.commands.Git
import git4idea.commands.GitCommand
import git4idea.commands.GitLineHandler
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryManager
import java.io.File

/** Utility functions for Git operations in IntelliJ */
object GitUtils {

    /** Get the Git repository for the project root */
    fun getGitRepository(project: Project): GitRepository? {
        val repositoryManager = GitRepositoryManager.getInstance(project)
        val basePath = project.basePath ?: return null
        val virtualFile =
            VirtualFileManager.getInstance().findFileByNioPath(File(basePath).toPath())
        return repositoryManager.getRepositoryForRootQuick(virtualFile)
    }

    /** Get the current Git branch name */
    fun getCurrentBranch(project: Project): String? {
        val repository = getGitRepository(project) ?: return null
        return repository.currentBranch?.name
    }

    /**
     * Check if there are uncommitted changes in the repository This includes:
     * - Modified files
     * - Added files (staged)
     * - Deleted files
     * - Untracked files
     */
    fun hasUncommittedChanges(project: Project): Boolean {
        val changeListManager = ChangeListManager.getInstance(project)

        // Check for any changes in change lists
        val hasTrackedChanges =
            changeListManager.changeLists.any { changeList -> changeList.changes.isNotEmpty() }

        // Check for untracked files
        val vcsIgnoreManager = VcsIgnoreManager.getInstance(project)
        val untrackedFiles = changeListManager.unversionedFilesPaths
        val hasUntrackedFiles =
            untrackedFiles.any { file -> !vcsIgnoreManager.isPotentiallyIgnoredFile(file) }

        return hasTrackedChanges || hasUntrackedFiles
    }

    /** Get all uncommitted changes categorized by type */
    fun getUncommittedChanges(project: Project): UncommittedChanges {
        val changeListManager = ChangeListManager.getInstance(project)
        val vcsIgnoreManager = VcsIgnoreManager.getInstance(project)

        val modifiedFiles = mutableListOf<String>()
        val addedFiles = mutableListOf<String>()
        val deletedFiles = mutableListOf<String>()

        // Process all changes from all change lists
        changeListManager.changeLists.forEach { changeList ->
            changeList.changes.forEach { change ->
                val filePath = change.virtualFile?.path ?: change.beforeRevision?.file?.path
                filePath?.let {
                    when {
                        change.beforeRevision == null -> addedFiles.add(it)
                        change.afterRevision == null -> deletedFiles.add(it)
                        else -> modifiedFiles.add(it)
                    }
                }
            }
        }

        // Get untracked files (excluding ignored ones)
        val untrackedFiles =
            changeListManager.unversionedFilesPaths
                .filter { !vcsIgnoreManager.isPotentiallyIgnoredFile(it) }
                .map { it.path }

        return UncommittedChanges(
            modifiedFiles = modifiedFiles,
            addedFiles = addedFiles,
            deletedFiles = deletedFiles,
            untrackedFiles = untrackedFiles,
        )
    }

    /** Check if the project is a Git repository */
    fun isGitRepository(project: Project): Boolean {
        return getGitRepository(project) != null
    }

    /** Get all Git repositories in the project (for multi-repo projects) */
    fun getAllRepositories(project: Project): List<GitRepository> {
        return GitRepositoryManager.getInstance(project).repositories
    }

    /** Register a listener for Git state changes */
    fun registerGitChangeListener(project: Project, listener: () -> Unit) {
        ChangeListManager.getInstance(project).invokeAfterUpdate(true) {
            thisLogger().info("ChangeListManager Update triggered")
            listener()
        }
    }

    /**
     * Check if a branch exists on the remote repository
     *
     * @param project The IntelliJ project
     * @param branchName The name of the branch to check (without 'origin/' prefix)
     * @return true if the branch exists on the remote, false otherwise
     */
    fun checkBranchExistsOnRemote(project: Project, branchName: String): Boolean {
        val repository = getGitRepository(project) ?: return false
        val remoteBranches = repository.branches.remoteBranches
        return remoteBranches.any { it.name == "origin/$branchName" }
    }

    /**
     * Fetch and pull changes from remote for a specific branch. If on the target branch, performs a
     * fast-forward pull. If on a different branch, updates the local branch reference without
     * checking it out.
     *
     * @param project The IntelliJ project
     * @param targetBranch The branch to fetch and pull from
     */
    fun fetchAndPullChanges(project: Project, targetBranch: String) {
        val repository = getGitRepository(project)
        if (repository == null) {
            showNotification(
                project,
                "Failed to fetch and pull changes",
                "Could not find git repository",
                NotificationType.ERROR,
            )
            return
        }

        ProgressManager.getInstance()
            .run(
                object : Task.Backgroundable(project, "Fetching and Pulling Changes", false) {
                    override fun run(indicator: ProgressIndicator) {
                        try {
                            indicator.text = "Fetching from origin..."

                            // Always refresh remotes first
                            val fetchHandler =
                                GitLineHandler(project, repository.root, GitCommand.FETCH)
                            fetchHandler.addParameters("origin")
                            val fetchResult = Git.getInstance().runCommand(fetchHandler)

                            if (!fetchResult.success()) {
                                val errorMsg =
                                    fetchResult.errorOutputAsJoinedString.ifEmpty {
                                        "Unknown error"
                                    }
                                showNotification(
                                    project,
                                    "Failed to fetch from origin",
                                    errorMsg,
                                    NotificationType.ERROR,
                                )
                                return
                            }

                            // Get current branch name
                            val currentBranch = getCurrentBranch(project)

                            indicator.text = "Updating branch..."

                            if (currentBranch == targetBranch) {
                                // On target branch: fast-forward working tree
                                val pullHandler =
                                    GitLineHandler(project, repository.root, GitCommand.PULL)
                                pullHandler.addParameters("--ff-only", "origin", targetBranch)
                                val pullResult = Git.getInstance().runCommand(pullHandler)

                                if (!pullResult.success()) {
                                    val errorMsg =
                                        pullResult.errorOutputAsJoinedString.ifEmpty {
                                            "Unknown error"
                                        }
                                    showNotification(
                                        project,
                                        "Failed to pull changes",
                                        errorMsg,
                                        NotificationType.ERROR,
                                    )
                                    return
                                }
                            } else {
                                // On another branch: fast-forward local target branch without
                                // checking it out
                                val fetchBranchHandler =
                                    GitLineHandler(project, repository.root, GitCommand.FETCH)
                                fetchBranchHandler.addParameters(
                                    "origin",
                                    "$targetBranch:$targetBranch",
                                )
                                val fetchBranchResult =
                                    Git.getInstance().runCommand(fetchBranchHandler)

                                if (!fetchBranchResult.success()) {
                                    val errorMsg =
                                        fetchBranchResult.errorOutputAsJoinedString.ifEmpty {
                                            "Unknown error"
                                        }
                                    showNotification(
                                        project,
                                        "Failed to update branch",
                                        errorMsg,
                                        NotificationType.ERROR,
                                    )
                                    return
                                }
                            }

                            // Update repository state
                            repository.update()

                            showNotification(
                                project,
                                "Successfully updated branch",
                                "Branch '$targetBranch' has been updated with remote changes",
                                NotificationType.INFORMATION,
                            )
                        } catch (e: Exception) {
                            thisLogger().error("Failed to fetch and pull changes", e)
                            showNotification(
                                project,
                                "Failed to fetch and pull changes",
                                e.message ?: "Unknown error",
                                NotificationType.ERROR,
                            )
                        }
                    }
                }
            )
    }

    /** Show a notification to the user */
    private fun showNotification(
        project: Project,
        title: String,
        content: String,
        type: NotificationType,
    ) {
        val notificationGroup =
            NotificationGroupManager.getInstance().getNotificationGroup("Nx Cloud CIPE")
        val notification = notificationGroup.createNotification(content, type)
        notification.setTitle(title)
        notification.notify(project)
    }
}

/** Data class representing uncommitted changes */
data class UncommittedChanges(
    val modifiedFiles: List<String>,
    val addedFiles: List<String>,
    val deletedFiles: List<String>,
    val untrackedFiles: List<String>,
) {
    val hasAnyChanges: Boolean
        get() =
            modifiedFiles.isNotEmpty() ||
                addedFiles.isNotEmpty() ||
                deletedFiles.isNotEmpty() ||
                untrackedFiles.isNotEmpty()

    val totalChangeCount: Int
        get() = modifiedFiles.size + addedFiles.size + deletedFiles.size + untrackedFiles.size
}

class FetchAndPullChangesAction(private val targetBranch: String) :
        NotificationAction("Fetch and Pull Changes") {
        override fun actionPerformed(e: AnActionEvent, notification: Notification) {
            val project = e.project ?: return
            GitUtils.fetchAndPullChanges(project, targetBranch)
            notification.expire()
        }
    }
