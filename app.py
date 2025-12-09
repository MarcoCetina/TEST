"""Simple Power BI Data Chat - No API permissions needed."""
import csv
import io
import json
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Try to import anthropic, handle if not installed
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


def get_claude_client():
    """Get Claude client if available."""
    if not ANTHROPIC_AVAILABLE:
        return None
    if not Config.ANTHROPIC_API_KEY:
        return None
    return Anthropic(api_key=Config.ANTHROPIC_API_KEY)


def parse_csv_data(csv_text):
    """Parse CSV text into structured data."""
    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = list(reader)
        if rows:
            return {
                'columns': list(rows[0].keys()),
                'row_count': len(rows),
                'sample_rows': rows[:10],  # First 10 rows as sample
                'all_data': rows
            }
    except Exception as e:
        return {'error': str(e)}
    return {'error': 'No data found'}


def parse_table_data(text):
    """Parse tab-separated or space-separated table data."""
    lines = text.strip().split('\n')
    if not lines:
        return {'error': 'No data found'}

    # Try tab-separated first
    if '\t' in lines[0]:
        delimiter = '\t'
    else:
        # Try to detect delimiter
        delimiter = '\t' if lines[0].count('\t') > 0 else ','

    try:
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        rows = list(reader)
        if rows:
            return {
                'columns': list(rows[0].keys()),
                'row_count': len(rows),
                'sample_rows': rows[:10],
                'all_data': rows
            }
    except:
        pass

    # Fallback: treat first line as headers
    headers = lines[0].replace('\t', ',').split(',')
    headers = [h.strip() for h in headers]
    rows = []
    for line in lines[1:]:
        values = line.replace('\t', ',').split(',')
        values = [v.strip() for v in values]
        if len(values) == len(headers):
            rows.append(dict(zip(headers, values)))

    if rows:
        return {
            'columns': headers,
            'row_count': len(rows),
            'sample_rows': rows[:10],
            'all_data': rows
        }

    return {'error': 'Could not parse data'}


def format_data_context(parsed_data):
    """Format parsed data as context for Claude."""
    if 'error' in parsed_data:
        return f"Error parsing data: {parsed_data['error']}"

    context = f"""## Data Summary
- **Columns**: {', '.join(parsed_data['columns'])}
- **Total Rows**: {parsed_data['row_count']}

## Sample Data (first {len(parsed_data['sample_rows'])} rows):
"""
    # Add sample as markdown table
    if parsed_data['sample_rows']:
        headers = parsed_data['columns']
        context += '\n| ' + ' | '.join(headers) + ' |\n'
        context += '| ' + ' | '.join(['---'] * len(headers)) + ' |\n'
        for row in parsed_data['sample_rows']:
            values = [str(row.get(h, ''))[:50] for h in headers]  # Truncate long values
            context += '| ' + ' | '.join(values) + ' |\n'

    return context


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available Claude models."""
    models = [
        {'id': 'claude-sonnet-4-5-20250929', 'name': 'Claude Sonnet 4.5 (Fast)'},
        {'id': 'claude-opus-4-5-20251101', 'name': 'Claude Opus 4.5 (Powerful)'},
    ]
    return jsonify({'success': True, 'models': models})


@app.route('/api/parse', methods=['POST'])
def parse_data():
    """Parse pasted or uploaded data."""
    try:
        data = request.get_json()
        text = data.get('text', '')
        data_type = data.get('type', 'auto')

        if not text.strip():
            return jsonify({'success': False, 'error': 'No data provided'})

        # Try to parse based on type
        if data_type == 'csv' or ',' in text:
            parsed = parse_csv_data(text)
        else:
            parsed = parse_table_data(text)

        if 'error' in parsed:
            # Try the other parser
            parsed = parse_csv_data(text) if data_type != 'csv' else parse_table_data(text)

        return jsonify({'success': True, 'data': parsed})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages."""
    try:
        data = request.get_json()
        question = data.get('question', '')
        model = data.get('model', 'claude-sonnet-4-5-20250929')
        parsed_data = data.get('parsed_data')
        conversation_history = data.get('conversation_history', [])

        if not question:
            return jsonify({'success': False, 'error': 'Question is required'})

        client = get_claude_client()
        if not client:
            return jsonify({
                'success': False,
                'error': 'Claude API not configured. Please add ANTHROPIC_API_KEY to your .env file.'
            })

        # Build context from parsed data
        data_context = ""
        if parsed_data and 'columns' in parsed_data:
            data_context = format_data_context(parsed_data)

        # System prompt
        system_prompt = """You are a helpful data analyst assistant. The user has shared data from Power BI (or Excel/CSV) and wants to ask questions about it.

Your role is to:
1. Analyze the data structure and content
2. Answer questions about the data clearly and concisely
3. Provide insights, patterns, and observations
4. Suggest useful analyses or visualizations
5. Help with calculations and aggregations

When the data is limited (sample rows), acknowledge this and base your analysis on what's available.
Be conversational but precise. Use tables and formatting when helpful."""

        # Build messages
        messages = []
        if conversation_history:
            messages.extend(conversation_history)

        # Current message with data context
        if data_context:
            user_message = f"""Here is my data:

{data_context}

---

**My Question:** {question}"""
        else:
            user_message = question

        messages.append({"role": "user", "content": user_message})

        # Call Claude
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages
        )

        return jsonify({
            'success': True,
            'response': response.content[0].text,
            'model': model,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/health', methods=['GET'])
def health():
    """Health check."""
    return jsonify({
        'status': 'ok',
        'claude_configured': bool(Config.ANTHROPIC_API_KEY),
        'anthropic_available': ANTHROPIC_AVAILABLE
    })


if __name__ == '__main__':
    print("\n" + "="*50)
    print("Power BI Data Chat")
    print("="*50)
    print("\nOpen in your browser: http://localhost:5000")
    print("\nHow to use:")
    print("1. Open your Power BI report in another tab")
    print("2. Export data (or copy from a table)")
    print("3. Paste it here and ask questions!")
    print("\n" + "="*50 + "\n")
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
