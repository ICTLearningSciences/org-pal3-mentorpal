import numpy as np
import numpy.random
import matplotlib.pyplot as plt


# takes in a 2D matrix with frequency values for word meanings
# returns and shows a heat map
def getHeatMap(freqValues):
    # graph labels
    plt.title("word frequency heat map")
    plt.ylabel("y")
    plt.xlabel("x")

    # plug the data into pcolormesh
    plt.pcolormesh(x, y, intensity)
    plt.colorbar()  # colorbar to show the intensity scale
    plt.show()

    return plt


# test main
if __name__ == "__main__":
    # here's our data to plot, all normal Python lists
    x = [1, 2, 3, 4, 5]
    y = [0.1, 0.2, 0.3, 0.4, 0.5]

    intensity = [
        [5, 10, 15, 20, 25],
        [30, 35, 40, 45, 50],
        [55, 60, 65, 70, 75],
        [80, 85, 90, 95, 100],
        [105, 110, 115, 120, 125],
    ]

    # setup the 2D grid with Numpy
    x, y = np.meshgrid(x, y)

    # convert intensity (list of lists) to a numpy array for plotting
    intensity = np.array(intensity)

    getHeatMap(intensity)
