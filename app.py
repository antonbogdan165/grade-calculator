from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
import os
import time

from logics import calculate_parts, calculate_final
from ml.analyze import analyze_scores


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24))
BUILD_TIME = str(int(time.time()))


ARTICLE_ROUTES = {
    "/kak-rasschitat-soch":           "kak-rasschitat-soch.html",
    "/kak-rasschitat-sor":            "kak-rasschitat-sor.html",
    "/kak-rasschitat-so":             "kak-rasschitat-so.html",
    "/itogovaya-ocenka-za-chetvert":  "itogovaya-ocenka-za-chetvert.html",
    "/metodika-rascheta-mon-rk":      "metodika-rascheta-mon-rk.html",
}


@app.before_request
def force_non_www():
    if request.host.startswith("www."):
        return redirect("https://bilimcalc.vercel.app/" + request.full_path, code=301)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/robots.txt")
@app.route("/sitemap.xml")
def static_from_root():
    return send_from_directory("static", request.path[1:])


@app.route("/sw.js")
def service_worker():
    sw_path = os.path.join(app.root_path, "static", "js", "sw.js")
    with open(sw_path, "r", encoding="utf-8") as f:
        content = f.read().replace("__BUILD_TIME__", BUILD_TIME)
    response = app.response_class(response=content, mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/icons", "favicon.ico")


@app.route("/calculate", methods=["POST"])
def calculate():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Некорректный JSON"}), 400

    so   = data.get("so", [])
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
        "total_so":     parts[0],
        "total_sor":    parts[1],
        "total_soch":   parts[2],
        "final_result": final_result,
    })


@app.route("/trend", methods=["POST"])
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


def _make_article_view(template):
    def view():
        return render_template(template)
    view.__name__ = template
    return view


for path, template in ARTICLE_ROUTES.items():
    app.add_url_rule(path, view_func=_make_article_view(template))


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404