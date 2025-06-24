package dev.nx.console.utils

import com.intellij.openapi.util.SystemInfo
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class NxExecutableTest : BasePlatformTestCase() {

    fun testExecutablePathDetectionForStandardInstallation() {
        val tempDir = Files.createTempDirectory("nx-test").toFile()
        val nodeModulesDir = File(tempDir, "node_modules")
        val binDir = File(nodeModulesDir, ".bin")
        binDir.mkdirs()

        val nxExecutableName = if (SystemInfo.isWindows) "nx.bat" else "nx"
        val nxExecutable = File(binDir, nxExecutableName)
        nxExecutable.createNewFile()
        nxExecutable.setExecutable(true)

        val packageJson = File(tempDir, "package.json")
        packageJson.writeText("{\"name\": \"test-project\"}")

        assertTrue(
            isDotNxInstallation(tempDir.absolutePath),
            "Should not be a dot nx installation",
        )

        tempDir.deleteRecursively()
    }

    fun testIsDotNxInstallation() {
        val tempDirWithNx = Files.createTempDirectory("nx-test-dot").toFile()
        val nxExecutableName = if (SystemInfo.isWindows) "nx.bat" else "nx"
        val nxExecutable = File(tempDirWithNx, nxExecutableName)
        nxExecutable.createNewFile()

        assertTrue(
            isDotNxInstallation(tempDirWithNx.absolutePath),
            "Should detect dot nx installation when nx executable exists at root",
        )

        nxExecutable.delete()

        assertFalse(
            isDotNxInstallation(tempDirWithNx.absolutePath),
            "Should not detect dot nx installation when nx executable doesn't exist",
        )

        val nxDir = File(tempDirWithNx, nxExecutableName)
        nxDir.mkdir()

        assertFalse(
            isDotNxInstallation(tempDirWithNx.absolutePath),
            "Should not detect dot nx installation when nx is a directory",
        )

        tempDirWithNx.deleteRecursively()
    }

    fun testGetNxPackagePathForDotNxInstallation() {
        val tempDir = Files.createTempDirectory("nx-test-pkg").toFile()
        val nxExecutableName = if (SystemInfo.isWindows) "nx.bat" else "nx"
        val nxExecutable = File(tempDir, nxExecutableName)
        nxExecutable.createNewFile()

        val expectedPath =
            Paths.get(tempDir.absolutePath, ".nx", "installation", "node_modules", "nx").toString()

        assertTrue(isDotNxInstallation(tempDir.absolutePath), "Should be a dot nx installation")

        val actualPath = getNxPackagePath(project, tempDir.absolutePath)
        assertEquals(
            "Should return correct nx package path for dot nx installation",
            expectedPath,
            actualPath,
        )

        tempDir.deleteRecursively()
    }

    fun testGetNxPackagePathForStandardInstallation() {
        val tempDir = Files.createTempDirectory("nx-test-std").toFile()

        assertFalse(
            isDotNxInstallation(tempDir.absolutePath),
            "Should not be a dot nx installation",
        )

        val expectedPath = Paths.get(tempDir.absolutePath, "node_modules", "nx").toString()
        val actualPath = getNxPackagePath(project, tempDir.absolutePath)

        assertEquals(
            "Should return correct nx package path for standard installation",
            expectedPath,
            actualPath,
        )

        tempDir.deleteRecursively()
    }
}
