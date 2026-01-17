// camera_tuner_settings.hpp
// Created by Greg on 10/10/2025.
// Copyright (C) 2025 Presage Security, Inc.
//
// SPDX-License-Identifier: LGPL-3.0-or-later

#pragma once

namespace presage::smartspectra::video_source {

/**
 * @brief Configuration parameters for the camera tuning process.
 */
struct CameraTunerSettings {
    // Stage 0: Auto white balance
    /// Number of frames to capture for auto white balance establishment
    int auto_wb_frame_count = 30;

    // Stage 1: Exposure reduction for framerate
    /// Minimum acceptable framerate (FPS) - reduce exposure until framerate reaches this
    double min_acceptable_framerate = 26.0;
    /// Step size for exposure reduction (normalized)
    double exposure_step = 0.02;
    /// Minimum exposure value (normalized) - safety limit
    double min_exposure = 0.0;
    /// Number of frames to wait after changing exposure for camera to settle
    int exposure_settle_frames = 3;
    /// Maximum iterations for exposure reduction (safety limit)
    int max_exposure_iterations = 50;

    // Stage 2: Gain increase for brightness
    /// Step size for gain increase (normalized)
    double gain_step = 0.05;
    /// Maximum acceptable gain value (safety limit)
    double max_acceptable_gain = 0.8;
    /// Number of frames to wait after changing gain for camera to settle
    int gain_settle_frames = 3;
    /// Maximum iterations for gain increase (safety limit)
    int max_gain_iterations = 20;

    // Visual feedback
    /// Whether to render "Tuning camera..." overlay on frames during the tuning process
    bool render_calibrating_overlay = false;
};

} // namespace presage::smartspectra::video_source
