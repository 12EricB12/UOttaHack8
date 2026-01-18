// factory.hpp
// Created by Greg on 3/1/2024.
// Copyright (C) 2025 Presage Security, Inc.
//
// SPDX-License-Identifier: LGPL-3.0-or-later

#pragma once
// === standard library includes (if any) ===
#include <memory>
// === third-party includes (if any) ===
#include <absl/status/statusor.h>
// === local includes (if any) ===
#include "video_source.hpp"
#include "settings.hpp"

namespace presage::smartspectra::video_source {

/**
 * @brief Factory helper for constructing the appropriate VideoSource
 *        implementation based on the provided settings.
 * \ingroup video_source
 */
absl::StatusOr<std::shared_ptr<VideoSource>> BuildVideoSource(const VideoSourceSettings& settings);

} // namespace presage::smartspectra::video_source
