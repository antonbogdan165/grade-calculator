import numpy as np


def rmse(labels, predictions):
    n = len(labels)
    differences = np.subtract(labels, predictions)
    result = np.sqrt(1.0 / n * (np.dot(differences, differences)))
    return result


def linear_regression(features, labels, **kwargs):
    """
    Аналитическое решение линейной регрессии (метод наименьших квадратов).
    Гарантированно находит оптимальный slope/intercept за O(n),
    без случайности SGD — поэтому тренд всегда отражает реальные данные.
    """
    x = np.array(features, dtype=float)
    y = np.array(labels, dtype=float)

    x_mean = x.mean()
    y_mean = y.mean()

    # slope = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
    numerator   = np.sum((x - x_mean) * (y - y_mean))
    denominator = np.sum((x - x_mean) ** 2)

    if denominator == 0:
        slope = 0.0
    else:
        slope = numerator / denominator

    intercept = y_mean - slope * x_mean

    final_predictions = x * slope + intercept

    final_rmse = rmse(y, final_predictions)

    max_grade = 10
    accuracy = 100 - (final_rmse / max_grade) * 100
    accuracy = float(np.clip(accuracy, 0, 100))

    return {
        "slope": float(slope),
        "intercept": float(intercept),
        "predictions": final_predictions.tolist(),
        "accuracy": round(accuracy, 1)
    }