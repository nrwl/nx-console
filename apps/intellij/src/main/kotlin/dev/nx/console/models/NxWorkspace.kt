package dev.nx.console.models

import kotlinx.serialization.*
import kotlinx.serialization.descriptors.*

data class NxWorkspace(
    val validWorkspaceJson: Boolean,
    val workspace: NxWorkspaceConfiguration,
    val daemonEnabled: Boolean?,
    val workspacePath: String,
    val errors: Array<NxError>?,
    val isLerna: Boolean,
    val nxVersion: NxVersion,
    val isEncapsulatedNx: Boolean,
    val isPartial: Boolean?,
    val workspaceLayout: WorkspaceLayout?,
    val cloudStatus: NxCloudStatus?,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxWorkspace

        if (validWorkspaceJson != other.validWorkspaceJson) return false
        if (workspace != other.workspace) return false
        if (daemonEnabled != other.daemonEnabled) return false
        if (workspacePath != other.workspacePath) return false
        if (errors != null) {
            if (other.errors == null) return false
            if (!errors.contentEquals(other.errors)) return false
        } else if (other.errors != null) return false
        if (isLerna != other.isLerna) return false
        if (nxVersion != other.nxVersion) return false
        if (isEncapsulatedNx != other.isEncapsulatedNx) return false
        if (workspaceLayout != other.workspaceLayout) return false

        return true
    }

    override fun hashCode(): Int {
        var result = validWorkspaceJson.hashCode()
        result = 31 * result + workspace.hashCode()
        result = 31 * result + (daemonEnabled?.hashCode() ?: 0)
        result = 31 * result + workspacePath.hashCode()
        result = 31 * result + (errors?.contentHashCode() ?: 0)
        result = 31 * result + isLerna.hashCode()
        result = 31 * result + nxVersion.hashCode()
        result = 31 * result + isEncapsulatedNx.hashCode()
        result = 31 * result + (workspaceLayout?.hashCode() ?: 0)
        return result
    }
}

data class WorkspaceLayout(val appsDir: String?, val libsDir: String?)

data class NxWorkspaceConfiguration(
    val projects: Map<String, NxProject>
    //    val sourceMaps: Map<String, Map<String, SourceInformation>>?,
) {}

@Serializable()
data class NxError(
    val message: String?,
    val name: String?,
    val stack: String?,
    val file: String?,
    val pluginName: String?,
    @Transient() val cause: Any? = null,
) {

    constructor(message: String) : this(message, null, null, null, null, null)
}

// @Serializable(with = SourceInformationSerializer::class)
// data class SourceInformation(val file: String?, val plugin: String)

//// we deserialize the source maps when receiving them from the nxls - this happens automatically
// via
//// gson
// class SourceInformationDeserializer : JsonDeserializer<SourceInformation> {
//    override fun deserialize(
//        element: JsonElement?,
//        type: Type?,
//        context: JsonDeserializationContext?,
//    ): SourceInformation? {
//        if (element == null || !element.isJsonArray) {
//            return null
//        }
//
//        val jsonArray = element.asJsonArray
//
//        if (jsonArray.size() != 2) {
//            throw JsonParseException("Expected an array of two elements for SourceInformation")
//        }
//
//        val file: String? =
//            if (jsonArray[0].isJsonNull) {
//                null
//            } else {
//                jsonArray[0].asString
//            }
//
//        val plugin: String = jsonArray[1].asString
//
//        return SourceInformation(file, plugin)
//    }
// }
//
//// we serialize the source maps (for example sending them to PDV) via kotlinx.serialization
// object SourceInformationSerializer : KSerializer<SourceInformation> {
//    override val descriptor: SerialDescriptor =
//        buildClassSerialDescriptor("SourceInformation") {
//            element<String?>("file")
//            element<String>("plugin")
//        }
//
//    @OptIn(ExperimentalSerializationApi::class)
//    override fun serialize(encoder: Encoder, value: SourceInformation) {
//        val compositeEncoder = encoder.beginCollection(descriptor, 2)
//        compositeEncoder.encodeNullableSerializableElement(descriptor, 0, serializer(),
// value.file)
//        compositeEncoder.encodeStringElement(descriptor, 1, value.plugin)
//        compositeEncoder.endStructure(descriptor)
//    }
//
//    override fun deserialize(decoder: Decoder): SourceInformation {
//        throw UnsupportedOperationException("Deserialization is not supported")
//    }
// }
