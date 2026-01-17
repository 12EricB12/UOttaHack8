import numpy as np
import cv2
import math
import matplotlib as plt
import scipy.optimize


class DataAnalyzer:
    # Checks if the required points exist for our dataset
    # NOTE: These points can change depending on your needs. For example, if you were tracking a squat, the most important
    # joints would be the knees and hips. As long as those key points are there, the model should be able to
    # classify it as a squat. Remember: the analysis comes AFTER the classification.
    def validate(self, connection_ids, valid_points):
        return all(e in connection_ids for e in valid_points)

    def get_position_vector(self, x, y, width, height):
        origin = np.array((width / 2, height / 2), dtype=float)
        current = np.array((x, y), dtype=float)
        position = current - origin

        return position

    def get_mask_corners_cv(self, segmentation_mask, condition):
        binary_mask = segmentation_mask > 0.1  # Convert to binary mask
        y_indices, x_indices = np.where(binary_mask)  # Get nonzero pixel indices

        if len(x_indices) == 0 or len(y_indices) == 0:
            return None  # No mask detected

        # Get corners
        x_min, x_max = np.min(x_indices), np.max(x_indices)
        y_min, y_max = np.min(y_indices), np.max(y_indices)

        return x_min, x_max, y_min, y_max  # Top-left, Bottom-right

    def get_angle(self, target_joint, adj_joint_1, adj_joint_2, debug_img=None):
        # A dot B = ABcos(theta), theta = arccos(A dot B/AB)
        target_joint = np.array([target_joint.x, target_joint.y, target_joint.z])
        adj_joint_1 = np.array([adj_joint_1.x, adj_joint_1.y, adj_joint_1.z])
        adj_joint_2 = np.array([adj_joint_2.x, adj_joint_2.y, adj_joint_2.z])

        t1 = np.subtract(adj_joint_1, target_joint)
        t2 = np.subtract(adj_joint_2, target_joint)
        print(target_joint, adj_joint_1, adj_joint_2)

        # DEBUG ONLY
        if debug_img is not None:
            img_height, img_width, _ = debug_img.shape

            cv2.circle(debug_img, (int(target_joint[0] * img_width), int(target_joint[1] * img_height)), 5, (255, 0, 0),
                       -1)
            cv2.circle(debug_img, (int(adj_joint_1[0] * img_width), int(adj_joint_1[1] * img_height)), 5, (0, 255, 0),
                       -1)
            cv2.circle(debug_img, (int(adj_joint_2[0] * img_width), int(adj_joint_2[1] * img_height)), 5, (0, 0, 255),
                       -1)

            cv2.imshow('test', debug_img)
            cv2.waitKey(0)

        return math.acos((np.dot(t1, t2)) / (self.magnitude(t1) * self.magnitude(t2)))

    def magnitude(self, vector):
        return math.sqrt(sum(pow(i, 2) for i in vector))

    # Polynomial Regression
    def polyfit(self, x, y, degree):
        results = {}

        coeffs = np.polyfit(x, y, degree)

        # Polynomial Coefficients
        results['polynomial'] = coeffs.tolist()

        # r-squared
        p = np.poly1d(coeffs)
        # fit values, and mean
        yhat = p(x)  # or [p(z) for z in x]
        ybar = np.sum(y) / len(y)  # or sum(y)/len(y)
        ssreg = np.sum((yhat - ybar) ** 2)  # or sum([ (yihat - ybar)**2 for yihat in yhat])
        sstot = np.sum((y - ybar) ** 2)  # or sum([ (yi - ybar)**2 for yi in y])
        results['determination'] = ssreg / sstot

        return results

    # From: https://stackoverflow.com/questions/16716302/how-do-i-fit-a-sine-curve-to-my-data-with-pylab-and-numpy
    # If you are reading this, thank you! :)
    def fit_sin(self, tt, yy):
        '''Fit sin to the input time sequence, and return fitting parameters "amp", "omega", "phase", "offset", "freq", "period" and "fitfunc"'''
        tt = np.array(tt)
        yy = np.array(yy)
        ff = np.fft.fftfreq(len(tt), (tt[1] - tt[0]))  # assume uniform spacing
        Fyy = abs(np.fft.fft(yy))
        guess_freq = abs(
            ff[np.argmax(Fyy[1:]) + 1])  # excluding the zero frequency "peak", which is related to offset
        guess_amp = np.std(yy) * 2. ** 0.5
        guess_offset = np.mean(yy)
        guess = np.array([guess_amp, 2. * np.pi * guess_freq, 0., guess_offset])

        def sinfunc(t, A, w, p, c):  return A * np.sin(w * t + p) + c

        popt, pcov = scipy.optimize.curve_fit(sinfunc, tt, yy, p0=guess)
        A, w, p, c = popt
        f = w / (2. * np.pi)
        fitfunc = lambda t: A * np.sin(w * t + p) + c
        return {"amp": A, "omega": w, "phase": p, "offset": c, "freq": f, "period": 1. / f, "fitfunc": fitfunc,
                "maxcov": np.max(pcov), "rawres": (guess, popt, pcov)}

    def get_slope(self, landmark_1, landmark_2, m_inf_threshold):
        if landmark_2.x - landmark_1.x == 0:
            return 'inf'

        m = (landmark_2.y - landmark_1.y) / (landmark_2.x - landmark_1.x)
        if m >= m_inf_threshold:
            return 'inf'
        return m

    def get_percent_diff(self, actual_value, desired_value, m_inf_threshold=100):
        # If the target value is 0, the % diff formula always gives 200%, so multiply actual value by 100 in this case
        if desired_value == 0:
            return actual_value * 100
        # Infinity case
        if actual_value == "inf" and desired_value == "inf":
            return 0
        elif actual_value == "inf" and desired_value != "inf":
            return float('inf')
        elif actual_value != "inf" and desired_value == "inf":
            return (abs(actual_value - m_inf_threshold) / ((actual_value + m_inf_threshold) / 2)) * 100
        # Normal case
        return (abs(desired_value - actual_value) / ((desired_value + actual_value) / 2)) * 100
