def calculate_parts(so: list,
                sors: list = None, 
                soch: tuple = None) -> tuple:
    
    # --- ФО ---
    total_so = None
    if so:
        total_so = sum(so) / len(so) * 2.5
    
    # --- СОР ---
    sorses = []
    if sors:
        for dialed, maximum in sors:
            if maximum != 0:
                sorses.append(dialed / maximum * 100)

    total_sor = None
    if sorses:
        total_sor = sum(sorses) / len(sorses) * 0.25
                
    # --- СОЧ ---
    total_soch = None   
    if soch:
        dialed, maximum = soch
        if maximum != 0:
            total_soch = dialed / maximum * 50
    
    return total_so , total_sor, total_soch  # 25% за СО и 25% за СОР и 50% за СОЧ


def calculate_final(total_so: float , total_sor: float, total_soch: float) -> float:
    
    if total_so is not None and total_sor is not None and total_soch is not None:
        return total_so + total_sor + total_soch
    
    elif total_so is not None and total_sor is not None:
        return (total_so + total_sor) * 2
    
    elif total_so is not None:
        return total_so * 4
    
    else:
        return None