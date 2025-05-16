package dev.nx.console.mcp

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VfsUtil
import dev.nx.console.utils.Notifier
import dev.nx.console.utils.nxBasePath
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.transform.TransformerFactory
import javax.xml.transform.dom.DOMSource
import javax.xml.transform.stream.StreamResult
import org.w3c.dom.Document
import org.w3c.dom.Element

@Service(Service.Level.PROJECT)
class McpServerService(private val project: Project) {

    private val logger = thisLogger()

    fun setupMcpServer() {
        val aiAssistantPlugin =
            PluginManagerCore.plugins.find { it.pluginId.idString == "com.intellij.ml.llm" }
        if (aiAssistantPlugin == null) {
            return
        }
        if (isMcpServerSetup()) {
            logger.info("[MCP] MCP server is already set up, no action needed")
            Notifier.notifyAnything(
                project,
                "The Nx MCP Server is already configured for this workspace.",
            )
            return
        }

        addMCPServerToWorkspaceXml()
        VfsUtil.markDirtyAndRefresh(
            true,
            true,
            true,
            VfsUtil.findFileByIoFile(
                File(project.nxBasePath).resolve(".idea").resolve("workspace.xml"),
                true,
            ),
        )

        Notifier.notifyMCPSettingNeedsRefresh(project)
    }

    private fun isMcpServerSetup(): Boolean {
        val workspaceFile = getWorkspaceXmlFile()

        if (!workspaceFile.exists()) {
            return false
        }

        try {
            // Parse the XML and check if McpServerCommand exists
            val doc = parseXmlFile(workspaceFile)
            val components = doc.getElementsByTagName("component")

            for (i in 0 until components.length) {
                val component = components.item(i) as Element
                val componentName = component.getAttribute("name")

                if (componentName == "McpProjectServerCommands") {
                    // Check if it has a McpServerCommand child
                    val serverCommands = component.getElementsByTagName("McpServerCommand")
                    val serverCommandsCount = serverCommands.length
                    return serverCommandsCount > 0
                }
            }

            return false
        } catch (e: Exception) {
            logger.error("[MCP] Error checking if MCP server is setup", e)
            return false
        }
    }

    private fun addMCPServerToWorkspaceXml() {
        val workspaceFile = getWorkspaceXmlFile()

        if (!workspaceFile.exists()) {
            logger.warn("[MCP] Workspace file does not exist: ${workspaceFile.absolutePath}")
            return
        }

        try {
            val doc = parseXmlFile(workspaceFile)

            // Check if the component already exists
            var mcpComponent: Element? = null
            val components = doc.getElementsByTagName("component")

            for (i in 0 until components.length) {
                val component = components.item(i) as Element
                if (component.getAttribute("name") == "McpProjectServerCommands") {
                    mcpComponent = component
                    break
                }
            }

            // If component doesn't exist, create it
            if (mcpComponent == null) {
                mcpComponent = doc.createElement("component")
                mcpComponent.setAttribute("name", "McpProjectServerCommands")
                doc.documentElement.appendChild(mcpComponent)
            }

            // Check if McpServerCommand already exists
            val serverCommands = mcpComponent!!.getElementsByTagName("McpServerCommand")
            if (serverCommands.length > 0) {
                // Command already exists, we don't need to add another one
                logger.warn("[MCP] Mcp component already exists")

                return
            }

            // Create McpServerCommand element
            val mcpServerCommand = doc.createElement("McpServerCommand")
            mcpComponent.appendChild(mcpServerCommand)

            // Add options
            addOption(doc, mcpServerCommand, "enabled", "true")
            addOption(doc, mcpServerCommand, "name", "nx-mcp")
            addOption(doc, mcpServerCommand, "programPath", "npx")

            // Use the current workspace path
            val workspacePath = project.nxBasePath
            addOption(doc, mcpServerCommand, "arguments", "nx-mcp@latest $workspacePath")
            addOption(doc, mcpServerCommand, "workingDirectory", "")

            // Add empty envs element
            val envs = doc.createElement("envs")
            mcpServerCommand.appendChild(envs)

            // Write the modified XML back to the file
            writeXmlFile(doc, workspaceFile)
            logger.info("[MCP] MCP server setup completed successfully")
        } catch (e: Exception) {
            logger.error("[MCP] Error modifying workspace.xml", e)
        }
    }

    private fun addOption(doc: Document, parent: Element, name: String, value: String) {
        val option = doc.createElement("option")
        option.setAttribute("name", name)
        option.setAttribute("value", value)
        parent.appendChild(option)
    }

    private fun getWorkspaceXmlFile(): File {
        val projectPath = project.basePath ?: return File("")

        val workspaceFile = File(projectPath, ".idea/workspace.xml")
        return workspaceFile
    }

    private fun parseXmlFile(file: File): Document {
        try {
            val factory = DocumentBuilderFactory.newInstance()
            val builder = factory.newDocumentBuilder()
            val document = builder.parse(file)
            return document
        } catch (e: Exception) {
            logger.error("[MCP] Error parsing XML file: ${file.absolutePath}", e)
            throw e
        }
    }

    private fun writeXmlFile(doc: Document, file: File) {
        try {
            val transformer = TransformerFactory.newInstance().newTransformer()
            val source = DOMSource(doc)
            val result = StreamResult(file)
            transformer.transform(source, result)
        } catch (e: Exception) {
            logger.error("[MCP] Error writing XML to file: ${file.absolutePath}", e)
            throw e
        }
    }

    companion object {
        fun getInstance(project: Project): McpServerService {
            return project.getService(McpServerService::class.java)
        }
    }
}
