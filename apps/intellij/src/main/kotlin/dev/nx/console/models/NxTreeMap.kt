package dev.nx.console.models

data class NxTreeNode(
    val dir: String,
    val projectName: String?,
    val projectConfiguration: NxProject?,
    val children: Array<NxTreeNode>
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxTreeNode

        if (dir != other.dir) return false
        if (projectName != other.projectName) return false
        if (projectConfiguration != other.projectConfiguration) return false
        if (!children.contentEquals(other.children)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = dir.hashCode()
        result = 31 * result + (projectName?.hashCode() ?: 0)
        result = 31 * result + (projectConfiguration?.hashCode() ?: 0)
        result = 31 * result + children.contentHashCode()
        return result
    }
}

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

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as SerializedNxFolderTreeData

        if (!serializedTreeMap.contentEquals(other.serializedTreeMap)) return false
        if (!roots.contentEquals(other.roots)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = serializedTreeMap.contentHashCode()
        result = 31 * result + roots.contentHashCode()
        return result
    }
}

data class NxFolderTreeData(val treeMap: NxTreeMap, val roots: Array<NxTreeNode>) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as NxFolderTreeData

        if (treeMap != other.treeMap) return false
        if (!roots.contentEquals(other.roots)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = treeMap.hashCode()
        result = 31 * result + roots.contentHashCode()
        return result
    }
}
