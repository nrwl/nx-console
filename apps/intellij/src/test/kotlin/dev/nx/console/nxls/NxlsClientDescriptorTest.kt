package dev.nx.console.nxls

import com.intellij.platform.lsp.api.customization.LspCompletionSupport
import com.intellij.platform.lsp.api.customization.LspDocumentLinkSupport
import com.intellij.platform.lsp.api.customization.LspGoToDefinitionSupport
import com.intellij.platform.lsp.api.customization.LspHoverSupport
import com.intellij.testFramework.LightVirtualFile
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import dev.nx.console.nxls.server.NxlsLanguageServer
import dev.nx.console.settings.NxConsoleSettingsProvider
import dev.nx.console.utils.nxlsWorkingPath
import kotlin.test.assertEquals as assertEqual
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class NxlsClientDescriptorTest : BasePlatformTestCase() {
    private lateinit var harness: PlatformLspTestHarness
    private lateinit var descriptor: NxlsClientDescriptor

    override fun setUp() {
        super.setUp()
        harness =
            PlatformLspTestHarness(project, myFixture.tempDirFixture.findOrCreateDir("nested"))
        descriptor = harness.start().descriptor
    }

    override fun tearDown() {
        try {
            harness.session.dispose()
        } finally {
            super.tearDown()
        }
    }

    fun testExplicitRootAndInitializationOptions() {
        assertEqual(listOf(harness.root), descriptor.roots.toList())
        val options = descriptor.createInitializationOptions() as Map<*, *>
        assertEqual(nxlsWorkingPath(harness.root.path), options["workspacePath"])
        assertEqual(
            NxConsoleSettingsProvider.getInstance().enableDebugLogging,
            options["enableDebugLogging"],
        )
        assertFalse(options.containsKey("disableFileWatching"))
        assertEqual(NxlsLanguageServer::class.java, descriptor.lsp4jServerClass)
    }

    fun testJsonLanguageAndExactFourFileNames() {
        for (name in listOf("nx.json", "workspace.json", "project.json", "package.json")) {
            val file = LightVirtualFile(name)
            assertTrue(descriptor.isSupportedFile(file))
            assertEqual("json", descriptor.getLanguageId(file))
        }
        for (name in
            listOf("lerna.json", "tsconfig.json", "NX.json", "other.json", "nx.json.bak")) {
            assertFalse(descriptor.isSupportedFile(LightVirtualFile(name)))
        }
    }

    fun testAllFourAdvertisedFeaturesUsePlatformSupport() {
        val customization = descriptor.lspCustomization
        assertIs<LspCompletionSupport>(customization.completionCustomizer)
        assertIs<LspHoverSupport>(customization.hoverCustomizer)
        assertIs<LspGoToDefinitionSupport>(customization.goToDefinitionCustomizer)
        assertIs<LspDocumentLinkSupport>(customization.documentLinkCustomizer)
    }
}
