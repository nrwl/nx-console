package dev.nx.console.models

data class NxTreeNode(
    val dir: String,
    val projectName: String?,
    val projectConfiguration: NxProject?,
    val children: Array<NxTreeNode>
)

typealias NxTreeMap = Map<String, NxTreeNode>

typealias SerializedTreeMap = Array<SerializedTreeMapItem>

data class SerializedTreeMapItem(val name: String, val node: NxTreeNode)

data class SerializedNxFolderTreeData(
    val serializedTreeMap: SerializedTreeMap,
    val roots: Array<NxTreeNode>
) {
    fun toFolderTreeData(): NxFolderTreeData {
        return NxFolderTreeData(
            treeMap = this.serializedTreeMap.associate { Pair(it.name, it.node) },
            roots = this.roots
        )
    }
}

data class NxFolderTreeData(val treeMap: NxTreeMap, val roots: Array<NxTreeNode>)
