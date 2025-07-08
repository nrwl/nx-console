package dev.nx.console.utils

import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.changes.ChangeListManager
import com.intellij.openapi.vcs.changes.VcsIgnoreManager
import com.intellij.openapi.vfs.VirtualFileManager
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryManager
import java.io.File

/** Utility functions for Git operations in IntelliJ */
object GitUtils {

    /** Get the Git repository for the project root */
    fun getGitRepository(project: Project): GitRepository? {
        val repositoryManager = GitRepositoryManager.getInstance(project)
        val basePath = project.basePath ?: return null
        val virtualFile = VirtualFileManager.getInstance().findFileByNioPath(File(basePath).toPath())
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
        val hasUntrackedFiles = untrackedFiles.any { file -> !vcsIgnoreManager.isPotentiallyIgnoredFile(file) }

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
            untrackedFiles = untrackedFiles
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
    fun registerGitChangeListener(
        project: Project,
        listener: () -> Unit
    ) {
        ChangeListManager.getInstance(project).invokeAfterUpdate(true) {
            thisLogger().info("ChangeListManager Update triggered")
            listener()
        }

    }
}

/** Data class representing uncommitted changes */
data class UncommittedChanges(
    val modifiedFiles: List<String>,
    val addedFiles: List<String>,
    val deletedFiles: List<String>,
    val untrackedFiles: List<String>
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
