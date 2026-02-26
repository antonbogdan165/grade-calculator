# Веса компонентов итоговой оценки (Казахстан: 25% + 25% + 50%)
SO_WEIGHT   = 25   # СО  — 25% итоговой оценки
SOR_WEIGHT  = 25   # СОР — 25% итоговой оценки
SOCH_WEIGHT = 50   # СОЧ — 50% итоговой оценки

SO_MAX_SCORE = 10 # Максимальный балл за СО (шкала 1 - 10)


def calculate_parts(so: list,
                sors: list = None, 
                soch: tuple = None) -> tuple:
    """
    Переводит сырые оценки в взвешенные компоненты итоговой оценки.

    Аргументы:
        so:   Список оценок СО (формативные), каждая в диапазоне 2–10
        sors: Список кортежей (набрано, максимум) для СОР
        soch: Кортеж (набрано, максимум) для СОЧ

    Возвращает:
        (total_so, total_sor, total_soch) — каждый компонент уже в итоговой шкале:
        СО → 0..25, СОР → 0..25, СОЧ → 0..50
        None, если данных нет.
    """
    
    # --- СО ---
    total_so = None
    if so:
        avg_so = sum(so) / len(so)
        total_so = (avg_so / SO_MAX_SCORE) * SO_WEIGHT
    
    # --- СОР ---
    sor_percentages = []
    if sors:
        for dialed, maximum in sors:
            if maximum != 0:
                sor_percentages.append(dialed / maximum * 100)

    total_sor = None
    if sor_percentages:
        avg_sor_pct = sum(sor_percentages) / len(sor_percentages)
        total_sor = (avg_sor_pct / 100) * SOR_WEIGHT
                
    # --- СОЧ ---
    total_soch = None   
    if soch:
        dialed, maximum = soch
        if maximum != 0:
            total_soch = dialed / maximum * 100
            total_soch = (total_soch / 100) * SOCH_WEIGHT
    
    return total_so , total_sor, total_soch


def calculate_final(total_so: float , total_sor: float, total_soch: float) -> float:
    """
    Вычисляет итоговую оценку из компонентов.

    Логика согласно методике МОН РК:
    - Все три компонента: SO + SOR + SOCH (= 100%)
    - Только SO + SOR: умножаем на 2, так как они вместе = 50%
    - Только SO: умножаем на 4, так как SO = 25%
    - Нет данных: None

    Ссылка: https://help.bilimland.kz/l_RUS/knowledge_base/item/354267
    """
    if total_so is not None and total_sor is not None and total_soch is not None:
        return round(total_so + total_sor + total_soch, 4)
    
    elif total_so is not None and total_sor is not None:
        # SO (25%) + SOR (25%) = 50% → масштабируем до 100%
        return round(((total_so + total_sor) * 2), 4)
    
    elif total_so is not None:
        # SO (25%) → масштабируем до 100%
        return round(total_so * 4, 4)
    
    else:
        return None