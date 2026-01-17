// resolution_selection_mode.hpp
// Created by Greg on 2/29/2024.
// Copyright (C) 2025 Presage Security, Inc.
//
// SPDX-License-Identifier: LGPL-3.0-or-later

#pragma once
// === standard library includes (if any) ===
// === third-party includes (if any) ===
#include <absl/strings/string_view.h>
// === local includes (if any) ===
namespace presage::smartspectra::video_source {

/**
 * How capture resolution should be selected.
 * \ingroup video_source
 */
enum class ResolutionSelectionMode : int {
    Auto,
    Exact,
    Range,
    Unknown_EnumEnd
};

/** Convert a resolution selection mode to a string for flags.
 *  \ingroup video_source
 */
std::string AbslUnparseFlag(ResolutionSelectionMode mode);
/** Parse a resolution selection mode from a flag.
 *  \ingroup video_source
 */
bool AbslParseFlag(absl::string_view text, ResolutionSelectionMode* mode, std::string* error);

/** Names of the available resolution selection modes.
 *  \ingroup video_source
 */
std::vector<std::string> GetResolutionSelectionModeNames();

} // namespace presage::smartspectra::video_source
