from flask import Flask, request, jsonify, render_template, send_from_directory, redirect

from logics import calculate_parts, calculate_final
from ml.analyze import analyze_scores


app = Flask(__name__)

@app.before_request
def force_non_www():
    if request.host.startswith("www."):
        return redirect("https://bilimcalc.onrender.com" + request.full_path, code=301)
    
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/robots.txt')
@app.route('/sitemap.xml')
def static_from_root():
    return send_from_directory('static', request.path[1:])

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json

    so = data.get("so")
    sors = data.get("sors")
    soch = data.get("soch")

    parts = calculate_parts(so=so, sors=sors, soch=soch)
    final_result = calculate_final(*parts)

    return jsonify({
        "total_so": parts[0],
        "total_sor": parts[1],
        "total_soch": parts[2],
        "final_result": final_result
    })
    
@app.route('/trend', methods=['POST'])
def trend():
    data = request.json
    scores = data.get("scores", [])
    
    result = analyze_scores(scores)
    return jsonify(result)
    