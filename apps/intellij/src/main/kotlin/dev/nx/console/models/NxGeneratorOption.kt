package dev.nx.console.models

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import java.lang.reflect.Type
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
sealed interface NxGeneratorOption {
    val name: String
    val isRequired: Boolean?
    val deprecated: Boolean?
    val description: String?
    val type: String?
    val enum: List<String>?
    var items: List<String>?
    val priority: String?
    val dropdown: String?
}

@Serializable
data class NxOptionWithNoDefault(
    override val name: String,
    override val isRequired: Boolean?,
    override val deprecated: Boolean?,
    override val description: String?,
    override val type: String?,
    override val enum: List<String>?,
    override var items: List<String>?,
    @SerializedName("x-priority") @SerialName("x-priority") override val priority: String?,
    @SerializedName("x-dropdown") @SerialName("x-dropdown") override val dropdown: String?
) : NxGeneratorOption

@Serializable
data class NxOptionWithStringDefault(
    val default: String,
    override val name: String,
    override val isRequired: Boolean?,
    override val deprecated: Boolean?,
    override val description: String?,
    override val type: String?,
    override val enum: List<String>?,
    override var items: List<String>?,
    @SerializedName("x-priority") @SerialName("x-priority") override val priority: String?,
    @SerializedName("x-dropdown") @SerialName("x-dropdown") override val dropdown: String?
) : NxGeneratorOption

@Serializable
data class NxOptionWithBooleanDefault(
    val default: Boolean,
    override val name: String,
    override val isRequired: Boolean?,
    override val deprecated: Boolean?,
    override val description: String?,
    override val type: String?,
    override val enum: List<String>?,
    override var items: List<String>?,
    @SerializedName("x-priority") @SerialName("x-priority") override val priority: String?,
    @SerializedName("x-dropdown") @SerialName("x-dropdown") override val dropdown: String?
) : NxGeneratorOption

@Serializable
data class NxOptionWithArrayDefault(
    val default: List<String>,
    override val name: String,
    override val isRequired: Boolean?,
    override val deprecated: Boolean?,
    override val description: String?,
    override val type: String?,
    override val enum: List<String>?,
    override var items: List<String>?,
    @SerializedName("x-priority") @SerialName("x-priority") override val priority: String?,
    @SerializedName("x-dropdown") @SerialName("x-dropdown") override val dropdown: String?
) : NxGeneratorOption

@Serializable
data class NxOptionWithNumberDefault(
    val default: Int,
    override val name: String,
    override val isRequired: Boolean?,
    override val deprecated: Boolean?,
    override val description: String?,
    override val type: String?,
    override val enum: List<String>?,
    override var items: List<String>?,
    @SerializedName("x-priority") @SerialName("x-priority") override val priority: String?,
    @SerializedName("x-dropdown") @SerialName("x-dropdown") override val dropdown: String?
) : NxGeneratorOption

class NxGeneratorOptionDeserializer : JsonDeserializer<NxGeneratorOption> {
    override fun deserialize(
        element: JsonElement?,
        type: Type?,
        context: JsonDeserializationContext?
    ): NxGeneratorOption? {
        val defaultElement =
            element?.asJsonObject?.get("default")
                ?: return context?.deserialize(element, NxOptionWithNoDefault::class.java)

        return if (defaultElement.isJsonArray) {
            context?.deserialize<NxOptionWithArrayDefault>(
                element,
                NxOptionWithArrayDefault::class.java
            )
        } else if (defaultElement.isJsonPrimitive) {
            val defaultValueType = defaultElement.asJsonPrimitive!!
            if (defaultValueType.isBoolean) {
                context?.deserialize<NxOptionWithBooleanDefault>(
                    element,
                    NxOptionWithBooleanDefault::class.java
                )
            } else if (defaultValueType.isString) {
                context?.deserialize<NxOptionWithStringDefault>(
                    element,
                    NxOptionWithStringDefault::class.java
                )
            } else if (defaultValueType.isNumber) {
                context?.deserialize<NxOptionWithNumberDefault>(
                    element,
                    NxOptionWithNumberDefault::class.java
                )
            } else {
                null
            }
        } else {
            null
        }
    }
}
