import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Sidebar configuration for Integration documentation
 */

const sidebars: SidebarsConfig = {
  integrationSidebar: [
    'chatmodel',
    'chatclient',
    'generic-model',
    'prompt',
    'tools',
    {
      type: 'category',
      label: 'Chat Models',
      items: [
        'chatmodels/comparison',
        'chatmodels/dashScope',
        'chatmodels/deepseek-chat',
        'chatmodels/gemini-chat',
        'chatmodels/ollama-chat',
        'chatmodels/openai-chat',
        'chatmodels/openai-compatible',
        'chatmodels/qwq',
        {
          type: 'category',
          label: 'More',
          items: [
            'chatmodels/more/azure-openai-chat',
            'chatmodels/more/bedrock-converse',
            'chatmodels/more/dmr-chat',
            'chatmodels/more/google-genai-chat',
            'chatmodels/more/google-vertexai',
            'chatmodels/more/groq-chat',
            'chatmodels/more/huggingface',
            'chatmodels/more/minimax-chat',
            'chatmodels/more/mistralai-chat',
            'chatmodels/more/moonshot-chat',
            'chatmodels/more/nvidia-chat',
            {
              type: 'category',
              label: 'OCI GenAI',
              items: [
                'chatmodels/more/oci-genai/cohere-chat',
              ],
            },
            'chatmodels/more/openai-sdk-chat',
            'chatmodels/more/perplexity-chat',
            'chatmodels/more/zhipuai-chat',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Multimodals',
      items: [
        'multimodals/multimodality',
        {
          type: 'category',
          label: 'Audio',
          items: [
            'multimodals/audio/speech',
            {
              type: 'category',
              label: 'Speech',
              items: [
                'multimodals/audio/speech/dashscope-speech',
                'multimodals/audio/speech/openai-speech',
              ],
            },
            'multimodals/audio/transcriptions',
            {
              type: 'category',
              label: 'Transcriptions',
              items: [
                'multimodals/audio/transcriptions/dashscope-transcriptions',
                'multimodals/audio/transcriptions/openai-transcriptions',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Image',
          items: [
            'multimodals/image/imageclient',
            'multimodals/image/dashscope-image',
            'multimodals/image/openai-image',
            'multimodals/image/openai-sdk-image',
            'multimodals/image/qianfan-image',
            'multimodals/image/stabilityai-image',
            'multimodals/image/zhipuai-image',
            'multimodals/image/azure-openai-image',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'RAG',
      items: [
        'rag/retrieval-augmented-generation',
        'rag/etl-pipeline',
        'rag/document-readers',
        'rag/document-parsers',
        {
          type: 'category',
          label: 'Embeddings',
          items: [
            'rag/embeddings',
            'rag/embeddings/dashscope-embeddings',
            'rag/embeddings/google-genai-embeddings-text',
            'rag/embeddings/ollama-embeddings',
            'rag/embeddings/openai-embeddings',
            'rag/embeddings/vertexai-embeddings-text',
            'rag/embeddings/vertexai-embeddings-multimodal',
            {
              type: 'category',
              label: 'More',
              items: [
                'rag/embeddings/more/azure-openai-embeddings',
                'rag/embeddings/more/bedrock-cohere-embedding',
                'rag/embeddings/more/bedrock-titan-embedding',
                'rag/embeddings/more/minimax-embeddings',
                'rag/embeddings/more/mistralai-embeddings',
                'rag/embeddings/more/oci-genai-embeddings',
                'rag/embeddings/more/onnx',
                'rag/embeddings/more/openai-sdk-embeddings',
                'rag/embeddings/more/postgresml-embeddings',
                'rag/embeddings/more/qianfan-embeddings',
                'rag/embeddings/more/zhipuai-embeddings',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Vector Databases',
          items: [
            'rag/vectordbs/analyticdb',
            'rag/vectordbs/elasticsearch',
            'rag/vectordbs/milvus',
            'rag/vectordbs/mongodb',
            'rag/vectordbs/neo4j',
            'rag/vectordbs/oceanbase',
            'rag/vectordbs/opensearch',
            'rag/vectordbs/oracle',
            'rag/vectordbs/pgvector',
            'rag/vectordbs/redis',
            'rag/vectordbs/tair',
            'rag/vectordbs/weaviate',
            {
              type: 'category',
              label: 'More',
              items: [
                'rag/vectordbs/more/apache-cassandra',
                'rag/vectordbs/more/azure-cosmos-db',
                'rag/vectordbs/more/azure',
                'rag/vectordbs/more/chroma',
                'rag/vectordbs/more/coherence',
                'rag/vectordbs/more/couchbase',
                'rag/vectordbs/more/gemfire',
                'rag/vectordbs/more/mariadb',
                'rag/vectordbs/more/pinecone',
                'rag/vectordbs/more/qdrant',
                'rag/vectordbs/more/tablestore',
                'rag/vectordbs/more/typesense',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'MCPs',
      items: [
        'mcps/mcp-overview',
        'mcps/mcp-helpers',
        'mcps/mcp-security',
        'mcps/mcp-client-boot-starter-docs',
        'mcps/mcp-server-boot-starter-docs',
        'mcps/mcp-stateless-server-boot-starter-docs',
        'mcps/mcp-stdio-sse-server-boot-starter-docs',
        'mcps/mcp-streamable-http-server-boot-starter-docs',
        {
          type: 'category',
          label: 'Annotations',
          items: [
            'mcps/annotations/mcp-annotations-overview',
            'mcps/annotations/mcp-annotations-server',
            'mcps/annotations/mcp-annotations-client',
            'mcps/annotations/mcp-annotations-special-params',
            'mcps/annotations/mcp-annotations-examples',
          ],
        },
        {
          type: 'category',
          label: 'Examples',
          items: [
            'mcps/examples/mcp',
            'mcps/examples/mcp-client',
            'mcps/examples/mcp-server',
            'mcps/examples/mcp-tool',
            'mcps/examples/mcp-example',
            'mcps/examples/mcp-auth',
          ],
        },
        {
          type: 'category',
          label: 'Nacos',
          items: [
            'mcps/nacos/spring-ai-alibaba-mcp-nacos-introduce',
            'mcps/nacos/nacos-mcp',
            'mcps/nacos/nacos-registery-mcp',
            'mcps/nacos/nacos-distributed-mcp',
            'mcps/nacos/nacos-gateway-mcp',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Tool Calls',
      items: [
        'toolcalls/tool-calls',
      ],
    },
  ],
}

export default sidebars
