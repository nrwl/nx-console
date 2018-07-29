/**
 * Copyright (c) 2013-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 */

#ifndef NODE_PTY_PATH_UTIL_H_
#define NODE_PTY_PATH_UTIL_H_

#include <nan.h>

#define MAX_ENV 65536

namespace path_util {

const wchar_t* to_wstring(const v8::String::Utf8Value& str);
bool file_exists(std::wstring filename);
std::wstring get_shell_path(std::wstring filename);

}  // namespace path_util

#endif  // NODE_PTY_PATH_UTIL_H_
