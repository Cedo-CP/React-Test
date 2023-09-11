from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
import openai
import tiktoken
import pdfplumber
import os
import requests
import tempfile
import time
import logging
from dotenv import load_dotenv

app = Flask(__name__, static_folder='financial-summarizer/src/components/build')
CORS(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0')

load_dotenv()

# Set up basic logging configuration
logging.basicConfig(level=logging.INFO)

openai.api_base = "https://openrouter.ai/api/v1"
openai.api_key = os.getenv("OPENAI_API_KEY")
print(os.getenv("OPENAI_API_KEY"))
OPENROUTER_REFERRER = "https://github.com/Cedo-CP/GPT.git"

CHUNK_SIZE = 30000  # Adjust as needed

for rule in app.url_map.iter_rules():
    print(f'Endpoint: {rule.endpoint}, Route: {rule.rule}, Methods: {rule.methods}')

def extract_text_from_pdf(pdf_url, pages=None):
    with requests.get(pdf_url, stream=True) as response:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            for chunk in response.iter_content(chunk_size=128):
                tmp_file.write(chunk)
            pdf_path = tmp_file.name

        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages[:pages]:  # Only extract up to the specified number of pages
                text += page.extract_text()

        os.remove(pdf_path)
        return text

def chunk_text(text, chunk_size=CHUNK_SIZE):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

# Global variable to store the status
status = {}

@app.route('/identify-documents', methods=['POST'])
def identify_documents():
    global status
    raw_urls = request.form['pdf_urls']
    
    # Split by comma
    pdf_urls = raw_urls.split(',')

    for pdf_url in pdf_urls:
        pdf_url = pdf_url.strip()
        if pdf_url.startswith("//"):
            pdf_url = "https:" + pdf_url
        if not pdf_url:
            continue

        status[pdf_url] = {"step": "Downloading PDF"}
        text = extract_text_from_pdf(pdf_url)

        # Identification Phase
        status[pdf_url]["step"] = "Identifying document type"
        identification_messageList = [
            {"role": "system", "content": "You are a helpful assistant well-schooled in accounting, finance, and tax."},
            {"role": "user", "content": "Your task is to identify if the provided text is from a bank statement, a financial statement (such as a profit and loss statement, a balance sheet or income or cashflow statement) or if the document is a business tax return. Your response should simply be the type of document you identified."},
            {"role": "user", "content": text[:CHUNK_SIZE]}  # Taking the first chunk for identification
        ]

        try:
            identification_response = openai.ChatCompletion.create(
                model='openai/gpt-3.5-turbo-16k',
                headers={
                    "HTTP-Referer": OPENROUTER_REFERRER
                },
                messages=identification_messageList,
                max_tokens=100,
                temperature=0.1,
                top_p=1,
                transforms=["middle-out"],
            )
            print("Identification Response:", identification_response)
            logging.info("Identification Response for {}: {}".format(pdf_url, identification_response))

            if 'error' in identification_response:
                error_message = identification_response['error']['message']
                status[pdf_url]["error"] = error_message
                continue

            document_type = identification_response['choices'][0]['message']['content']
            status[pdf_url]["document_type"] = document_type

            # If the document is identified as a bank statement, store only the first couple of pages
            if "bank statement" in document_type.lower():
                text = extract_text_from_pdf(pdf_url, pages=2)
                status[pdf_url]["optimized_text"] = text
            else:
                status[pdf_url]["optimized_text"] = text  # Store the entire text for other document types

            status[pdf_url]["step"] = "Identification Completed"

        except Exception as e:
            status[pdf_url]["error"] = str(e)
            continue

    return jsonify(status)

@app.route('/start-analysis-for-url', methods=['POST'])
def start_analysis_for_url():
    pdf_url = request.form['pdf_url']
    if not pdf_url or pdf_url not in status:
        return jsonify(error="Invalid PDF URL"), 400

    text = status[pdf_url]["optimized_text"]
    document_type = status[pdf_url]["document_type"]

    # Define the analysis prompt based on the document type
    if "bank statement" in document_type.lower():
        analysis_prompt = [
            {"role": "system", "content": "You are a financial expert."},
            {"role": "user", "content": "Extract the bank name, account name, month of the statement, and the ending balance from the provided text. Be concise and check your work for accuracy before responding"}
        ]
        chunks = chunk_text(text, CHUNK_SIZE)

    else:
        analysis_prompt = [
            {"role": "system", "content": "You are a financial expert."},
            {"role": "user", "content": "This is a financial statement. Extract the financial details for any financial text you find."}
        ]
        chunks = chunk_text(text, CHUNK_SIZE)  # Use chunk_text directly

    combined_response = ""

    for chunk in chunks:
        print(chunks)
        analysis_message = [
            {"role": "user", "content": analysis_prompt[1]['content']},
            {"role": "user", "content": chunk}
    ]
        try:
            response = openai.ChatCompletion.create(
                model='meta-llama/llama-2-70b-chat',
                headers={"HTTP-Referer": OPENROUTER_REFERRER},
                messages=analysis_message,
                max_tokens=1000,
                temperature=0.2,
                top_p=1,
                transforms=["middle-out"]
            )

            response_content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
            combined_response += response_content + "\n"

        except openai.error.OpenAIError as e:
            if "requires moderation" in str(e):
                logging.error(f"Moderation error for {pdf_url}: {e}")
                return jsonify(error="API Response Error: Please try again."), 403

    status[pdf_url]["analysis"] = combined_response
    status[pdf_url]["step"] = "Analysis Completed"
    print("combined response", combined_response)
    logging.info("Analysis completed for {}: {}".format(pdf_url, combined_response))

    return jsonify(success=True, analysis=combined_response)

@app.route('/check-status', methods=['GET'])
def check_status():
    return jsonify(status)

@app.route('/summarize-all-responses', methods=['GET'])
def summarize_all_responses():
    combined_responses = {
        "bank statement": "",
        "financial statement": ""
    }

    # Combine all responses based on document type
    for pdf_url, data in status.items():
        document_type = data.get("document_type", "")
        analysis = data.get("analysis", "")

        if "bank statement" in document_type.lower():
            combined_responses["bank statement"] += analysis + "\n\n"
        elif "financial statement" in document_type.lower():
            combined_responses["financial statement"] += analysis + "\n\n"

    # Send combined responses to OpenAI for summarization
    summaries = {}
    for doc_type, combined_response in combined_responses.items():
        chunks = chunk_text(combined_response, CHUNK_SIZE)
        summarized_response = ""

        for chunk in chunks:
            if doc_type == "bank statement":
                analysis_message = [
                    {"role": "system", "content": "You are a financial expert."},
                    {"role": "user", "content": "Given the following ending bank balances, calculate the average balance."},
                    {"role": "user", "content": chunk}
                ]
            elif doc_type == "financial statement":
                analysis_message = [
                    {"role": "system", "content": "You are a financial expert."},
                    {"role": "user", "content": ("Given the following financial statements, extract the following details by year:"
                                                "Gross Revenue, Profit (Loss), Cash/Liquidity, Total Assets, Total Liabilities, "
                                                "Current Assets, Current Liabilities, Current Assets less Inventory, Total Equity.")},
                    {"role": "user", "content": chunk}
                ]

            try:
                response = openai.ChatCompletion.create(
                    model='openai/gpt-3.5-turbo-16k',
                    headers={"HTTP-Referer": OPENROUTER_REFERRER},
                    messages=analysis_message,
                    max_tokens=5000,
                    temperature=0.3,
                    top_p=1,
                    transforms=["middle-out"]
                )

                response_content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
                summarized_response += response_content + "\n"

            except openai.error.OpenAIError as e:
                if "requires moderation" in str(e):
                    logging.error(f"Moderation error for {doc_type}: {e}")
                    return jsonify(error="API Response Error: Please try again."), 403

        summaries[doc_type] = summarized_response

    return jsonify(summaries)

@app.route('/', methods=['GET', 'POST'])
def home():
    return render_template('index.html', status=status)

