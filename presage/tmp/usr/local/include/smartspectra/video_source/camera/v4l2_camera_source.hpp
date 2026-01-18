//
// Created by Claude Code
// Copyright (c) 2024 Presage Technologies
//

#pragma once
// === standard library includes (if any) ===
#include <vector>
#include <cstdint>
// === third-party includes (if any) ===
#include <opencv2/core.hpp>
#include <absl/status/status.h>
#include <linux/videodev2.h>
// === local includes (if any) ===
#include <smartspectra/video_source/video_source.hpp>
#include <smartspectra/video_source/settings.hpp>
#include "camera.hpp"

namespace presage::smartspectra::video_source::v4l2 {

/**
 * Video source that uses direct v4l2 API for camera capture on Linux.
 * Provides full control over camera settings including exposure and format.
 * Supports zero-copy compressed MJPEG output when available.
 */
class V4l2CameraSource : public VideoSource {
public:
    ~V4l2CameraSource() override;

    // Explicitly delete copy and move operations (manages file descriptor and mmap'd memory)
    V4l2CameraSource() = default;
    V4l2CameraSource(const V4l2CameraSource&) = delete;
    V4l2CameraSource& operator=(const V4l2CameraSource&) = delete;
    V4l2CameraSource(V4l2CameraSource&&) = delete;
    V4l2CameraSource& operator=(V4l2CameraSource&&) = delete;

    absl::Status Initialize(const VideoSourceSettings& settings) override;

    int GetWidth() override;
    int GetHeight() override;

    void ProducePreTransformFrame(cv::Mat& frame) override;

    bool SupportsExactFrameTimestamp() const override;
    int64_t GetFrameTimestamp() const override;

    // Exposure controls
    absl::Status TurnOnAutoExposure() override;
    absl::Status TurnOffAutoExposure() override;
    absl::Status ToggleAutoExposure() override;
    absl::StatusOr<bool> IsAutoExposureOn() override;
    absl::Status IncreaseExposure() override;
    absl::Status DecreaseExposure() override;
    absl::Status SetExposure(double value) override;
    absl::StatusOr<double> GetExposure() override;
    bool SupportsExposureControls() override;

    // White balance controls
    bool SupportsWhiteBalanceControls() override;
    absl::Status TurnOnAutoWhiteBalance() override;
    absl::Status TurnOffAutoWhiteBalance() override;
    absl::Status ToggleAutoWhiteBalance() override;
    absl::StatusOr<bool> IsAutoWhiteBalanceOn() override;
    absl::Status IncreaseWhiteBalance() override;
    absl::Status DecreaseWhiteBalance() override;
    absl::Status SetWhiteBalance(double value) override;
    absl::StatusOr<double> GetWhiteBalance() override;

    // Gain controls
    bool SupportsGainControl() override;
    absl::Status IncreaseGain() override;
    absl::Status DecreaseGain() override;
    absl::Status SetGain(double value) override;
    absl::StatusOr<double> GetGain() override;

    // Compressed frame support (for MJPEG)
    bool SupportsCompressedOutput() override;
    bool ProduceCompressedFrame(std::vector<uint8_t>& jpeg_data) override;

    InputTransformMode GetDefaultInputTransformMode() override;

private:
    // Device file descriptor
    int fd_ = -1;

    // Camera configuration
    int device_index_ = 0;
    int width_ = 0;
    int height_ = 0;
    uint32_t pixelformat_ = 0;
    camera::CaptureCodec codec_ = camera::CaptureCodec::MJPG;
    presage::camera::AutoExposureConfiguration auto_exposure_configuration_;
    int exposure_step_ = 50;
    int white_balance_step_ = 100;
    int gain_step_ = 10;
    bool log_verbose_controls_ = false;

    // Control ranges for normalization (min, max)
    std::pair<int32_t, int32_t> exposure_range_ = {0, 0};
    std::pair<int32_t, int32_t> white_balance_range_ = {0, 0};
    std::pair<int32_t, int32_t> gain_range_ = {0, 0};

    // v4l2 buffer management
    static constexpr size_t kBufferCount = 4;
    struct v4l2_buffer current_buffer_;
    void* buffers_[kBufferCount] = {nullptr};
    size_t buffer_lengths_[kBufferCount] = {0};

    // Frame caching for compressed/uncompressed dual output
    std::vector<uint8_t> cached_compressed_frame_;
    bool has_cached_compressed_frame_ = false;
    int64_t cached_frame_timestamp_us_ = 0;

    // Timestamp conversion (v4l2 CLOCK_MONOTONIC → epoch)
    int64_t monotonic_to_epoch_offset_us_ = -1;
    int64_t ConvertMonotonicToEpoch(int64_t monotonic_us);

    // v4l2 device management
    absl::Status OpenDevice(int device_index);
    absl::Status SetFormat(int width, int height, uint32_t pixelformat);
    absl::Status RequestBuffers();
    absl::Status MapBuffers();
    absl::Status QueueBuffers();
    absl::Status StartStreaming();
    absl::Status StopStreaming();
    void CleanupDevice();

    // Frame capture
    absl::Status CaptureFrame();

    // Format conversion (YUYV/RGB → BGR)
    void ConvertFrameToBGR(const uint8_t* data, size_t length, uint32_t pixelformat, cv::Mat& output);

    // V4L2 control helpers
    absl::Status SetV4l2Control(uint32_t control_id, int32_t value);
    absl::StatusOr<int32_t> GetV4l2Control(uint32_t control_id);
    absl::StatusOr<std::pair<int32_t, int32_t>> GetV4l2ControlRange(uint32_t control_id);
    std::string GetV4l2ControlName(uint32_t control_id);

    // Framerate management
    absl::Status ResetFrameInterval();
    absl::Status RestartDevice();
};

} // namespace presage::smartspectra::video_source::v4l2
