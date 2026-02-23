from flask import Flask, request, jsonify, render_template

from logics import calculate_parts, calculate_final


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

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
    
    
if __name__ == '__main__':
    app.run(debug=True)