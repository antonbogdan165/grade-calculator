import random
import numpy as np


def square_trick(base_price, price_per_room, num_rooms, price, learning_rate):
    predicted_price = base_price + price_per_room * num_rooms  # y = b + mx
    base_price += learning_rate * (price - predicted_price)  # b += n(p - y)
    price_per_room += learning_rate * num_rooms * (price - predicted_price) # m += nx(p - y)

    return price_per_room, base_price

# Код для вычесления RMSE
def rmse(labels, predictions):
        n = len(labels)
        differences = np.subtract(labels, predictions)
        result = np.sqrt(1.0/n * (np.dot(differences, differences)))
        
        return result


# Код для вычесления Линейной регрессии
def linear_regression(features, labels, learning_rate = 0.001, epochs=1000):
        price_per_room = np.random.randn()
        base_price = np.random.randn()

        loss_history = []

        for epoch in range(epochs):
                # сохранение ошибок
                predictions = features * price_per_room + base_price
                current_loss = rmse(labels=labels, predictions=predictions)
                loss_history.append(current_loss)
                
                # берется рандомная точка
                i = random.randint(0, len(features)-1)
                num_rooms = features[i]
                price = labels[i]
                # применяем для нее квадротичный подход
                price_per_room, base_price = square_trick(base_price,
                                                        price_per_room,
                                                        num_rooms, 
                                                        price, 
                                                        learning_rate=learning_rate)
                
        # финальные предсказания
        final_predictions = features * price_per_room + base_price

        # финальная ошибка
        final_rmse = rmse(labels, final_predictions)

        # перевод в "точность"
        max_grade = 10
        accuracy = 100 - (final_rmse / max_grade) * 100
        accuracy = max(0, min(100, accuracy))

        return {
            "slope": float(price_per_room),
            "intercept": float(base_price),
            "predictions": final_predictions.tolist(),
            "loss": loss_history,
            "accuracy": round(accuracy, 1)
        }