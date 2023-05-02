package dev.nx.console.settings.options

import com.intellij.openapi.project.Project
import com.intellij.ui.dsl.builder.Align
import com.intellij.ui.dsl.builder.Panel
import com.intellij.ui.dsl.builder.SegmentedButton
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.dsl.gridLayout.HorizontalAlign
import com.intellij.ui.table.JBTable
import com.intellij.util.Function
import com.intellij.util.ui.ColumnInfo
import com.intellij.util.ui.table.*
import com.intellij.util.ui.table.TableModelEditor.DialogItemEditor
import com.intellij.util.ui.table.TableModelEditor.EditableColumnInfo
import dev.nx.console.settings.NxConsoleSettingBase
import java.awt.Component
import java.util.*
import javax.swing.JTable
import javax.swing.event.CellEditorListener
import javax.swing.table.TableCellEditor
import javax.swing.table.TableCellRenderer

class GeneratorAllowlistSetting(val project: Project) : NxConsoleSettingBase<String?> {

   private lateinit var generatorListEditor: TableModelEditor<GeneratorListItem>

  init {
    val generatorMatcherColumnInfo = object: EditableColumnInfo<GeneratorListItem, String>("Generator Pattern") {
      override fun valueOf(item: GeneratorListItem?): String? {
        return item?.matcher
      }
      override fun setValue(item: GeneratorListItem, value: String) {
        item.matcher = value
      }
    }
    val generatorAllowColumnInfo = object: EditableColumnInfo<GeneratorListItem, Boolean>("Include") {
      override fun getWidth(table: JTable?): Int {
        return 65
      }
      override fun getColumnClass(): Class<*> {
        return Boolean::class.java
      }
      override fun valueOf(item: GeneratorListItem?): Boolean? {
        return item?.allow
      }

      override fun setValue(item: GeneratorListItem, value: Boolean) {
        item.allow = value
        item.disallow = value.not()
      }
    }
    val generatorDisallowColumnInfo = object: EditableColumnInfo<GeneratorListItem, Boolean>("Exclude") {
      override fun getWidth(table: JTable?): Int {
        return 65
      }
      override fun getColumnClass(): Class<*> {
        return Boolean::class.java
      }
      override fun valueOf(item: GeneratorListItem?): Boolean? {
        return item?.disallow
      }

      override fun setValue(item: GeneratorListItem, value: Boolean) {
        item.disallow = value
        item.allow = value.not()
      }

    }

    val columns = arrayOf<ColumnInfo<*, *>>(
      generatorAllowColumnInfo,
      generatorDisallowColumnInfo,
      generatorMatcherColumnInfo,
    )

    val itemEditor : DialogItemEditor<GeneratorListItem> = object: DialogItemEditor<GeneratorListItem> {
      override fun getItemClass(): Class<out GeneratorListItem> {
        return GeneratorListItem::class.java
      }

      override fun applyEdited(oldItem: GeneratorListItem, newItem: GeneratorListItem) {
        oldItem.allow = newItem.allow
        oldItem.disallow = newItem.disallow
        oldItem.matcher = newItem.matcher
      }

      override fun edit(
        item: GeneratorListItem,
        mutator: Function<in GeneratorListItem, out GeneratorListItem>,
        isAdd: Boolean
      ) {
        TODO("Not yet implemented")
      }

      override fun clone(item: GeneratorListItem, forInPlaceEditing: Boolean): GeneratorListItem {
        TODO("Not yet implemented")
      }

    }
    generatorListEditor = TableModelEditor(columns, itemEditor, "empty text")
  }
    override fun render(panel: Panel) {
        panel.apply { row("test label") { cell(generatorListEditor.createComponent()).align(Align.FILL).component } }
    }

    override fun getValue(): String? = ""

    override fun setValue(value: String?) {
        if (value == null) return
        //do something
    }
}

private class GeneratorListItem {
  var matcher: String = "@nx/example"
  var allow: Boolean = false
  var disallow: Boolean = true
}

//class GeneratorFilterTable(val t: JBTable, val disposable: Disposable): JBListTable(t, disposable) {
//  override fun getRowRenderer(row: Int): JBTableRowRenderer {
//    return JBTableRowRenderer { table, row, selected, focused -> JBTextField() }
//  }
//
//  override fun getRowEditor(row: Int): JBTableRowEditor {
//    return object: JBTableRowEditor() {
//      override fun prepareEditor(table: JTable?, row: Int) {
//        return
//      }
//
//      override fun getValue(): JBTableRow {
//        return JBTableRow {column -> "" }
//      }
//
//      override fun getPreferredFocusedComponent(): JComponent {
//        return JBTextField()
//      }
//
//      override fun getFocusableComponents(): Array<JComponent> {
//        return arrayOf()
//      }
//
//
//    }
//  }
//
//}
