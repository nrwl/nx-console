package dev.nx.console.generate_ui.utils

fun getHexColor(color: java.awt.Color?): String {
  if(color == null) {
    return "#FFFFFF"
  }
  fun prefixZero(str: String): String {
    if (str.length > 2) {
      throw RuntimeException("This string, '" + str
        + "', is not an appropriate hex number.");
    }
    if (str.length == 2) {
      return str;
    }
    if (str.length == 1) {
      return "0$str";
    }
    return "00";
  }
  val red = Integer.toHexString(color.red)
  val green = Integer.toHexString(color.green)
  val blue = Integer.toHexString(color.blue)
  return '#' + prefixZero(red) + prefixZero(green) + prefixZero(blue)
}
