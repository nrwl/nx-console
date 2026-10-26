package dev.nx.console.utils.sync_services

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.models.NxVersion
import dev.nx.console.settings.NxConsoleProjectSettingsProvider
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

class NxVersionUtilTest : BasePlatformTestCase() {

    private lateinit var workspace: Path

    private data class Probe(
        val onDispatchThread: Boolean,
        val readAccessAllowed: Boolean,
        val version: NxVersion?,
    )

    override fun setUp() {
        super.setUp()
        workspace = Files.createTempDirectory("nx-version-util-test")
        Files.writeString(
            workspace.resolve("package.json"),
            """{ "devDependencies": { "nx": "22.6.3" } }""",
        )
        LocalFileSystem.getInstance().refreshAndFindFileByNioFile(workspace)
        NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = workspace.toString()
    }

    override fun tearDown() {
        try {
            NxConsoleProjectSettingsProvider.getInstance(project).workspacePath = null
            workspace.toFile().deleteRecursively()
        } finally {
            super.tearDown()
        }
    }

    private fun probeFromBackgroundThread(): Probe =
        ApplicationManager.getApplication()
            .executeOnPooledThread<Probe> {
                val application = ApplicationManager.getApplication()
                Probe(
                    onDispatchThread = application.isDispatchThread,
                    readAccessAllowed = application.isReadAccessAllowed,
                    version = NxVersionUtil.getInstance(project).getNxVersionSynchronously(),
                )
            }
            .get(60, TimeUnit.SECONDS)

    fun testFallbackParsesPackageJsonOffTheDispatchThread() {
        val probe = probeFromBackgroundThread()

        assertFalse("must exercise the non-dispatch branch", probe.onDispatchThread)
        assertFalse("must start without an ambient read action", probe.readAccessAllowed)
        assertEquals("22.6.3", probe.version?.full)
    }

    fun testFallbackReportsMajorAndMinorTheRightWayAround() {
        val version = probeFromBackgroundThread().version

        assertNotNull(version)
        assertEquals(22, version!!.major)
        assertEquals(6, version.minor)
    }
}
