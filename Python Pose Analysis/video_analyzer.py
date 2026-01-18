import math

import cv2
import mediapipe as mp
import numpy
import numpy as np
import os
import matplotlib.pyplot as plt
import time
import json
import send2trash

from .data_analysis import DataAnalyzer
from mediapipe.python.solutions.pose import PoseLandmark
from mediapipe.python.solutions.drawing_utils import DrawingSpec
from mediapipe.framework.formats import landmark_pb2
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe import solutions

PoseLandmarkDictionary = {}
m_inf_threshold = 100 # What m value to be considered as "infinity"

# TO DO - check standard status codes for GET requests
class VideoAnalyzer(DataAnalyzer):
    def __init__(self, video_path, frames_cut_per_second, width, height):
        """
        Sets up video received from frontend for processing.
        :param video_path: path to mp4 file
        :param frames_cut_ps: how many frames to cut from the video per second. For example, setting this parameter to
        60 will result in 60 images being created per second of video.
        """
        self.video_dir_prefix = "user_videos"
        self.frames_cut_ps = frames_cut_per_second
        self.sequence_path = None
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.video_path = os.path.join(self.base_dir, self.video_dir_prefix, video_path)
        self.width = width
        self.height = height
        self.key_frames = None
        self.analyzed_images_path = []
        super().__init__()

    def split_frames(self):
        if not self.video_path.endswith('.mp4'):
            with open("bruh.txt", 'w+') as f:
                f.write(self.video_path)
            return

        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)  # OpenCV v2.x used "CV_CAP_PROP_FPS"
        num_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps == 0 or num_frames == 0:
            return
        vid_length = num_frames / fps

        frame_rate = int(num_frames / vid_length)
        if frame_rate == 0:
            return

        frame_count = 0
        self.sequence_path = os.path.join(os.path.dirname(self.video_path), f"images_{os.path.basename(self.video_path).strip('.mp4')}")

        # Replace with deletion later
        if not os.path.exists(self.sequence_path):
            os.makedirs(self.sequence_path)

        while cap.isOpened():
            success, frame = cap.read()

            if not success:
                break
            if frame_count % (math.ceil(frame_rate / self.frames_cut_ps)) == 0:
                if self.width < self.height:
                    cv2.imwrite(os.path.join(self.sequence_path, f"{frame_count}.jpg"), cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE))
                else:
                    cv2.imwrite(os.path.join(self.sequence_path, f"{frame_count}.jpg"), frame)

            frame_count += 1

        cap.release()
        print(f"{os.path.basename(self.video_path)} successfully saved")

    def find_key_time(self, movement_type):
        """
        Find the point at which the lift is evaluated based on the position and angles of key joints. For example,
        the squat is best evaluated when the person is at the bottom of the lift.
        :return: The frame at which the individual is evaluated at
        """
        image_per_frame = {}
        filename_per_frame = {}
        angles = {}
        angles_1 = {}
        angles_2 = {}
        all_points = []
        criteria = open(os.path.join(self.base_dir, 'movement_criteria.json'))
        criteria_data = json.load(criteria)

        if self.sequence_path is None:
            return

        frames = [f for f in os.listdir(self.sequence_path) if os.path.isfile(os.path.join(self.sequence_path, f))]
        frames_int = sorted([int(f.strip('.jpg')) for f in frames])
        frames_sorted = [str(f) + '.jpg' for f in frames_int]
        print(frames_sorted)

        for frame, photo in enumerate(frames_sorted):
            analysis = self.analyze_photo(os.path.join(self.sequence_path, photo), action_joints=criteria_data[movement_type].get("action_joints"))
            if analysis is None:
                continue
            
            angle, _, _ = analysis
            angles[frame] = angle
            # angles_1[frame] = angle_1
            # angles_2[frame] = angle_2
            image_per_frame[frame] = photo

        angles_1 = angles

        frame_ids = self.get_candidate_frames(angles_1)
        print(frame_ids)
        frame_names = [image_per_frame[i] for i in frame_ids]

        #### DEBUG ####
        # for i in frame_names:
        #     img = cv2.imread(fr"{os.path.join(self.sequence_path, i)}")
        #     cv2.imshow("kys", img)
        #     cv2.waitKey(0)

        # x_1 = sorted(list(angles_1.keys()))
        # x_2 = sorted(list(angles_2.keys()))
        # y_1 = list(angles_1.values())
        # y_2 = list(angles_2.values())

        # plt.scatter(x_1, y_1)
        # plt.title("angles_1")

        # plt.show()

        criteria.close()
        return frame_names

    def analyze_photo(self, photo_path, action_joints=None, sensitivity=0.5):
        '''
        Creates landmarks for all the joints on the body, along with their normalized coordinates.
        If action joints are passed in, the angle/position of the key joint is also returned.
        :param action_joints: A dictionary with the following format;
               {MovementType: [[LEFT_JOINT, [LEFT_ADJACENT_JOINT_1, LEFT_ADJACENT_JOINT_2]],
               [RIGHT_JOINT, [RIGHT_ADJACENT_JOINT_1, RIGHT_ADJACENT_JOINT_2]]]}
               Order: Always do the left joint as the first element, and the right as the second.
               You can also just pass the joint on either side in an un nested list if you only want the position, ex;
               {MovementType: [LEFT_JOINT, RIGHT_JOINT]}
               Default to None.
        :param photo_path: The path to the photo to be analyzed.
        :param sensitivity: The visibility threshold for each landmark to be in the final connections list. The higher
               the threshold, the less prone the model is to add incorrect landmarks. However, setting this value too
               high will cause key joints to be missing.
               Default to 0.5.
        :return: A tuple in the following format:
        (left angle, right angle, connection_dictionary), where the key of the connection dictionary is the landmark ID,
        and the value is its coordinates.
        OR
        connection_dictionary, same key value representations as the first return format.
        '''
        mp_drawing = mp.solutions.drawing_utils
        mp_drawing_styles = mp.solutions.drawing_styles
        mp_pose = mp.solutions.pose
        custom_connections = list(mp_pose.POSE_CONNECTIONS)
        BaseOptions = mp.tasks.BaseOptions
        PoseLandmarker = mp.tasks.vision.PoseLandmarker
        PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        # Size of data (images in this case) for preprocessing
        # FINAL SIZE: crop_width, crop_height
        target_width = 224
        target_height = 224
        BG_COLOR = (0, 0, 0)  # Black
        MASK_COLOR = (255, 255, 255)  # white

        all_points = []
        all_images = {}
        image_per_frame = {}
        connections = {}

        if not photo_path.endswith('.jpg'):
            return

        # image = cv2.imread(photo_path)
        base_options = python.BaseOptions(model_asset_path=os.path.join(self.base_dir, 'pose_landmarker_heavy.task'))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False
        )
        detector = vision.PoseLandmarker.create_from_options(options)

        # image = cv2.imread(photo_path)
        # image_cv2 = cv2.resize(image, (224, 224))
        # image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        image_mat = cv2.imread(photo_path)
        # if self.width < self.height:
        #     image_mat = cv2.rotate(image_mat, cv2.ROTATE_90_CLOCKWISE)

        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_mat)
        detection_result = detector.detect(image)
        if len(detection_result.pose_landmarks) == 0:
            print("No pose detected! Try decreasing sensitivity.")
            return
        print(detection_result.pose_world_landmarks)

        with PoseLandmarker.create_from_options(options) as pose:
            # Get the first one, since we are only going to be working with one person anyways
            pose_landmarks_list = detection_result.pose_landmarks[0]
            print(len(pose_landmarks_list))

            for idx in range(len(pose_landmarks_list)):
                pose_landmarks = pose_landmarks_list[idx]

                # Draw the pose landmarks.
                # pose_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
                # # print(pose_landmarks_proto)
                # pose_landmarks_proto.landmark.extend([
                #     landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) for landmark in
                #     pose_landmarks
                # ])
                # solutions.drawing_utils.draw_landmarks(
                #     annotated_image,
                #     pose_landmarks_proto,
                #     solutions.pose.POSE_CONNECTIONS,
                #     solutions.drawing_styles.get_default_pose_landmarks_style())
                if pose_landmarks.visibility <= sensitivity:
                    continue
                connections[idx] = pose_landmarks
            # self.draw_points(photo_path, (255, 0, 0), connections)
            print("saved")

            # Angle and movement analysis
            if action_joints is None:
                return connections

            L_angle = None
            R_angle = None

            for i, (key, joints) in enumerate(action_joints.items()):
                action_joint = key
                adj_joint_1, adj_joint_2 = joints

                action_joint = connections.get(getattr(PoseLandmark, action_joint))
                adj_joint_1 = connections.get(getattr(PoseLandmark, adj_joint_1))
                adj_joint_2 = connections.get(getattr(PoseLandmark, adj_joint_2))

                # If we do not see the action joints or adjacent joints, move on
                if None in (action_joint, adj_joint_1, adj_joint_2):
                    continue

                angle_1 = self.get_angle(action_joint, adj_joint_1, adj_joint_2)
                if i == 0:
                    L_angle = angle_1
                else:
                    R_angle = angle_1

            return L_angle, R_angle, connections
            # cv2.imshow('A', cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR))
            # cv2.waitKey(0)
            # cv2.imwrite('kms.jpg', annotated_image)

            image_height, image_width, _ = image.shape
            results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            annotated_image = image

            if results.segmentation_mask is None:
                print(f"No segmentation mask for {os.path.basename(self.sequence_path)}")
                return

            condition = np.stack((results.segmentation_mask,) * 3, axis=-1) > 0.1
            bg_image = np.zeros(image.shape, dtype=np.uint8)
            bg_image[:] = BG_COLOR
            annotated_image = np.where(condition, annotated_image, bg_image)
            corners = self.get_mask_corners_cv(results.segmentation_mask, 0.1)

            # mp_drawing.draw_landmarks(
            #     annotated_image,
            #     results.pose_landmarks,
            #     connections=custom_connections,  # passing the modified connections list
            #     landmark_drawing_spec=custom_style)  # and drawing style

            # Make sure corners and landmarks exist
            if results.pose_landmarks is None:
                print(
                    f"No landmarks for {os.path.basename(self.sequence_path)}")
                return
            all_points.append(corners)

            connections_made = []
            connections_1 = []
            connections_2 = []
            d_connections_1 = {}
            d_connections_2 = {}
            left_hip, right_hip = None, None
            # Check if connections exist, delete if connections aren't visible enough
            # CONNECTION FORMAT: Connection ID1, Connection ID2, Landmark 1, Landmark 2
            print(results.pose_landmarks.landmark)
            for index_1, i in enumerate(results.pose_landmarks.landmark):
                for index_2, j in enumerate(results.pose_landmarks.landmark):
                    connection = (index_1, index_2)
                    if connection in custom_connections and i.visibility >= 0.2 and j.visibility >= 0.2:
                        d_connections_1[index_1] = i
                        d_connections_2[index_2] = j
                        connection += (i, j)
                        connections_1.append(index_1)
                        connections_2.append(index_2)
                        connections_made.append(connection)

            print(connections_1)
            print(connections_2)
            connection_valid = True

            # find action joints by finding each key associated with each joint, which will point to its coords
            # if the action joint doesn't exist, stop looking for this frame
            # if it does, find the other two adjacent joints and get their coordinates
            # if the adjacent joints do not exist, we cannot find the angle, so terminate
            # pass all coordinates into the angle function and add the output to a graph
            # if the best fit is quadratic for one of the two dictionaries, we can say it an exercise and not
            # noise
            for key, joints in action_joints.items():
                for pair in joints:
                    action_joint = pair[0].value
                    adj_joint_1, adj_joint_2 = pair[1]

                    adj_joint_1 = adj_joint_1.value
                    adj_joint_2 = adj_joint_2.value

                    action_joint_1 = d_connections_1.get(action_joint)
                    action_joint_2 = d_connections_2.get(action_joint)
                    adj_joint_11 = d_connections_1.get(adj_joint_1)
                    adj_joint_21 = d_connections_1.get(adj_joint_2)
                    adj_joint_12 = d_connections_2.get(adj_joint_1)
                    adj_joint_22 = d_connections_2.get(adj_joint_2)

                    # If we do not see the action joints or adjacent joints, move on
                    if None in (action_joint_1, action_joint_2, adj_joint_11, adj_joint_21, adj_joint_12, adj_joint_22):
                        continue
                    angle_1 = self.get_angle(action_joint_1, adj_joint_11, adj_joint_21)
                    angle_2 = self.get_angle(action_joint_2, adj_joint_12, adj_joint_22)
                    return angle_1, angle_2, d_connections_1, d_connections_2

    def get_candidate_frames(self, angles_1):
        candidate_frames = []
        # print(angles_1)
        if len(angles_1) > 0:
            # min_index = 0
            # min_angle = list(angles_1.values())[min_index]

            # for f, angle in enumerate(angles_1.values()):
            #     # Keep going until we find the first index that's numerical
            #     if min_angle is None:
            #         min_angle = list(angles_1.values())[f]
            #     if angle is None:
            #         continue
                
            #     if angle <= min_angle and f - min_index > 1:
            #         x = list(angles_1.keys())[min_index:f]
            #         y = list(angles_1.values())[min_index:f]

            #         # Make sure each section has at least 5 angles to analyze, prevents noise
            #         # Without this conditional, the program may bring in extra points past the miniumum, causing
            #         # inaccurate fits
            #         if len(x) < 3:
            #             min_index = f
            #             min_angle = angle
            #             continue

            #         # r-squared
            #         r_s_poly = self.polyfit(x, y, 2)['determination']
            #         r_s_one = self.polyfit(x, y, 1)['determination']

            #         # if the fit is quadratic
            #         if r_s_poly > r_s_one:
            #             candidate_frames += list(angles_1.keys())[min_index:f]

            #         min_angle = angle
            #         min_index = f

            #         # plt.scatter(x, y)
            #         # plt.show()

            # x = list(angles_1.keys())[min_index:]
            # y = list(angles_1.values())[min_index:]

            angles_1_no_none = {k:v for (k, v) in angles_1.items() if v is not None}
            labels = list([i for i in range(len(angles_1_no_none.keys()))])
            values = list(angles_1_no_none.values())

            # print(angles_1_no_none)

            sine_fit = self.fit_sin(labels, values)
            angle_thresh = sine_fit["offset"] - abs(sine_fit["amp"])

            # epsilon -> tolerance
            # print(angle_thresh)
            min_values = [i for i in values if i <= angle_thresh]
            # If sine fit didn't work, pick the lowest position
            if len(min_values) == 0:
                min_values = [min(values)]

            # print(min_values)
            min_key = -1
            prev_frame = 0
            current_min = float('inf')

            # Messy af refactor later
            # Attempt to find key frame per every rep of the exercise
            for k, v in angles_1.items():
                if v not in min_values:
                    continue

                if k - 1 != prev_frame:
                    if min_key != -1:
                        candidate_frames.append(min_key)
                    elif len(candidate_frames) >= 0:
                        candidate_frames.append(k)  

                    min_key = -1
                    current_min = float('inf')
                else:
                    if v < current_min:
                        current_min = v
                        min_key = k
                prev_frame = k

        return candidate_frames if len(candidate_frames) != 0 else None

    def analyze_bottom_position(self, image_path, movement_type):
        criteria = open(os.path.join(self.base_dir, 'movement_criteria.json'))
        criteria_data = json.load(criteria)

        base_options = python.BaseOptions(model_asset_path=os.path.join(self.base_dir, 'pose_landmarker_heavy.task'))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=True)
        detector = vision.PoseLandmarker.create_from_options(options)
        img = mp.Image.create_from_file(image_path)
        detection_result = detector.detect(img)

        connections = self.analyze_photo(image_path, sensitivity=0.5)

        # print(connections)
        image_mat = cv2.imread(image_path)
        # if self.width < self.height:
        #     image_mat = cv2.rotate(image_mat, cv2.ROTATE_90_CLOCKWISE)

        analyzed_path = self.draw_points(image_mat, (os.path.basename(image_path)).strip('.jpg'), (255, 0, 0), connections)
        self.analyzed_images_path.append(analyzed_path)
        # self.draw_points(image, (0, 255, 0), connections_2)
        left_required, right_required = [], []

        for i in criteria_data[movement_type]["action_joints"]:
            if "LEFT" in i:
                left_required.append(i)
                left_required += criteria_data[movement_type]["action_joints"][i]
            else:
                right_required.append(i)
                right_required += criteria_data[movement_type]["action_joints"][i]

        profile = self.determine_profile(connections, left_required, right_required)
        c = criteria_data[movement_type]["assessment_side"]
        assessment_range = []

        # You can analyze the side profile with the front profile, but not the other way around, although it may
        # be inaccurate. Try both profiles and let the user discern themselves if they want both pieces of advice
        # if profile == "front":
        #     c.update(criteria_data["squat"]["assessment_front"])
        #     assessment_range += c

        for i in c:
            assessment_range.append(i)

        print("ASS")
        print(assessment_range)
        score_per_condition = {}
        for i in assessment_range:
            required_joints = {}
            print(c[i])

            for condition in c[i]:
                required_joints[condition] = c[i][condition]["joints"]

            for k, v in required_joints.items():
                target_slope = c[i][k]["m"]
                assessment_type = c[i][k]["assessment_type"]
                score = self.get_score(connections, v, target_slope, assessment_type, "side")
                if score is not None:
                    score_per_condition[k] = score

        # You can analyze the side profile with the front profile, but not the other way around, although it may
        # be inaccurate. Try both profiles and let the user discern themselves if they want both pieces of advice
        assessment_range = []

        if profile == "front":
            c = criteria_data[movement_type]["assessment_front"]

            for i in c:
                assessment_range.append(i)

            for i in assessment_range:
                required_joints = {}
                # print(c[i])

                for condition in c[i]:
                    required_joints[condition] = c[i][condition]["joints"]

                for k, v in required_joints.items():
                    target_slope = c[i][k]["m"]
                    assessment_type = c[i][k]["assessment_type"]
                    score = self.get_score(connections, v, target_slope, assessment_type, "side")
                    if score is not None:
                        score_per_condition[k] = score

        criteria.close()
        return score_per_condition

    def draw_points(self, img, img_name, colour, connection_list):
        img_height, img_width, _ = img.shape

        for k, joint in connection_list.items():
            cv2.circle(img, (int(joint.x * img_width), int(joint.y * img_height)), 5, colour,
                       -1)
            # cv2.putText(img, str(k), (int(joint.x * img_width), int(joint.y * img_height)), cv2.FONT_HERSHEY_SIMPLEX,
            #             0.5, (0, 0, 0))

        # joint = connection_list[PoseLandmark.LEFT_ANKLE]
        # cv2.circle(img, (int(joint.x * img_width), int(joint.y * img_height)), 5, (255, 255, 255),
        #            -1)
        # joint_knee = connection_list[PoseLandmark.RIGHT_KNEE]
        # joint_hip = connection_list[PoseLandmark.RIGHT_HIP]
        # cv2.line(img, (int(joint_knee.x * img_width), int(joint_knee.y * img_height)), (int(joint_hip.x * img_width), int(joint_hip.y * img_height)), (255, 0, 0), 5)
        # joint_knee_R = connection_list[PoseLandmark.RIGHT_KNEE]
        # joint_hip_R = connection_list[PoseLandmark.RIGHT_FOOT_INDEX]
        # joint_knee_L = connection_list[PoseLandmark.RIGHT_HEEL]
        # joint_hip_L = connection_list[PoseLandmark.LEFT_HIP]

        # vec_knee_R = np.array([joint_knee_R.x, joint_knee_R.y, joint_knee_R.z])
        # vec_hip_R = np.array([joint_hip_R.x, joint_hip_R.y, joint_hip_R.z])
        # vec_knee_L = np.array([joint_knee_L.x, joint_knee_L.y, joint_knee_L.z])
        # vec_hip_L = np.array([joint_hip_L.x, joint_hip_L.y, joint_hip_L.z])
        # pos = vec_hip_R - vec_knee_R
        # print("Right knee:", joint_knee_R)
        # print("Right hip:", joint_hip_R)
        # print("|D_R|:", np.linalg.norm(vec_hip_R - vec_knee_R), "D_R:", vec_hip_R - vec_knee_R)
        # d_x = joint_hip_R.x - joint_knee_R.x
        # d_y = joint_hip_R.y - joint_knee_R.y
        # d_z = joint_hip_R.z - joint_knee_R.z
        # d = vec_knee_L
        # pos = vec_hip_R

        # cv2.line(img, (int(vec_knee_R[0] * img_width), int(vec_knee_R[1] * img_height)),
        #          (int(pos[0] * img_width), int(pos[1] * img_height)), (0, 255, 0), 5)
        # cv2.line(img, (int(vec_knee_R[0] * img_width), int(vec_knee_R[1] * img_height)),
        #          (int(d[0] * img_width), int(d[1] * img_height)), (0, 0, 255), 5)

        # print(pos)

        # angle = math.acos((np.dot(pos, d)) / (self.magnitude(pos) * self.magnitude(d)))
        # print("m_R:", pos[1]/np.linalg.norm(np.array([pos[0]])))
        # print("angle:", math.degrees(angle))
        # print("|D_L|:", np.linalg.norm(vec_hip_L- vec_knee_L), "D_L:", vec_hip_L - vec_knee_L)
        # print("Left Hip:", joint_hip_R)
        cv2.imwrite(os.path.join(self.sequence_path, img_name + "_mediapipe.jpg"), img)
        return os.path.join(self.sequence_path, img_name + "_mediapipe.jpg")

    def determine_profile(self, connections, required_landmarks_left, required_landmarks_right, delta_x_side_thresh=0.075):
        landmarks = connections.keys()
        # First check: Do our landmarks match for each side? If they don't, we can already say its a side profile
        front_profile = required_landmarks_left + required_landmarks_right
        if len([landmark for landmark in front_profile if getattr(PoseLandmark, landmark) in landmarks]) != len(front_profile):
            return "side"

        # print(connections.keys())
        # Second check: How far are the x coordinates of the left and right landmarks from each other?
        # If it is a side profile, the x coordinates will be very close. If it is more than x distance (normalized)
        # away, we can say its a side profile.
        delta_xs = []
        for i in range(len(required_landmarks_left)):
            # print(required_landmarks_left[i])
            left_landmark = connections.get(getattr(PoseLandmark, required_landmarks_left[i]))
            right_landmark = connections.get(getattr(PoseLandmark, required_landmarks_right[i]))

            if left_landmark is None or right_landmark is None:
                continue

            delta_x = abs(abs(left_landmark.x) - abs(right_landmark.x))
            delta_xs.append(delta_x)

        avg = np.average(np.array(delta_xs))
        print("Dx:", delta_xs)
        if avg <= delta_x_side_thresh:
            return "side"
        else:
            return "front"

    def add_side_prefix(self, joints):
        left_side, right_side = [], []
        for j in joints:
            left_side.append("LEFT_" + j) if j != "MOUTH" else left_side.append(j + "_LEFT")
            right_side.append("RIGHT_" + j) if j != "MOUTH" else right_side.append(j + "_RIGHT")

        return left_side, right_side

    def get_score(self, connections, analyzed_joints, target_slope, assessment_type, profile):
        scores = []
        print("A:", analyzed_joints)
        print(assessment_type)
        if assessment_type == "line":
            for joints in analyzed_joints:
                p1, p2 = None, None
                joint_pair = self.add_side_prefix(joints) if profile == "side" else ([joints])

                print(joint_pair)
                for joint in joint_pair:
                    p1 = connections.get(getattr(PoseLandmark, joint[0]))
                    p2 = connections.get(getattr(PoseLandmark, joint[1]))

                    if p1 is None or p2 is None:
                        continue

                    slope = self.get_slope(p1, p2, m_inf_threshold)
                    if slope == 'inf':
                        scores.append(self.get_percent_diff(slope, target_slope))
                    else:
                        scores.append(self.get_percent_diff(abs(slope), target_slope))

        # The ugly one
        elif assessment_type == "parallel_lines":
            first_joints = analyzed_joints['first_line']
            second_joints = analyzed_joints['second_line']

            for joints_1 in first_joints:
                left_side_first, right_side_first = self.add_side_prefix(joints_1) if profile == "side" else (joints_1)
                for joints_2 in second_joints:
                    left_side_second, right_side_second = self.add_side_prefix(joints_2) if profile == "side" else (joints_1, joints_2)
                    if profile == "front":
                        left_side_first, right_side_first = (joints_1, joints_2)
                    slope_left_first, slope_left_second, slope_right_first, slope_right_second = None, None, None, None
                    print(left_side_second, right_side_second, left_side_first, right_side_first)

                    p1_left_first = connections.get(getattr(PoseLandmark, left_side_first[0]))
                    p2_left_first = connections.get(getattr(PoseLandmark, left_side_first[1]))
                    p1_left_second = connections.get(getattr(PoseLandmark, left_side_second[0]))
                    p2_left_second = connections.get(getattr(PoseLandmark, left_side_second[1]))
                    p1_right_first = connections.get(getattr(PoseLandmark, right_side_first[0]))
                    p2_right_first = connections.get(getattr(PoseLandmark, right_side_first[1]))
                    p1_right_second = connections.get(getattr(PoseLandmark, right_side_second[0]))
                    p2_right_second = connections.get(getattr(PoseLandmark, right_side_second[1]))

                    if None not in (p1_left_first, p2_left_first, p1_left_second, p2_left_second):
                        slope_left_first = abs(self.get_slope(p1_left_first, p2_left_first, m_inf_threshold))
                        slope_left_second = abs(self.get_slope(p1_left_second, p2_left_second, m_inf_threshold))
                    if None not in (p1_right_first, p2_right_first, p1_right_second, p2_right_second):
                        slope_right_first = abs(self.get_slope(p1_right_first, p2_right_first, m_inf_threshold))
                        slope_right_second = abs(self.get_slope(p1_right_second, p2_right_second, m_inf_threshold))

                    if target_slope != "None":
                        if slope_left_first is not None and slope_left_second is not None:
                            diff_1 = self.get_percent_diff(slope_left_first, target_slope)
                            diff_2 = self.get_percent_diff(slope_left_second, target_slope)
                            scores.append(np.average(np.array([diff_1, diff_2])))
                        if slope_right_first is not None and slope_right_second is not None:
                            diff_1 = self.get_percent_diff(slope_right_first, target_slope)
                            diff_2 = self.get_percent_diff(slope_right_second, target_slope)
                            scores.append(np.average(np.array([diff_1, diff_2])))
                    else:
                        if slope_left_first is not None and slope_left_second is not None:
                            scores.append(self.get_percent_diff(slope_left_first, slope_left_second))
                        if slope_right_first is not None and slope_right_second is not None:
                            scores.append(self.get_percent_diff(slope_right_first, slope_right_second))
        elif assessment_type == "min_line":
            for joints in analyzed_joints:
                left_side, right_side = self.add_side_prefix(joints) if profile == "side" else joints

                for joint in (left_side, right_side):
                    p1 = connections.get(getattr(PoseLandmark, joint[0]))
                    p2 = connections.get(getattr(PoseLandmark, joint[1]))

                    if p1 is None or p2 is None:
                        continue

                    slope = self.get_slope(p1, p2, m_inf_threshold)

                    if slope >= target_slope:
                        scores.append(0)
                    else:
                        if slope == 'inf':
                            scores.append(self.get_percent_diff(slope, target_slope))
                        else:
                            scores.append(self.get_percent_diff(abs(slope), target_slope))
        elif assessment_type == "max_line":
            for joints in analyzed_joints:
                left_side, right_side = self.add_side_prefix(joints) if profile == "side" else joints

                for joint in (left_side, right_side):
                    p1 = connections.get(getattr(PoseLandmark, joint[0]))
                    p2 = connections.get(getattr(PoseLandmark, joint[1]))

                    if p1 is None or p2 is None:
                        continue

                    slope = self.get_slope(p1, p2, m_inf_threshold)

                    if slope <= target_slope:
                        scores.append(0)
                    else:
                        if slope == 'inf':
                            scores.append(self.get_percent_diff(slope, target_slope))
                        else:
                            scores.append(self.get_percent_diff(abs(slope), target_slope))

        return min([abs(i) for i in scores]) if len(scores) != 0 else None
    
    def purge(self):
        send2trash.send2trash(self.sequence_path)
        send2trash.send2trash(self.video_path)


# lift_folders = ["squat", "deadlifting", "bench pressing"]
# videoAnalyzer = VideoAnalyzer(r'a3796e88-5545-4590-a0ed-c52facd4ef8b.mp4', 5)
# videoAnalyzer.sequence_path = r'./images_alMQkEhX0I8'
# videoAnalyzer.split_frames()

# KEY POINTS FOR EACH LIFT WE ARE ANALYZING
# Include right and left profiles as well for deadlift and bench
key_points = {
    "squat": [[PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_KNEE, PoseLandmark.LEFT_KNEE,
               PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP],
              [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_HIP],
              [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_HIP]],
    "deadlifting": [[PoseLandmark.RIGHT_KNEE, PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
                     PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER, PoseLandmark.LEFT_ELBOW,
                     PoseLandmark.RIGHT_ELBOW,
                     PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST],
                    [PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_SHOULDER,
                     PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST],
                    [PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_SHOULDER,
                     PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST]],
    "bench pressing": [[PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER, PoseLandmark.LEFT_ELBOW,
                        PoseLandmark.RIGHT_ELBOW, PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST],
                       [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST],
                       [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST]]
}
action_joints = {"squat": [[PoseLandmark.LEFT_KNEE, (PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_ANKLE)],
                           [PoseLandmark.RIGHT_KNEE, (PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_ANKLE)]]}
# key_frames = videoAnalyzer.find_key_time("squat")

# for i in key_frames:
#     print(videoAnalyzer.analyze_bottom_position(fr"{os.path.join(videoAnalyzer.sequence_path, i)}", "squat"))
# draw_joints(lift_folders, key_points, action_joints)
