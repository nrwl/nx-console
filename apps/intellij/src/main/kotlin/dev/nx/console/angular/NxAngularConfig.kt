package dev.nx.console.angular

import com.fasterxml.jackson.core.JsonFactory
import com.fasterxml.jackson.core.json.JsonReadFeature
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.text.CharSequenceReader
import org.angular2.cli.config.AngularConfig
import org.angular2.cli.config.AngularJsonProject
import org.angular2.cli.config.AngularProject
import org.angular2.cli.config.AngularProjectImpl

class NxAngularConfig(text: CharSequence, override val file: VirtualFile) : AngularConfig {

  override val projects: List<AngularProject> get() = listOf(defaultProject)

  override val defaultProject: AngularProject

  init {
    val projectFolder = file.parent
    val workspaceFolder =
      findFileUpHierarchy(null, file, "nx.json")?.parent
        ?: projectFolder
    val mapper = ObjectMapper(
      JsonFactory.builder()
        .configure(JsonReadFeature.ALLOW_JAVA_COMMENTS, true)
        .configure(JsonReadFeature.ALLOW_SINGLE_QUOTES, true)
        .configure(JsonReadFeature.ALLOW_MISSING_VALUES, true)
        .configure(JsonReadFeature.ALLOW_TRAILING_COMMA, true)
        .configure(JsonReadFeature.ALLOW_UNQUOTED_FIELD_NAMES, true)
        .build()
    )
      .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
      .configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true)
    val angularProjectJson = mapper.readValue(CharSequenceReader(text), AngularJsonProject::class.java)
    defaultProject = AngularProjectImpl(
      angularProjectJson.name ?: projectFolder.name, angularProjectJson, workspaceFolder
    )
  }

  override fun getProject(context: VirtualFile): AngularProject =
    defaultProject

  override fun toString(): String {
    return """
      | NxAngularConfig {
      |   $defaultProject
      | }
    """.trimMargin()
  }


}
