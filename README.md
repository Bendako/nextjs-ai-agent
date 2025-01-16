# IBM AI Agent

A sophisticated AI chat application built with Next.js, featuring real-time conversations, advanced prompt caching, and intelligent tool orchestration powered by LangChain and Claude 3.5 Sonnet.

## Features

- 🤖 Advanced AI chat interface with Claude 3.5 Sonnet
- 🎨 Modern and responsive UI with Tailwind CSS
- 🔐 Authentication with Clerk
- 💾 Real-time data storage with Convex
- ⚡ Built with Next.js 15 and React 19
- 🌊 Advanced streaming responses with custom implementation
- 📱 Mobile-friendly design
- 🧠 Prompt caching for optimized token usage
- 🔧 Intelligent tool orchestration with LangGraph
- 🔄 Real-time updates and tool execution feedback
- 📚 Integration with various data sources via wxflows

## Advanced Features

### AI and Prompt Management

- **Prompt Caching**: Optimized token usage with Anthropic's caching feature
- **Context Window**: Efficient 4096 token context management
- **Tool-Augmented Responses**: Enhanced AI capabilities with custom tools
- **Context-Aware Conversations**: Intelligent conversation management

### Tool Integration

- **wxflows Integration**:
  - Quick integration of various data sources
  - Support for YouTube transcripts
  - Google Books API integration
  - Custom data source tooling

### LangChain & LangGraph Features

- **State Management**: Sophisticated state handling with StateGraph
- **Tool Orchestration**: Advanced tool management with ToolNode
- **Memory Management**: Efficient context tracking with MemorySaver
- **Message Optimization**: Intelligent message trimming and context management

### Streaming Implementation

- **Custom Streaming Solution**:
  - Real-time token streaming
  - Tool execution feedback
  - Error handling for failed tool calls
  - Workarounds for LangChainAdapter limitations

### Real-time Features

- **Live Updates**: Instant message delivery and updates
- **Tool Visualization**: Real-time tool interaction display
- **History Management**: Efficient message history tracking

## Tech Stack

- **Frontend Framework**: Next.js 15.1.3
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Database**: Convex
- **AI Integration**: LangChain
- **Icons**: Lucide React & Radix UI Icons
- **Type Safety**: TypeScript

## Prerequisites

- Node.js (Latest LTS version recommended)
- PNPM package manager
- Clerk account for authentication
- Convex account for database
- OpenAI/Anthropic API key for AI capabilities

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ibm-ai-agent.git
cd ibm-ai-agent
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and custom hooks
  - `/lib/langgraph` - LangGraph implementation and tool orchestration
  - `/lib/streaming` - Custom streaming solutions
  - `/lib/cache` - Prompt caching implementation
- `/constants` - Application constants and configurations
- `/convex` - Convex database schema and queries
- `/public` - Static assets
- `/wxflows` - Workflow configurations and data source integrations

## Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Deployment

### Production Deployment

- Automated deployment via Vercel
- Environment variable management
- Production-ready configurations
- Performance optimization strategies

### Configuration Steps

1. Set up environment variables in Vercel
2. Configure Clerk authentication
3. Set up Convex database
4. Deploy wxflows integrations
5. Enable prompt caching in production

## Performance Optimization

- Implemented prompt caching
- Optimized token usage
- Efficient streaming implementation
- Smart context window management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Level Up Your Dev Career 🚀

🔥 Want to earn $120k+/year as a developer? Our 1000+ students already are! Transform your career with the most comprehensive full-stack development program available!

[Join Zero to Full Stack Hero 2.0 today!](https://www.papareact.com/course)

### Why Join Zero to Full Stack Hero 2.0?

- 🎓 **Complete Full-Stack Curriculum**

  - Next.js 15, React, TypeScript, Tailwind CSS
  - Backend development with Node.js
  - Database management
  - Authentication & Authorization (like this demo!)
  - AI & SaaS modules
  - Lifetime access
  - Weekly coaching calls
  - Complete project source code
  - Exclusive Discord community
  - So much more!

- 👨‍🏫 **Live Coaching & Support**

  - Weekly live sessions with Sonny Sangha
  - Real-time problem solving
  - Code reviews
  - Career guidance
  - Interview preparation

- 💪 **Real-World Experience**

  - 50+ practical projects
  - 100+ coding challenges
  - Industry-standard practices
  - Portfolio building

- 🤝 **Active Developer Community**
  - 24/7 support in Discord
  - Networking opportunities
  - Code reviews
  - Accountability partners
  - Job opportunities

### Success Stories

- Developers landing $120k+ positions at PayPal
- Students securing remote work opportunities worldwide
- Career changers breaking into tech
- Freelancers starting successful businesses

[Join Zero to Full Stack Hero 2.0 Today!](https://www.papareact.com/course)

> "The best investment in my development career" - Frank Ramos, Harvard Graduate & Senior Developer

_This project is part of the Zero to Full Stack Hero 2.0 curriculum, showcasing advanced authentication patterns with Next.js and Auth0._
