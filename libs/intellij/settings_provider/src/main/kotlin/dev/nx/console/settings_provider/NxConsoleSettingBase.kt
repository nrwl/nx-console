package dev.nx.console.settings_provider

import com.intellij.ui.dsl.builder.Panel

interface NxConsoleSettingBase<T> {
    fun render(panel: Panel): Unit

    fun getValue(): T

    fun setValue(value: T): Unit

    fun doApply(): Unit {
        return
    }
}
