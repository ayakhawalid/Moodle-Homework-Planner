#Wesal Amasha, 211579347

import cv2
import numpy as np
import matplotlib.pyplot as plt


def get_laplacian_pyramid(image, levels, resize_ratio=0.5):
    image=np.float32(image)
    pyramid = []
    for _ in range(levels-1):
        # Apply Gaussian blur to the image
        blurred = cv2.GaussianBlur(image, (5, 5), 0)
        # Downsample the blurred image
        downsampled = cv2.resize(blurred, (0, 0), fx=resize_ratio, fy=resize_ratio)
        # Upsample the downsampled image to the original size
        upsampled = cv2.resize(downsampled, (image.shape[1], image.shape[0]))
        # Compute the Laplacian by subtracting the upsampled image from the original image
        laplacian = cv2.subtract(image, upsampled)
        # Append the laplacian level to the pyramid
        pyramid.append(laplacian)
        image = downsampled
    # Append the lowest frequency component to the pyramid
    pyramid.append(image)
    return pyramid


def restore_from_pyramid(pyramidList, resize_ratio=2):
    # Start from the low frequency component
    restored = pyramidList[-1]
    for i in range(len(pyramidList) - 2, -1, -1):
        # Upsample the restored image
        expanded = cv2.resize(restored, (0, 0), fx=resize_ratio, fy=resize_ratio)
        # Add the upsampled image to the Laplacian level
        restored = expanded + pyramidList[i]
    return np.clip(restored, 0, 255).astype(np.uint8)


def validate_operation(img):
    pyr = get_laplacian_pyramid(img, levels)
    img_restored = restore_from_pyramid(pyr)

    plt.title(f"MSE is {np.mean((img_restored - img) ** 2)}")
    plt.imshow(img_restored, cmap='gray')

    plt.show()


######### The reverse version related to result 1 if you want to run it adjust levels=6
# def blend_pyramids(levels):
#     blended_pyr = []
#
#     pyr_apple_reverse = pyr_apple[::-1]
#     pyr_orange_reverse = pyr_orange[::-1]
#
#     for curr_level in range(levels):
#
#         apple_level = pyr_apple_reverse[curr_level]
#         orange_level = pyr_orange_reverse[curr_level]
#
#
#         # Define a mask in the size of the current pyramid level
#         mask = np.zeros_like(apple_level, dtype=np.float32)
#
#         #Initialize the mask's columns
#         mask[:, :int(0.5 * apple_level.shape[1] - curr_level+1)] = 1.0
#
#         # Cross dissolve window
#         for i in range(2 * (curr_level + 1)):
#             mask[:, apple_level.shape[1] // 2 - (curr_level + 1) + i] = 0.9 - 0.9 * i / (2 * (curr_level + 1))
#
#         # Blend the pyramid levels
#         blended_level = orange_level * mask + apple_level * (1 - mask)
#
#         # Append the blended level to the result pyramid
#         blended_pyr.append(blended_level)
#
#     blended_pyr = blended_pyr[::-1]
#
#     return blended_pyr


# ######### The reverse version related to result 2 if you want to run it adjust levels=6
# def blend_pyramids(levels):
#     blended_pyr = []
#
#     pyr_apple_reverse = pyr_apple[::-1]
#     pyr_orange_reverse = pyr_orange[::-1]
#
#     for curr_level in range(levels):
#
#         apple_level = pyr_apple_reverse[curr_level]
#         orange_level = pyr_orange_reverse[curr_level]
#
#         # Define a mask in the size of the current pyramid level
#         mask = np.zeros_like(apple_level, dtype=np.float32)
#
#         # Initialize the mask's columns
#         mask[:, :int(0.5 * apple_level.shape[1] - curr_level)] = 1.0
#
#         # Cross dissolve window
#         for i in range(int(0.5 * apple_level.shape[1] - curr_level), int(0.5 *  apple_level.shape[1] + curr_level)):
#             mask[:, i] = 0.9 - 0.9 * (i-(0.5 * apple_level.shape[1]- curr_level) )/ (2 * curr_level)
#
#         # Blend the pyramid levels
#         blended_level = orange_level * mask + apple_level * (1 - mask)
#
#         # Append the blended level to the result pyramid
#         blended_pyr.append(blended_level)
#
#     blended_pyr = blended_pyr[::-1]
#
#     return blended_pyr

######### The version related to result if you want to run it adjust levels=5
def blend_pyramids(levels):
    blended_pyr = []
    for curr_level in range(levels):

        apple_level = pyr_apple[curr_level]
        orange_level = pyr_orange[curr_level]

        # Define a mask in the size of the current pyramid level
        mask = np.zeros_like(apple_level, dtype=np.float32)

        #Initialize the mask's columns
        mask[:, :int(0.5 * apple_level.shape[1] - curr_level+1)] = 1.0

        # Cross dissolve window
        for i in range(2 * (curr_level + 1)):
            mask[:, apple_level.shape[1] // 2 - (curr_level + 1) + i] = 0.9 - 0.9 * i / (2 * (curr_level + 1))

        # Blend the pyramid levels
        blended_level = orange_level * mask + apple_level * (1 - mask)

        # Append the blended level to the result pyramid
        blended_pyr.append(blended_level)


    return blended_pyr


def plot_pyramid(pyramid, title):
    num_levels = len(pyramid)
    fig, axs = plt.subplots(1, num_levels, figsize=(15, 5))
    fig.suptitle(title)

    for i in range(num_levels):
        axs[i].imshow(pyramid[i], cmap='gray')
        axs[i].axis('off')
        axs[i].set_title(f'Level {i}')

    plt.show()

levels = 5

apple = cv2.imread('apple.jpg')
apple = cv2.cvtColor(apple, cv2.COLOR_BGR2GRAY)

orange = cv2.imread('orange.jpg')
orange = cv2.cvtColor(orange, cv2.COLOR_BGR2GRAY)

# Validate restoration operation for apple and orange images
validate_operation(apple)
validate_operation(orange)

# Generate Laplacian pyramids for both images
pyr_apple = get_laplacian_pyramid(apple, levels)
pyr_orange = get_laplacian_pyramid(orange, levels)

pyr_result = blend_pyramids(levels)


# # Plot the pyramids
# plot_pyramid(pyr_apple, "Apple Laplacian Pyramid")
# plot_pyramid(pyr_orange, "Orange Laplacian Pyramid")
# plot_pyramid(pyr_result, "Blended Laplacian Pyramid")


# Restore the final blended image from its Laplacian pyramid
final = restore_from_pyramid(pyr_result)

# Display the final result and save it
plt.imshow(final, cmap='gray')
plt.show()
cv2.imwrite("result.jpg", final)
