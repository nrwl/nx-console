package dev.nx.console.nxls

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import java.lang.reflect.Proxy
import java.nio.file.Files
import kotlin.test.assertNull
import kotlin.test.assertSame

class NxlsWorkspaceRootResolverTest : BasePlatformTestCase() {
    private lateinit var root: VirtualFile
    private lateinit var base: VirtualFile
    private lateinit var resolver: NxlsWorkspaceRootResolver

    override fun setUp() {
        super.setUp()
        root =
            checkNotNull(
                LocalFileSystem.getInstance()
                    .refreshAndFindFileByNioFile(Files.createTempDirectory("nxls-root-"))
            )
        base = directory("apps/editor")
        val rootedProject =
            Proxy.newProxyInstance(Project::class.java.classLoader, arrayOf(Project::class.java)) {
                _,
                method,
                args ->
                if (method.name == "getBasePath") base.path
                else method.invoke(project, *(args ?: emptyArray()))
            } as Project
        resolver = NxlsWorkspaceRootResolver(rootedProject)
    }

    override fun tearDown() {
        try {
            NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = null
            ApplicationManager.getApplication().runWriteAction { root.delete(this) }
        } finally {
            super.tearDown()
        }
    }

    private fun directory(path: String): VirtualFile {
        var directory: VirtualFile? = null
        ApplicationManager.getApplication().runWriteAction {
            directory = VfsUtil.createDirectoryIfMissing(root, path)
        }
        return checkNotNull(directory)
    }

    private fun marker(directory: VirtualFile, name: String = "nx.json"): VirtualFile {
        var file: VirtualFile? = null
        ApplicationManager.getApplication().runWriteAction {
            file = directory.createChildData(this, name)
        }
        return checkNotNull(file)
    }

    fun testWalksAncestorsAndNeverScansDescendants() {
        marker(directory("apps/editor/child"))
        assertNull(resolver.resolve())
        marker(root)
        assertSame(root, resolver.resolve())
    }

    fun testConfiguredWorkspaceWinsWithoutRequiringMarker() {
        marker(root)
        val nested = directory("apps/editor/nested")
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = "nested"
        assertSame(nested, resolver.resolve())
    }

    fun testSettingsChangeIsReflected() {
        marker(root)
        assertSame(root, resolver.resolve())
        val nested = directory("apps/editor/nested")
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = nested.path
        assertSame(nested, resolver.resolve())
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = null
        assertSame(root, resolver.resolve())
    }

    fun testMarkerCreationAndDeletionAreReflected() {
        marker(root, "lerna.json")
        assertSame(root, resolver.resolve())
        val nearerMarker = marker(base, "workspace.json")
        assertSame(base, resolver.resolve())
        ApplicationManager.getApplication().runWriteAction { nearerMarker.delete(this) }
        assertSame(root, resolver.resolve())
    }

    fun testRenamingMarkerIsReflected() {
        val file = marker(root)
        assertSame(root, resolver.resolve())
        ApplicationManager.getApplication().runWriteAction { file.rename(this, "old-nx.json") }
        assertNull(resolver.resolve())
        ApplicationManager.getApplication().runWriteAction { file.rename(this, "nx.json") }
        assertSame(root, resolver.resolve())
    }

    fun testMissingConfiguredWorkspaceDoesNotFallBackToOtherRoot() {
        marker(root)
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = "missing"
        assertNull(resolver.resolve())
    }
}
