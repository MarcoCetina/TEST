"""Main Flask application for Power BI Claude Chatbot."""
import json
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from config import Config
from powerbi_client import PowerBIClient
from claude_client import ClaudeClient

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize clients
powerbi_client = None
claude_client = None


def get_powerbi_client():
    """Get or create Power BI client instance."""
    global powerbi_client
    if powerbi_client is None:
        powerbi_client = PowerBIClient()
    return powerbi_client


def get_claude_client():
    """Get or create Claude client instance."""
    global claude_client
    if claude_client is None:
        claude_client = ClaudeClient()
    return claude_client


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available Claude models."""
    try:
        client = get_claude_client()
        models = client.get_available_models()
        return jsonify({'success': True, 'models': models})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/workspaces', methods=['GET'])
def get_workspaces():
    """Get available Power BI workspaces."""
    try:
        client = get_powerbi_client()
        workspaces = client.get_workspaces()
        return jsonify({'success': True, 'workspaces': workspaces})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/workspace/<workspace_id>/data', methods=['GET'])
def get_workspace_data(workspace_id):
    """Get all data from a workspace."""
    try:
        client = get_powerbi_client()
        data = client.get_all_data_context(workspace_id)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/workspace/<workspace_id>/summary', methods=['GET'])
def get_workspace_summary(workspace_id):
    """Get workspace summary."""
    try:
        client = get_powerbi_client()
        summary = client.get_workspace_summary(workspace_id)
        return jsonify({'success': True, 'summary': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages."""
    try:
        data = request.get_json()
        question = data.get('question')
        model = data.get('model')
        workspace_id = data.get('workspace_id')
        conversation_history = data.get('conversation_history', [])
        powerbi_data = data.get('powerbi_data')

        if not question:
            return jsonify({'success': False, 'error': 'Question is required'}), 400

        # Get Power BI data if not provided
        if not powerbi_data and workspace_id:
            try:
                pbi_client = get_powerbi_client()
                powerbi_data = pbi_client.get_all_data_context(workspace_id)
            except Exception as e:
                powerbi_data = {'error': str(e), 'note': 'Could not fetch Power BI data'}

        # If still no data, use empty context
        if not powerbi_data:
            powerbi_data = {
                'workspace': 'Not connected',
                'datasets': [],
                'reports': [],
                'dashboards': [],
                'note': 'Power BI not configured. Connect to a workspace for data analysis.'
            }

        # Get Claude response
        client = get_claude_client()
        response = client.ask_question(
            question=question,
            powerbi_data=powerbi_data,
            model=model,
            conversation_history=conversation_history
        )

        return jsonify({
            'success': True,
            'response': response['response'],
            'model': response['model'],
            'usage': response['usage']
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/generate-dax', methods=['POST'])
def generate_dax():
    """Generate a DAX query based on description."""
    try:
        data = request.get_json()
        description = data.get('description')
        model = data.get('model')
        workspace_id = data.get('workspace_id')
        powerbi_data = data.get('powerbi_data')

        if not description:
            return jsonify({'success': False, 'error': 'Description is required'}), 400

        # Get Power BI data if not provided
        if not powerbi_data and workspace_id:
            pbi_client = get_powerbi_client()
            powerbi_data = pbi_client.get_all_data_context(workspace_id)

        if not powerbi_data:
            return jsonify({
                'success': False,
                'error': 'Power BI data is required for DAX generation'
            }), 400

        # Generate DAX query
        client = get_claude_client()
        response = client.generate_dax_query(
            description=description,
            powerbi_data=powerbi_data,
            model=model
        )

        return jsonify({
            'success': True,
            'response': response['response'],
            'model': response['model'],
            'usage': response['usage']
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/execute-dax', methods=['POST'])
def execute_dax():
    """Execute a DAX query against a dataset."""
    try:
        data = request.get_json()
        query = data.get('query')
        dataset_id = data.get('dataset_id')
        workspace_id = data.get('workspace_id')

        if not query or not dataset_id:
            return jsonify({
                'success': False,
                'error': 'Query and dataset_id are required'
            }), 400

        client = get_powerbi_client()
        result = client.execute_query(dataset_id, query, workspace_id)

        return jsonify({'success': True, 'result': result})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    status = {
        'status': 'healthy',
        'powerbi_configured': bool(
            Config.POWERBI_CLIENT_ID and
            Config.POWERBI_CLIENT_SECRET and
            Config.POWERBI_TENANT_ID
        ),
        'claude_configured': bool(Config.ANTHROPIC_API_KEY)
    }
    return jsonify(status)


if __name__ == '__main__':
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
