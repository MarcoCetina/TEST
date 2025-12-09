"""Claude AI client for processing questions about Power BI data."""
import json
from anthropic import Anthropic
from config import Config


class ClaudeClient:
    """Client for interacting with Claude AI API."""

    def __init__(self):
        """Initialize the Claude client."""
        self.config = Config()
        if not self.config.ANTHROPIC_API_KEY:
            raise ValueError(
                "Anthropic API key not configured. "
                "Please set ANTHROPIC_API_KEY environment variable."
            )
        self.client = Anthropic(api_key=self.config.ANTHROPIC_API_KEY)

    def get_available_models(self):
        """Get list of available Claude models."""
        return [
            {'id': model_id, 'name': name}
            for model_id, name in self.config.CLAUDE_MODELS.items()
        ]

    def format_powerbi_context(self, powerbi_data):
        """Format Power BI data as context for Claude."""
        context_parts = []

        context_parts.append("## Power BI Workspace Data\n")

        if 'workspace' in powerbi_data:
            context_parts.append(f"**Workspace ID:** {powerbi_data['workspace']}\n")

        # Format datasets
        if powerbi_data.get('datasets'):
            context_parts.append("\n### Datasets\n")
            for dataset in powerbi_data['datasets']:
                context_parts.append(f"\n#### Dataset: {dataset.get('name', 'Unknown')}")
                context_parts.append(f"- ID: {dataset.get('id')}")
                context_parts.append(f"- Configured By: {dataset.get('configured_by', 'N/A')}")
                context_parts.append(f"- Refreshable: {dataset.get('is_refreshable', 'N/A')}")

                if dataset.get('schema'):
                    context_parts.append("\n**Tables:**")
                    for table in dataset['schema']:
                        context_parts.append(f"\n  - **{table.get('name', 'Unknown Table')}**")
                        if table.get('columns'):
                            context_parts.append("    Columns:")
                            for col in table['columns']:
                                col_name = col.get('name', 'unknown')
                                col_type = col.get('dataType', 'unknown')
                                context_parts.append(f"      - {col_name} ({col_type})")
                        if table.get('measures'):
                            context_parts.append("    Measures:")
                            for measure in table['measures']:
                                measure_name = measure.get('name', 'unknown')
                                context_parts.append(f"      - {measure_name}")

        # Format reports
        if powerbi_data.get('reports'):
            context_parts.append("\n### Reports\n")
            for report in powerbi_data['reports']:
                context_parts.append(f"- **{report.get('name', 'Unknown')}**")
                context_parts.append(f"  - ID: {report.get('id')}")
                context_parts.append(f"  - Dataset ID: {report.get('datasetId', 'N/A')}")

        # Format dashboards
        if powerbi_data.get('dashboards'):
            context_parts.append("\n### Dashboards\n")
            for dashboard in powerbi_data['dashboards']:
                context_parts.append(f"- **{dashboard.get('displayName', 'Unknown')}**")
                context_parts.append(f"  - ID: {dashboard.get('id')}")

        return "\n".join(context_parts)

    def ask_question(self, question, powerbi_data, model=None, conversation_history=None):
        """
        Ask Claude a question about the Power BI data.

        Args:
            question: The user's question
            powerbi_data: Dictionary containing Power BI workspace data
            model: Claude model to use (defaults to config default)
            conversation_history: Previous messages for context

        Returns:
            Claude's response
        """
        model = model or self.config.DEFAULT_MODEL

        # Build the system prompt
        system_prompt = """You are a helpful Power BI data analyst assistant. You have access to information about a Power BI workspace including its datasets, tables, columns, reports, and dashboards.

Your role is to:
1. Answer questions about the data structure and schema
2. Help users understand their Power BI data
3. Suggest DAX queries when appropriate
4. Provide insights about how to analyze the data
5. Explain relationships between different datasets, reports, and dashboards

When suggesting DAX queries, format them in code blocks with the 'dax' language identifier.

Be concise but thorough in your explanations. If you don't have enough information to answer a question, say so and suggest what additional information would be helpful."""

        # Format the Power BI context
        powerbi_context = self.format_powerbi_context(powerbi_data)

        # Build messages
        messages = []

        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)

        # Add the current question with context
        user_message = f"""Here is the current Power BI workspace data:

{powerbi_context}

---

**User Question:** {question}"""

        messages.append({
            "role": "user",
            "content": user_message
        })

        # Call Claude API
        response = self.client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages
        )

        return {
            'response': response.content[0].text,
            'model': model,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens
            }
        }

    def generate_dax_query(self, description, powerbi_data, model=None):
        """
        Generate a DAX query based on a natural language description.

        Args:
            description: Natural language description of what the user wants
            powerbi_data: Dictionary containing Power BI workspace data
            model: Claude model to use

        Returns:
            Generated DAX query and explanation
        """
        model = model or self.config.DEFAULT_MODEL

        system_prompt = """You are a DAX query expert. Based on the Power BI schema provided, generate DAX queries to answer user requests.

Always:
1. Generate valid DAX syntax
2. Explain what the query does
3. Note any assumptions you're making
4. Suggest alternatives if relevant

Format your DAX queries in code blocks with the 'dax' language identifier."""

        powerbi_context = self.format_powerbi_context(powerbi_data)

        user_message = f"""Power BI Schema:

{powerbi_context}

---

**Request:** Generate a DAX query to: {description}"""

        response = self.client.messages.create(
            model=model,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}]
        )

        return {
            'response': response.content[0].text,
            'model': model,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens
            }
        }
