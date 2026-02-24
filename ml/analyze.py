import numpy as np
from .model import linear_regression


def analyze_scores(scores):

    features = np.arange(1, len(scores)+1)
    labels = np.array(scores)

    model = linear_regression(features, labels)

    return {
        "scores": scores,
        "x": features.tolist(),
        "predictions": model["predictions"],
        "accuracy": model["accuracy"],
        "slope": model["slope"]
    }