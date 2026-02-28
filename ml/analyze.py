import numpy as np
from .model import linear_regression


def analyze_scores(scores):
    x = np.arange(1, len(scores) + 1)
    y = np.array(scores)
    model = linear_regression(x, y)

    return {
        "scores":      scores,
        "x":           x.tolist(),
        "predictions": model["predictions"],
        "accuracy":    model["accuracy"],
        "slope":       model["slope"],
    }