export interface ProjectConfig {
  // Basic information
  title: string
  tagline: string
  description: string

  // Author information
  author: {
    name: string
    email: string
    website?: string
  }

  // GitHub repository information
  github: {
    username: string
    repoName: string
  }

  // Website deployment information
  deployment: {
    url: string
    baseUrl: string
  }

  // Social links
  social?: {
    twitter?: string
    discord?: string
    linkedin?: string
  }

  // Search configuration
  search: {
    // Enable vector search functionality
    enableVectorSearch: boolean
    // Pinecone configuration
    pinecone?: {
      apiKey: string
      environment: string
      indexName: string
    }
  }
}

const projectConfig: ProjectConfig = {
  // Basic project information
  title: 'Spring AI Alibaba',
  tagline: 'Agentic AI Framework for Java Developers',
  description: 'Spring AI Alibaba 开源项目基于 Spring AI 构建，是阿里云通义系列模型及服务在 Java AI 应用开发领域的最佳实践，提供高层次的 AI API 抽象与云原生基础设施集成方案，帮助开发者快速构建 AI 应用。',

  // Author information
  author: {
    name: 'spring-ai-alibaba-team',
    email: 'your.email@example.com',
    website: 'https://java2ai.com', // optional
  },

  // GitHub repository information
  github: {
    username: 'alibaba',
    repoName: 'spring-ai-alibaba',
  },

  // Website deployment configuration
  deployment: {
    url: 'https://spring-ai-alibaba.github.io',
    baseUrl: '/', // For GitHub Pages, usually '/your-repo-name/'
  },

  // Social media links (optional)
  social: {
    twitter: 'https://twitter.com/your-username',
    // discord: 'https://discord.gg/your-server',
    // linkedin: 'https://linkedin.com/in/your-profile',
  },

  // Search functionality configuration
  search: {
    // Enable vector search functionality (requires Pinecone configuration)
    enableVectorSearch: true, // Set to true to enable vector search demo
    // Pinecone vector database configuration
    pinecone: {
      apiKey: 'demo-api-key', // Replace with your actual Pinecone API key
      environment: 'demo-environment', // Replace with your Pinecone environment
      indexName: 'demo-index', // Replace with your index name
    },
  },
}

// Export configuration and helper functions
export default projectConfig

// Helper function: generate GitHub related links
export const getGitHubUrls = (config: ProjectConfig) => {
  const { username, repoName } = config.github
  const baseUrl = `https://github.com/${repoName}`

  return {
    repo: baseUrl,
    discussions: `${baseUrl}/discussions`,
    issues: `${baseUrl}/issues`,
    license: `${baseUrl}/blob/main/LICENSE`,
    contributing: `${baseUrl}/blob/main/CONTRIBUTING.md`,
    editDocs: `${baseUrl}/website/blob/main/`,
    editBlog: `${baseUrl}/website/blob/main/blog/`,
  }
}

// Helper function: generate complete author information
export const getAuthorInfo = (config: ProjectConfig) => {
  const { name, email, website } = config.author
  return {
    name,
    email,
    full: website ? `${name} <${email}> (${website})` : `${name} <${email}>`,
  }
}

// Helper function: get search configuration
export const getSearchConfig = (config: ProjectConfig) => {
  const { search } = config
  const isVectorSearchEnabled = search.enableVectorSearch &&
    search.pinecone?.apiKey &&
    search.pinecone?.environment &&
    search.pinecone?.indexName

  return {
    enableVectorSearch: search.enableVectorSearch,
    isVectorSearchConfigured: isVectorSearchEnabled,
    pinecone: search.pinecone,
  }
}
