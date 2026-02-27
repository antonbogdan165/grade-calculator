from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
import os

from logics import calculate_parts, calculate_final
from ml.analyze import analyze_scores


app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24))

@app.before_request
def force_non_www():
    if request.host.startswith("www."):
        return redirect("https://bilimcalc.vercel.app/" + request.full_path, code=301)
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/robots.txt')
@app.route('/sitemap.xml')
def static_from_root():
    return send_from_directory('static', request.path[1:])

@app.route('/sw.js')
def service_worker():
    response = send_from_directory('static/js', 'sw.js')
    response.headers['Service-Worker-Allowed'] = '/'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Некорректный JSON"}), 400
    
    so = data.get("so", [])
    sors = data.get("sors", [])
    soch = data.get("soch")
    
    if not isinstance(so, list) or not isinstance(sors, list):
        return jsonify({"error": "Поля 'so' и 'sors' должны быть массивами"}), 400

    try:
        parts = calculate_parts(so=so, sors=sors, soch=soch)
        final_result = calculate_final(*parts)
    except Exception as e:
        app.logger.error(f"Ошибка при вычислении: {e}")
        return jsonify({"error": "Ошибка при вычислении"}), 500

    return jsonify({
        "total_so": parts[0],
        "total_sor": parts[1],
        "total_soch": parts[2],
        "final_result": final_result
    })
    
@app.route('/trend', methods=['POST'])
def trend():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Некорректный JSON"}), 400
    
    scores = data.get("scores", [])
    
    if not isinstance(scores, list):
        return jsonify({"error": "Поле 'scores' должно быть массивом"}), 400
    
    try:
        result = analyze_scores(scores)
    except Exception as e:
        app.logger.error(f"Ошибка ML анализа: {e}")
        return jsonify({"error": "ML анализ недоступен"}), 500
    
    return jsonify(result)

# Страницы-статьи
@app.route('/kak-rasschitat-soch')
def how_to_calculate_soch():
    return render_template('kak-rasschitat-soch.html')

@app.route('/kak-rasschitat-sor')
def how_to_calculate_sor():
    return render_template('kak-rasschitat-sor.html')

@app.route('/kak-rasschitat-so')
def how_to_calculate_so():
    return render_template('kak-rasschitat-so.html')

@app.route('/itogovaya-ocenka-za-chetvert')
def itogovaya_article():
    return render_template('itogovaya-ocenka-za-chetvert.html')

@app.route('/metodika-rascheta-mon-rk')
def metodika_article():
    return render_template('metodika-rascheta-mon-rk.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static/icons', 'favicon.ico')