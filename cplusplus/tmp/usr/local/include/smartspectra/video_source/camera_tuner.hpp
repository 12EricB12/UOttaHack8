// camera_tuner.hpp
// Created by Greg on 10/10/2025.
// Copyright (C) 2025 Presage Security, Inc.
//
// SPDX-License-Identifier: LGPL-3.0-or-later

#pragma once

// standard library includes
#include <memory>
#include <cstdint>

// third-party includes
#include <absl/status/status.h>
#include <absl/status/statusor.h>
#include <physiology/modules/messages/status.h>
#include <mediapipe/framework/port/opencv_core_inc.h>

// local includes
#include "video_source.hpp"
#include "camera_tuner_settings.hpp"


/**
 * @file camera_tuner.hpp
 * @brief Automatic camera tuning system for optimizing exposure and gain settings.
 *
 * The CameraTuner manages a three-stage tuning process:
 * - Stage 0: Auto white balance / auto-exposure establishment (optional)
 * - Stage 1: Exposure optimization via binary search
 * - Stage 2: Gain adjustment via binary search
 *
 * The tuning process uses feedback from the physiology graph's status codes
 * (IMAGE_TOO_DARK, IMAGE_TOO_BRIGHT, OK) to iteratively adjust camera parameters
 * for optimal image quality.
 */

namespace presage::smartspectra::video_source {

/**
 * @brief Tuning process stages.
 */
enum class TuningStage {
    /// Tuning has not been started
    NOT_STARTED,
    /// Currently establishing auto white balance
    AUTO_WHITE_BALANCE,
    /// Performing binary search for optimal exposure
    EXPOSURE_SEARCH,
    /// Performing binary search for optimal gain
    GAIN_SEARCH,
    /// Tuning completed successfully
    COMPLETE,
    /// Tuning failed (e.g., insufficient lighting)
    FAILED
};

/**
 * @brief Manages automatic camera tuning for optimal image quality.
 *
 * The CameraTuner wraps a VideoSource instance and adjusts its exposure,
 * gain, and optionally white balance settings based on feedback from the
 * physiology graph's status codes. It uses binary search algorithms for
 * efficient convergence to optimal settings.
 *
 * Usage:
 * 1. Create tuner with desired settings
 * 2. Transfer VideoSource ownership via SetVideoSource()
 * 3. Start tuning with StartTuning()
 * 4. For each frame, call ProcessFrame() with the status code
 * 5. Check IsTuning() to know when tuning is complete
 * 6. Retrieve final settings via GetTunedExposure/Gain/WhiteBalance()
 */
class CameraTuner {
public:
    /**
     * @brief Construct a camera tuner with specified settings.
     * @param settings Configuration parameters for tuning process
     */
    explicit CameraTuner(CameraTunerSettings settings = {});

    /**
     * @brief Set the video source to tune.
     *
     * Shares ownership of the video source with the tuner and validates
     * that it supports the required controls (exposure and gain at minimum).
     *
     * @param source Shared pointer to the video source
     * @return Status indicating success or reason for failure
     */
    absl::Status SetVideoSource(std::shared_ptr<VideoSource> source);

    /**
     * @brief Get shared pointer to the video source.
     *
     * Returns the shared video source that can be used for frame capture
     * while the tuner adjusts settings.
     *
     * @return Shared pointer to the video source
     */
    std::shared_ptr<VideoSource> GetVideoSource();

    /**
     * @brief Start the tuning process.
     *
     * Initializes tuning state and begins Stage 0 (auto white balance)
     * or Stage 1 (exposure search) depending on white balance support.
     *
     * @return Status indicating success or reason for failure
     */
    absl::Status StartTuning();

    /**
     * @brief Check if tuning is currently in progress.
     * @return true if tuning, false if complete or failed
     */
    bool IsTuning() const;

    /**
     * @brief Get the current tuning stage.
     * @return Current stage of the tuning process
     */
    TuningStage GetCurrentStage() const;

    /**
     * @brief Process a frame during tuning (synchronous mode).
     *
     * Analyzes the status code from the physiology graph and adjusts camera
     * parameters accordingly. Should be called once per frame during tuning.
     *
     * @param status_code Status code from physiology graph
     * @param frame_timestamp Frame timestamp in microseconds
     * @return Status indicating success or reason for failure
     */
    absl::Status ProcessFrame(presage::physiology::StatusCode status_code,
                              int64_t frame_timestamp);


    /**
     * @brief Get the tuned exposure value.
     * @return Normalized exposure value [0.0, 1.0] or error if not available
     */
    absl::StatusOr<double> GetTunedExposure() const;

    /**
     * @brief Get the tuned gain value.
     * @return Normalized gain value [0.0, 1.0] or error if not available
     */
    absl::StatusOr<double> GetTunedGain() const;

    /**
     * @brief Get the tuned white balance value.
     * @return Normalized white balance value [0.0, 1.0] or error if not available
     */
    absl::StatusOr<double> GetTunedWhiteBalance() const;

    /**
     * @brief Process a frame for display with optional camera tuning overlay.
     *
     * If camera tuning is in progress and render_calibrating_overlay is enabled,
     * renders a semi-transparent overlay with "Tuning camera..." text on the frame.
     *
     * @param frame Input frame (RGB format)
     * @return Frame with overlay rendered (if applicable), or original frame
     */
    cv::Mat ProcessFrameForDisplay(const cv::Mat& frame) const;

private:
    /// Configuration settings
    CameraTunerSettings settings_;

    /// Shared video source
    std::shared_ptr<VideoSource> video_source_;

    /// Current tuning stage
    TuningStage stage_;

    // White balance state
    /// Whether video source supports white balance controls
    bool supports_white_balance_;
    /// Frame counter for auto white balance stage
    int wb_frame_counter_;
    /// Locked white balance value after auto adjustment
    double locked_white_balance_;

    // Exposure reduction state
    /// Current exposure value
    double current_exposure_;
    /// Number of iterations performed in exposure reduction
    int exposure_iteration_count_;
    /// Previous frame timestamp for FPS calculation (microseconds)
    int64_t last_frame_timestamp_;
    /// Current measured framerate (FPS)
    double current_framerate_;
    /// Frames captured since last exposure change (for settling)
    int exposure_settle_frame_count_;

    // Gain increase state
    /// Current gain value
    double current_gain_;
    /// Number of iterations performed in gain increase
    int gain_iteration_count_;
    /// Frames captured since last gain change (for settling)
    int gain_settle_frame_count_;

    /**
     * @brief Process Stage 0: Auto white balance establishment.
     * @return Status indicating success or reason for failure
     */
    absl::Status ProcessAutoWhiteBalanceStage();

    /**
     * @brief Process Stage 1: Exposure binary search.
     * @param status_code Status code from physiology graph
     * @param frame_timestamp Frame timestamp in microseconds
     * @return Status indicating success or reason for failure
     */
    absl::Status ProcessExposureSearchStage(presage::physiology::StatusCode status_code,
                                             int64_t frame_timestamp);

    /**
     * @brief Process Stage 2: Gain binary search.
     * @param status_code Status code from physiology graph
     * @return Status indicating success or reason for failure
     */
    absl::Status ProcessGainSearchStage(presage::physiology::StatusCode status_code);

    /**
     * @brief Validate that video source supports required controls.
     * @return Status indicating success or reason for failure
     */
    absl::Status ValidateVideoSourceControls();
};

} // namespace presage::smartspectra::video_source
