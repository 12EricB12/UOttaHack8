// video_source.hpp
// Created by Greg on 2/29/2024.
// Copyright (C) 2025 Presage Security, Inc.
//
// SPDX-License-Identifier: LGPL-3.0-or-later

#pragma once
// === standard library includes (if any) ===
#include <cstdint>
#include <vector>
// === third-party includes (if any) ===
#include <mediapipe/framework/port/opencv_core_inc.h>
#include <absl/status/statusor.h>
// === local includes (if any) ===
#include "settings.hpp"
#include "input_transformer.hpp"

/**
 * @defgroup video_source Video Sources
 * @brief Interfaces and helpers for obtaining frames for processing.
 * @{
 */

namespace presage::smartspectra::video_source {

/**
 * @brief Abstract interface for camera/video input sources.
 * \ingroup video_source
 */
class VideoSource {
public:
    /** Grab the next frame from the source. */
    VideoSource& operator>>(cv::Mat& frame);

    /** Configure the source with provided settings. */
    virtual absl::Status Initialize(const VideoSourceSettings& settings);

    virtual ~VideoSource() = default;

    // == timestamp controls
    virtual bool SupportsExactFrameTimestamp() const = 0;

    /**
     * return the current frame's timestamp, in microseconds
     */
    virtual int64_t GetFrameTimestamp() const = 0;

    // These have definitions here, technically making this not a true interface.
    // Ignore this for now, maybe redesign later, (e.g. using C++20 concepts?).

    // == exposure controls ==

    /**
     * @brief Enable automatic exposure mode.
     * @return Status indicating success or failure.
     */
    virtual absl::Status TurnOnAutoExposure();

    /**
     * @brief Disable automatic exposure and switch to manual mode.
     * @return Status indicating success or failure.
     */
    virtual absl::Status TurnOffAutoExposure();

    /**
     * @brief Toggle between automatic and manual exposure modes.
     * @return Status indicating success or failure.
     */
    virtual absl::Status ToggleAutoExposure();

    /**
     * @brief Check if automatic exposure is currently enabled.
     * @return StatusOr containing true if auto exposure is on, false otherwise.
     */
    virtual absl::StatusOr<bool> IsAutoExposureOn();

    /**
     * @brief Increase exposure by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     * @note Only works in manual exposure mode.
     */
    virtual absl::Status IncreaseExposure();

    /**
     * @brief Decrease exposure by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     * @note Only works in manual exposure mode.
     */
    virtual absl::Status DecreaseExposure();

    /**
     * @brief Set exposure to a normalized value.
     * @param value Normalized exposure value in range [0.0, 1.0] where 0.0 is minimum and 1.0 is maximum.
     * @return Status indicating success or failure.
     * @note Values are automatically mapped to hardware-specific ranges.
     */
    virtual absl::Status SetExposure(double value);

    /**
     * @brief Get current exposure as a normalized value.
     * @return StatusOr containing normalized exposure value in range [0.0, 1.0].
     * @note Hardware values are automatically normalized for consistent API.
     */
    virtual absl::StatusOr<double> GetExposure();

    /**
     * @brief Check if this video source supports exposure controls.
     * @return true if exposure controls are available, false otherwise.
     */
    virtual bool SupportsExposureControls();

    // == white balance controls ==

    /**
     * @brief Check if this video source supports white balance controls.
     * @return true if white balance controls are available, false otherwise.
     */
    virtual bool SupportsWhiteBalanceControls();

    /**
     * @brief Enable automatic white balance mode.
     * @return Status indicating success or failure.
     */
    virtual absl::Status TurnOnAutoWhiteBalance();

    /**
     * @brief Disable automatic white balance and switch to manual mode.
     * @return Status indicating success or failure.
     */
    virtual absl::Status TurnOffAutoWhiteBalance();

    /**
     * @brief Toggle between automatic and manual white balance modes.
     * @return Status indicating success or failure.
     */
    virtual absl::Status ToggleAutoWhiteBalance();

    /**
     * @brief Check if automatic white balance is currently enabled.
     * @return StatusOr containing true if auto white balance is on, false otherwise.
     */
    virtual absl::StatusOr<bool> IsAutoWhiteBalanceOn();

    /**
     * @brief Increase white balance temperature by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     * @note Only works in manual white balance mode.
     */
    virtual absl::Status IncreaseWhiteBalance();

    /**
     * @brief Decrease white balance temperature by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     * @note Only works in manual white balance mode.
     */
    virtual absl::Status DecreaseWhiteBalance();

    /**
     * @brief Set white balance temperature to a normalized value.
     * @param value Normalized white balance value in range [0.0, 1.0] where 0.0 is coolest and 1.0 is warmest.
     * @return Status indicating success or failure.
     * @note Values are automatically mapped to hardware-specific temperature ranges (typically 2800K-6500K).
     */
    virtual absl::Status SetWhiteBalance(double value);

    /**
     * @brief Get current white balance temperature as a normalized value.
     * @return StatusOr containing normalized white balance value in range [0.0, 1.0].
     * @note Hardware temperature values are automatically normalized for consistent API.
     */
    virtual absl::StatusOr<double> GetWhiteBalance();

    // == gain controls ==

    /**
     * @brief Check if this video source supports gain controls.
     * @return true if gain controls are available, false otherwise.
     */
    virtual bool SupportsGainControl();

    /**
     * @brief Increase gain by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     */
    virtual absl::Status IncreaseGain();

    /**
     * @brief Decrease gain by a fixed hardware-specific step.
     * @return Status indicating success or failure.
     */
    virtual absl::Status DecreaseGain();

    /**
     * @brief Set gain to a normalized value.
     * @param value Normalized gain value in range [0.0, 1.0] where 0.0 is minimum and 1.0 is maximum.
     * @return Status indicating success or failure.
     * @note Values are automatically mapped to hardware-specific gain ranges.
     */
    virtual absl::Status SetGain(double value);

    /**
     * @brief Get current gain as a normalized value.
     * @return StatusOr containing normalized gain value in range [0.0, 1.0].
     * @note Hardware gain values are automatically normalized for consistent API.
     */
    virtual absl::StatusOr<double> GetGain();

    virtual int GetWidth();

    virtual int GetHeight();

    virtual InputTransformMode GetDefaultInputTransformMode();

    /** Check if the source has valid frame dimension information. */
    bool HasFrameDimensions();

    // == compressed frame support
    /**
     * Check if this video source can provide compressed JPEG frames directly.
     * This allows bypassing recompression when the source already provides MJPEG.
     * @return true if ProduceCompressedFrame() is supported
     */
    virtual bool SupportsCompressedOutput();

    /**
     * Get the next frame as compressed JPEG data (if supported).
     * Only call this if SupportsCompressedOutput() returns true.
     * @param jpeg_data Output buffer for compressed JPEG data
     * @return true if a compressed frame was successfully retrieved
     */
    virtual bool ProduceCompressedFrame(std::vector<uint8_t>& jpeg_data);

protected:
    InputTransformer input_transformer;
    virtual void ProducePreTransformFrame(cv::Mat& frame) = 0;
};


} // namespace presage::smartspectra::video_source
/** @}*/
