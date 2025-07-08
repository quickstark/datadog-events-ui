# Datadog Events UI

A comprehensive web-based Synthetic Events Generator for testing Datadog's Correlation engine. This application allows you to create and manage realistic alert scenarios that simulate production outages by sending events to Datadog through multiple channels.

## Features

- **Multi-Channel Event Delivery**: Send events via Datadog Events API, Logs API, and Email (AWS SES)
- **Scenario Management**: Create, edit, delete, and organize alert scenarios
- **Event Types**: Support for Datadog Events, Datadog Logs, and Email notifications
- **Drag & Drop Interface**: Reorder events within scenarios with intuitive drag-and-drop
- **Tagging Support**: Add tags to events for better organization and correlation
- **Bulk Operations**: Execute multiple scenarios simultaneously and bulk edit tags
- **Import/Export**: Save and share scenarios in JSON format
- **Settings Management**: Configure Datadog and AWS credentials with connection testing
- **Real-time Execution**: Execute scenarios with configurable delays between events
- **Execution Tracking**: Monitor scenario execution progress and view detailed history
- **Connection Testing**: Validate Datadog and AWS SES connections before use
- **Startup Validation**: Automatic system checks and configuration validation
- **Docker Ready**: Containerized for easy deployment

## Technology Stack

- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript
- **UI Components**: Shadcn UI with Tailwind CSS
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit for sortable event lists
- **HTTP Client**: Axios for API requests
- **Integrations**: Datadog API, AWS SES
- **Storage**: File-based persistence (easily configurable)
- **Development**: ESLint, TypeScript checking

## Project Structure

```
src/
├── app/
│   ├── api/                         # API routes
│   │   ├── scenarios/              # Scenario CRUD operations
│   │   │   ├── [id]/              # Individual scenario endpoints
│   │   │   │   ├── execute/       # Scenario execution
│   │   │   │   └── history/       # Execution history
│   │   │   ├── batch-execute/     # Bulk execution
│   │   │   ├── batch-tags/        # Bulk tag operations
│   │   │   ├── export/           # Export scenarios
│   │   │   ├── import/           # Import scenarios
│   │   │   └── tags/             # Tag management
│   │   ├── settings/              # Settings management
│   │   │   ├── raw/              # Raw settings access
│   │   │   └── test/             # Connection testing
│   │   │       ├── aws/          # AWS SES testing
│   │   │       └── datadog/      # Datadog API testing
│   │   └── execution/             # Execution tracking
│   │       ├── [id]/             # Individual execution
│   │       │   └── progress/     # Progress tracking
│   │       └── history/          # Execution history
│   ├── scenarios/                 # Scenario pages
│   │   └── [id]/                 # Individual scenario view
│   ├── execution/                 # Execution tracking pages
│   │   └── [id]/                 # Individual execution view
│   ├── history/                   # Execution history pages
│   │   └── [id]/                 # Individual history view
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                  # Dashboard page
│   ├── globals.css               # Global styles
│   └── startup-provider.tsx      # Startup configuration
├── components/
│   ├── ui/                       # Shadcn UI components
│   ├── dashboard.tsx             # Main dashboard
│   ├── scenario-editor.tsx       # Scenario creation/editing
│   ├── settings-modal.tsx        # Settings configuration
│   └── batch-edit-tags-modal.tsx # Bulk tag editing
├── lib/
│   ├── storage/                  # Data persistence layer
│   │   ├── scenarios.ts         # Scenario storage
│   │   ├── settings.ts          # Settings storage
│   │   ├── execution-history.ts # Execution history storage
│   │   ├── startup-check.ts     # Startup validation
│   │   └── base.ts              # Base storage utilities
│   ├── datadog/                  # Datadog API clients
│   │   ├── events-client.ts     # Events API client
│   │   └── logs-client.ts       # Logs API client
│   ├── aws/                      # AWS integrations
│   │   └── ses-client.ts        # SES email client
│   ├── scenario-executor.ts      # Scenario execution engine
│   ├── execution-tracker.ts      # Execution tracking
│   └── utils.ts                  # Utility functions
├── types/
│   ├── events.ts                 # Event and scenario types
│   ├── settings.ts               # Settings types
│   └── api.ts                    # API response types
└── hooks/
    └── use-toast.ts              # Toast notification hook
```

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Datadog account with API access
- AWS account with SES configured (for email events)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd datadog-events-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.local.example` to `.env.local` and configure:
   
   ```env
   # Datadog Configuration
   DD_API_KEY=your_datadog_api_key
   DD_APP_KEY=your_datadog_app_key
   DD_SITE=api.datadoghq.com
   DD_EMAIL_ADDRESS=your_datadog_email_intake
   
   # AWS Configuration (for email events)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   SES_REGION=us-west-2
   SES_FROM_EMAIL=alerts@yourdomain.com
   
   # Storage
   STORAGE_DIR=./data
   
   # Logging
   LOG_LEVEL=INFO
   ```

4. **Create data directory**
   ```bash
   mkdir data
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to `http://localhost:3000`

## Configuration Guide

### Datadog Setup

1. **Get API Keys**:
   - Log into your Datadog account
   - Go to Organization Settings > API Keys
   - Create a new API key or use existing
   - Go to Organization Settings > Application Keys
   - Create a new Application key

2. **Email Intake** (for email events):
   - Go to Logs > Configuration > Email
   - Create a new email intake
   - Copy the email address to `DD_EMAIL_ADDRESS`

### AWS SES Setup

1. **Create IAM User**:
   - Create IAM user with SES permissions
   - Generate access keys
   - Add permissions: `ses:SendEmail`, `ses:SendRawEmail`

2. **Verify Email Addresses**:
   - In AWS SES console, verify your sender email
   - If in sandbox mode, verify recipient emails too

3. **Region Configuration**:
   - Ensure SES is available in your chosen region
   - Update `SES_REGION` accordingly

## Usage

### Creating Scenarios

1. **Navigate to Dashboard**: The main page shows an overview of scenarios
2. **Click "New Scenario"**: Opens the scenario editor
3. **Add Events**: 
   - Select event type (Datadog Event, Log, or Email)
   - Fill in event details
   - Set delay (seconds from scenario start)
   - Add tags for correlation
4. **Reorder Events**: Drag and drop to change execution order
5. **Save Scenario**: Click "Save Scenario" when complete

### Event Types

#### Datadog Events
- **Title**: Event title (will appear in Datadog Events)
- **Text**: Event description/details
- **Alert Type**: info, warning, error, success
- **Priority**: normal, low
- **Tags**: Key-value pairs for correlation

#### Datadog Logs
- **Message**: Log message content
- **Source**: Log source identifier
- **Service**: Service name
- **Tags**: Key-value pairs for correlation

#### Email Events
- **From/To**: Email addresses
- **Subject**: Email subject line
- **Message Body**: Email content
- **Format**: plain-text or json
- **Tags**: Metadata tags

### Executing Scenarios

1. Select scenarios from the dashboard
2. Click "Execute Selected"
3. Monitor execution progress
4. Check Datadog for received events

### Import/Export

- **Export**: Select scenarios and click "Export Selected"
- **Import**: Click "Import Scenarios" and upload JSON file

## API Reference

### Scenarios

#### GET /api/scenarios
List all scenarios

#### POST /api/scenarios
Create new scenario

#### GET /api/scenarios/[id]
Get specific scenario

#### PUT /api/scenarios/[id]
Update scenario

#### DELETE /api/scenarios/[id]
Delete scenario

#### POST /api/scenarios/[id]/execute
Execute a specific scenario

#### GET /api/scenarios/[id]/history
Get execution history for a scenario

#### POST /api/scenarios/batch-execute
Execute multiple scenarios

#### POST /api/scenarios/batch-tags
Bulk edit tags for multiple scenarios

#### POST /api/scenarios/export
Export scenarios to JSON

#### POST /api/scenarios/import
Import scenarios from JSON

#### GET /api/scenarios/tags
Get all available tags

### Settings

#### GET /api/settings
Get current settings (sensitive data masked)

#### PUT /api/settings
Update settings

#### GET /api/settings/raw
Get raw settings (for internal use)

#### POST /api/settings/test/datadog
Test Datadog API connection

#### POST /api/settings/test/aws
Test AWS SES connection

### Execution Tracking

#### GET /api/execution/[id]
Get execution details

#### GET /api/execution/[id]/progress
Get execution progress

#### GET /api/execution/history
Get all execution history

## Docker Deployment

### Building Docker Image

```bash
# Build image
docker build -t datadog-events-ui .

# Run container
docker run -p 3000:3000 \
  -e DD_API_KEY=your_api_key \
  -e DD_APP_KEY=your_app_key \
  -e AWS_ACCESS_KEY_ID=your_aws_key \
  -e AWS_SECRET_ACCESS_KEY=your_aws_secret \
  -v $(pwd)/data:/app/data \
  datadog-events-ui
```

### Docker Compose

```yaml
version: '3.8'
services:
  datadog-events-ui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DD_API_KEY=${DD_API_KEY}
      - DD_APP_KEY=${DD_APP_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    volumes:
      - ./data:/app/data
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Project Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting (auto-format on save)
- **File Structure**: Feature-based organization
- **Naming**: camelCase for variables, PascalCase for components

## Troubleshooting

### Common Issues

1. **API Connection Failures**:
   - Verify API keys in settings
   - Check network connectivity
   - Ensure Datadog site URL is correct

2. **Email Sending Failures**:
   - Verify AWS credentials
   - Check SES region configuration
   - Ensure sender email is verified in SES

3. **Storage Errors**:
   - Check `STORAGE_DIR` permissions
   - Ensure directory exists and is writable

4. **Build Errors**:
   - Clear `.next` directory: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

### Logs

Check browser console and server logs for detailed error messages. Set `LOG_LEVEL=DEBUG` for verbose logging.

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Submit Pull Request

## Security

- Never commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate API keys and access tokens
- Implement proper authentication for production deployments

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information

## Roadmap

- [ ] User authentication and authorization
- [ ] Database storage backend option
- [ ] Advanced scheduling and recurring scenarios
- [ ] Metrics and analytics dashboard
- [ ] Webhook integrations
- [ ] Custom event templates
- [ ] Bulk scenario operations
- [ ] API rate limiting and monitoring