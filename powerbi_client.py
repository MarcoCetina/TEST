"""Power BI API client for reading data from Power BI workspaces."""
import requests
from msal import ConfidentialClientApplication
from config import Config


class PowerBIClient:
    """Client for interacting with Power BI REST API."""

    def __init__(self):
        """Initialize the Power BI client."""
        self.access_token = None
        self.config = Config()

    def _get_access_token(self):
        """Authenticate and get access token using MSAL."""
        if not all([
            self.config.POWERBI_CLIENT_ID,
            self.config.POWERBI_CLIENT_SECRET,
            self.config.POWERBI_TENANT_ID
        ]):
            raise ValueError(
                "Power BI credentials not configured. "
                "Please set POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, and POWERBI_TENANT_ID."
            )

        app = ConfidentialClientApplication(
            client_id=self.config.POWERBI_CLIENT_ID,
            client_credential=self.config.POWERBI_CLIENT_SECRET,
            authority=self.config.POWERBI_AUTHORITY
        )

        result = app.acquire_token_for_client(scopes=self.config.POWERBI_SCOPE)

        if 'access_token' in result:
            self.access_token = result['access_token']
            return self.access_token
        else:
            error_msg = result.get('error_description', 'Unknown error')
            raise Exception(f"Failed to acquire token: {error_msg}")

    def _get_headers(self):
        """Get authorization headers for API requests."""
        if not self.access_token:
            self._get_access_token()
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    def get_workspaces(self):
        """Get list of available workspaces (groups)."""
        url = f"{self.config.POWERBI_API_URL}/groups"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get('value', [])

    def get_datasets(self, workspace_id=None):
        """Get datasets in a workspace."""
        if workspace_id:
            url = f"{self.config.POWERBI_API_URL}/groups/{workspace_id}/datasets"
        else:
            url = f"{self.config.POWERBI_API_URL}/datasets"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get('value', [])

    def get_reports(self, workspace_id=None):
        """Get reports in a workspace."""
        if workspace_id:
            url = f"{self.config.POWERBI_API_URL}/groups/{workspace_id}/reports"
        else:
            url = f"{self.config.POWERBI_API_URL}/reports"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get('value', [])

    def get_dashboards(self, workspace_id=None):
        """Get dashboards in a workspace."""
        if workspace_id:
            url = f"{self.config.POWERBI_API_URL}/groups/{workspace_id}/dashboards"
        else:
            url = f"{self.config.POWERBI_API_URL}/dashboards"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get('value', [])

    def get_tables(self, dataset_id, workspace_id=None):
        """Get tables in a dataset."""
        if workspace_id:
            url = f"{self.config.POWERBI_API_URL}/groups/{workspace_id}/datasets/{dataset_id}/tables"
        else:
            url = f"{self.config.POWERBI_API_URL}/datasets/{dataset_id}/tables"
        response = requests.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get('value', [])

    def execute_query(self, dataset_id, dax_query, workspace_id=None):
        """Execute a DAX query against a dataset."""
        if workspace_id:
            url = f"{self.config.POWERBI_API_URL}/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
        else:
            url = f"{self.config.POWERBI_API_URL}/datasets/{dataset_id}/executeQueries"

        payload = {
            "queries": [{"query": dax_query}],
            "serializerSettings": {"includeNulls": True}
        }

        response = requests.post(url, headers=self._get_headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def get_dataset_schema(self, dataset_id, workspace_id=None):
        """Get the schema of a dataset including tables and columns."""
        tables = self.get_tables(dataset_id, workspace_id)
        schema = []

        for table in tables:
            table_info = {
                'name': table.get('name'),
                'columns': table.get('columns', []),
                'measures': table.get('measures', [])
            }
            schema.append(table_info)

        return schema

    def get_workspace_summary(self, workspace_id=None):
        """Get a comprehensive summary of a workspace."""
        ws_id = workspace_id or self.config.POWERBI_WORKSPACE_ID

        summary = {
            'workspace_id': ws_id,
            'datasets': [],
            'reports': [],
            'dashboards': []
        }

        try:
            summary['datasets'] = self.get_datasets(ws_id)
        except Exception as e:
            summary['datasets_error'] = str(e)

        try:
            summary['reports'] = self.get_reports(ws_id)
        except Exception as e:
            summary['reports_error'] = str(e)

        try:
            summary['dashboards'] = self.get_dashboards(ws_id)
        except Exception as e:
            summary['dashboards_error'] = str(e)

        return summary

    def get_all_data_context(self, workspace_id=None):
        """Get all available data context for Claude to analyze."""
        ws_id = workspace_id or self.config.POWERBI_WORKSPACE_ID
        context = {
            'workspace': ws_id,
            'datasets': [],
            'reports': [],
            'dashboards': []
        }

        # Get all datasets and their schemas
        try:
            datasets = self.get_datasets(ws_id)
            for dataset in datasets:
                dataset_info = {
                    'id': dataset.get('id'),
                    'name': dataset.get('name'),
                    'configured_by': dataset.get('configuredBy'),
                    'is_refreshable': dataset.get('isRefreshable'),
                    'schema': []
                }
                try:
                    schema = self.get_dataset_schema(dataset['id'], ws_id)
                    dataset_info['schema'] = schema
                except Exception:
                    pass
                context['datasets'].append(dataset_info)
        except Exception as e:
            context['datasets_error'] = str(e)

        # Get reports
        try:
            context['reports'] = self.get_reports(ws_id)
        except Exception as e:
            context['reports_error'] = str(e)

        # Get dashboards
        try:
            context['dashboards'] = self.get_dashboards(ws_id)
        except Exception as e:
            context['dashboards_error'] = str(e)

        return context
