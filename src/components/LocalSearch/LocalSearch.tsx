import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { translate } from '@docusaurus/Translate';
import Fuse, { IFuseOptions, FuseResult } from 'fuse.js';
import styles from './LocalSearch.module.css';

// ============= Type Definitions =============
interface SearchItem {
  id: string;
  title: string;
  content: string;
  url: string;
  type: 'doc' | 'blog' | 'page';
  tags?: string[];
  locale?: string;
  fullText?: string; // Add full text content for comprehensive search
  headings?: string[]; // Add document headings
}

interface SearchResult {
  item: SearchItem;
  score?: number;
  matches?: FuseResult<SearchItem>['matches'];
}

// ============= Search Data =============
// Static search data as fallback
const staticSearchData: SearchItem[] = [
  // Chinese content
  {
    id: 'intro',
    title: '欢迎来到项目 👋',
    content: '欢迎来到优秀项目的精美文档模板！此模板为提供了一个双主题文档网站，具有优雅的纸张米白色和绚丽的星空夜色主题。',
    url: '/docs/intro',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'api-overview',
    title: 'API 概述 🔧',
    content: '欢迎来到 API 文档！本节提供有关项目的所有可用 API、端点和集成方法的全面信息。',
    url: '/docs/api/overview',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'authentication',
    title: '身份验证',
    content: '了解如何通过我们的 API 进行身份验证以访问受保护的资源。',
    url: '/docs/api/authentication',
    type: 'doc',
    locale: 'zh-Hans'
  },
  // English content
  {
    id: 'intro-en',
    title: 'Welcome to Project 👋',
    content: 'Welcome to the beautiful documentation template for excellent projects! This template provides a dual-theme documentation website with elegant paper beige and gorgeous starry night themes.',
    url: '/en/docs/intro',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'api-overview-en',
    title: 'API Overview 🔧',
    content: 'Welcome to the API documentation! This section provides comprehensive information about all available APIs, endpoints, and integration methods for the project.',
    url: '/en/docs/api/overview',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'authentication-en',
    title: 'Authentication',
    content: 'Learn how to authenticate with our API to access protected resources.',
    url: '/en/docs/api/authentication',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'installation',
    title: '安装指南 📦',
    content: '本指南将帮助安装和设置项目文档网站。',
    url: '/docs/getting-started/installation',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'installation-en',
    title: 'Installation Guide 📦',
    content: 'This guide will help you install and set up the project documentation website.',
    url: '/en/docs/getting-started/installation',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'quickstart',
    title: '快速开始指南 🚀',
    content: '几分钟内启动并运行项目！本指南将引导完成有效使用项目的基本步骤。',
    url: '/docs/getting-started/quickstart',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'quickstart-en',
    title: 'Quick Start Guide 🚀',
    content: 'Get the project up and running in minutes! This guide will walk you through the basic steps to effectively use the project.',
    url: '/en/docs/getting-started/quickstart',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'configuration',
    title: 'Configuration',
    content: 'Learn how to configure the application for your specific needs.',
    url: '/docs/getting-started/configuration',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'configuration-en',
    title: 'Configuration',
    content: 'Learn how to configure the application for your specific needs.',
    url: '/en/docs/getting-started/configuration',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'basic-usage',
    title: '基础使用示例',
    content: '通过这些基础使用示例快速开始。',
    url: '/docs/examples/basic-usage',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'basic-usage-en',
    title: 'Basic Usage Examples',
    content: 'Get started quickly with these basic usage examples.',
    url: '/en/docs/examples/basic-usage',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'how-to-contribute',
    title: 'How to Contribute',
    content: 'Welcome to our contribution guide! We\'re excited that you\'re interested in contributing to this project.',
    url: '/docs/contributing/how-to-contribute',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'how-to-contribute-en',
    title: 'How to Contribute',
    content: 'Welcome to our contribution guide! We\'re excited that you\'re interested in contributing to this project.',
    url: '/en/docs/contributing/how-to-contribute',
    type: 'doc',
    locale: 'en'
  },
  {
    id: 'common-issues',
    title: 'Common Issues',
    content: 'Solutions to frequently encountered problems.',
    url: '/docs/troubleshooting/common-issues',
    type: 'doc',
    locale: 'zh-Hans'
  },
  {
    id: 'common-issues-en',
    title: 'Common Issues',
    content: 'Solutions to frequently encountered problems.',
    url: '/en/docs/troubleshooting/common-issues',
    type: 'doc',
    locale: 'en'
  }
];

// Function to fetch full content for comprehensive search
async function fetchFullContent(url: string): Promise<{ fullText: string; headings: string[] }> {
  try {
    // Sample full text content for demo purposes
    // In production, you would fetch from your markdown files or API
    const sampleContent: Record<string, { fullText: string; headings: string[] }> = {
      '/docs/intro': {
        fullText: '欢迎来到项目！这是一个优秀的文档模板项目。本项目提供了完整的文档网站解决方案，包括双主题支持、多语言、搜索功能等。您可以快速构建自己的文档网站。项目特性包括响应式设计、现代化UI、SEO优化等。技术栈包括React、TypeScript、Docusaurus等现代技术。',
        headings: ['欢迎', '项目特性', '快速开始', '技术栈']
      },
      '/en/docs/intro': {
        fullText: 'Welcome to the project! This is an excellent documentation template project. This project provides a complete documentation website solution, including dual theme support, multi-language, search functionality, and more. You can quickly build your own documentation website. Project features include responsive design, modern UI, SEO optimization, etc. Tech stack includes React, TypeScript, Docusaurus and other modern technologies.',
        headings: ['Welcome', 'Project Features', 'Quick Start', 'Tech Stack']
      },
      '/docs/api/overview': {
        fullText: 'API 概述文档。本节介绍了项目的主要API接口。包括RESTful API设计原则、认证机制、错误处理、数据格式等内容。我们遵循RESTful设计规范，使用JSON作为数据交换格式。所有API都需要进行身份验证。支持OAuth2.0和JWT token认证方式。',
        headings: ['API概述', 'RESTful设计', '认证机制', '数据格式', '错误处理']
      },
      '/en/docs/api/overview': {
        fullText: 'API Overview documentation. This section introduces the main API interfaces of the project. Including RESTful API design principles, authentication mechanisms, error handling, data formats, etc. We follow RESTful design specifications and use JSON as the data exchange format. All APIs require authentication. Support OAuth2.0 and JWT token authentication methods.',
        headings: ['API Overview', 'RESTful Design', 'Authentication', 'Data Format', 'Error Handling']
      },
      '/docs/getting-started/installation': {
        fullText: '安装指南。本指南将帮助您安装和配置项目。首先确保您的系统满足最低要求：Node.js 16+、npm 7+。然后按照步骤安装：克隆项目代码，安装依赖包。配置环境变量，启动开发服务器。如果遇到问题，请查看故障排除部分。支持Windows、macOS、Linux系统。',
        headings: ['系统要求', '安装步骤', '环境配置', '启动服务', '故障排除']
      },
      '/en/docs/getting-started/installation': {
        fullText: 'Installation Guide. This guide will help you install and configure the project. First ensure your system meets the minimum requirements: Node.js 16+, npm 7+. Then follow the installation steps: clone project code, install dependencies. Configure environment variables and start development server. If you encounter issues, please check troubleshooting section. Support Windows, macOS, Linux systems.',
        headings: ['System Requirements', 'Installation Steps', 'Environment Setup', 'Start Service', 'Troubleshooting']
      },
      '/docs/getting-started/quickstart': {
        fullText: '快速开始指南。几分钟内启动并运行项目！首先克隆代码仓库 git clone，安装项目依赖 npm install。配置必要的环境变量 .env文件。运行开发命令 npm start 启动本地服务器。打开浏览器访问 localhost:3000 查看效果。修改配置文件自定义您的网站。添加您的文档内容到docs目录。',
        headings: ['克隆项目', '安装依赖', '环境配置', '启动服务', '自定义配置', '添加内容']
      },
      '/en/docs/getting-started/quickstart': {
        fullText: 'Quick Start Guide. Get the project up and running in minutes! First clone code repository with git clone, install project dependencies with npm install. Configure necessary environment variables in .env file. Run development command npm start to start local server. Open browser and visit localhost:3000 to view results. Modify configuration files to customize your website. Add your documentation content to docs directory.',
        headings: ['Clone Project', 'Install Dependencies', 'Environment Setup', 'Start Service', 'Custom Configuration', 'Add Content']
      }
    };
    
    return sampleContent[url] || { fullText: '', headings: [] };
  } catch (error) {
    console.warn(`Failed to fetch content for ${url}:`, error);
    return { fullText: '', headings: [] };
  }
}

// Generate search data dynamically from Docusaurus with full text support
async function generateSearchData(): Promise<SearchItem[]> {
  const searchData: SearchItem[] = [];
  
  if (typeof window !== 'undefined' && (window as any).__DOCUSAURUS_DATA__) {
    const docusaurusData = (window as any).__DOCUSAURUS_DATA__;
    
    // Get current locale
    const currentLocale = docusaurusData?.docusaurus?.siteMetadata?.locale || 'zh-Hans';
    
    // Process all locales data
    const globalData = docusaurusData?.docusaurus?.globalData;
    
    // Process docs for all locales
    Object.keys(globalData || {}).forEach(pluginName => {
      if (pluginName.startsWith('docusaurus-plugin-content-docs')) {
        const pluginData = globalData[pluginName];
        Object.keys(pluginData || {}).forEach(instanceName => {
          const instance = pluginData[instanceName];
          if (instance?.docs) {
            Object.values(instance.docs).forEach(async (doc: any) => {
              // Determine locale from URL pattern
              let locale = 'zh-Hans'; // default
              if (doc.permalink && doc.permalink.startsWith('/en/')) {
                locale = 'en';
              }
              
              // Fetch full content for this document
              const { fullText, headings } = await fetchFullContent(doc.permalink);
              
              searchData.push({
                id: doc.id,
                title: doc.title,
                content: doc.description || '',
                url: doc.permalink,
                type: 'doc',
                locale: locale,
                tags: doc.tags?.map((tag: any) => tag.label) || [],
                fullText: fullText,
                headings: headings
              });
            });
          }
        });
      }
      
      // Process blog posts for all locales
      if (pluginName.startsWith('docusaurus-plugin-content-blog')) {
        const pluginData = globalData[pluginName];
        Object.keys(pluginData || {}).forEach(instanceName => {
          const instance = pluginData[instanceName];
          if (instance?.blogPosts) {
            instance.blogPosts.forEach(async (post: any) => {
              // Determine locale from URL pattern
              let locale = 'zh-Hans'; // default
              if (post.permalink && post.permalink.startsWith('/en/')) {
                locale = 'en';
              }
              
              // For blog posts, we can use the excerpt or content if available
              const { fullText, headings } = await fetchFullContent(post.permalink);
              
              searchData.push({
                id: post.id,
                title: post.title,
                content: post.description || '',
                url: post.permalink,
                type: 'blog',
                locale: locale,
                tags: post.tags?.map((tag: any) => tag.label) || [],
                fullText: fullText,
                headings: headings
              });
            });
          }
        });
      }
    });
  }
  
  return searchData;
}

// ============= Fuse.js Configuration =============
const fuseOptions: IFuseOptions<SearchItem> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'content', weight: 0.2 },
    { name: 'fullText', weight: 0.3 }, // Add full text search with significant weight
    { name: 'headings', weight: 0.2 }, // Add headings search
    { name: 'tags', weight: 0.1 }
  ],
  threshold: 0.4, // Slightly higher threshold for better precision with full text
  distance: 200, // Increase distance for longer texts
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: true
};

// ============= Search Hook =============
function useLocalSearch() {
  const [searchData, setSearchData] = useState<SearchItem[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Initialize search data with full text content
  useEffect(() => {
    const initializeSearchData = async () => {
      try {
        const data = await generateSearchData();
        
        // Enhance static data with full text content
        const enhancedStaticData = await Promise.all(
          staticSearchData.map(async item => {
            const { fullText, headings } = await fetchFullContent(item.url);
            return {
              ...item,
              fullText,
              headings
            };
          })
        );
        
        setSearchData(data.length > 0 ? data : enhancedStaticData);
      } catch (error) {
        console.warn('Failed to initialize search data:', error);
        // Fallback to static data without full text
        setSearchData(staticSearchData);
      }
    };
    
    initializeSearchData();
  }, []);
  
  // Create Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(searchData, fuseOptions);
  }, [searchData]);
  
  // Perform search
  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < 2) {
      return [];
    }
    
    const results = fuse.search(query);
    return results.slice(0, 10).map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches
    }));
  }, [fuse, query]);
  
  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);
  
  // Search-related methods
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);
  
  const openSearch = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(-1);
  }, []);
  
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  }, []);
  
  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedIndex(-1);
  }, []);
  
  const selectNext = useCallback(() => {
    setSelectedIndex(prev => 
      prev < searchResults.length - 1 ? prev + 1 : prev
    );
  }, [searchResults.length]);
  
  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
  }, []);
  
  const selectCurrent = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
      return searchResults[selectedIndex].item.url;
    }
    return null;
  }, [selectedIndex, searchResults]);
  
  return {
    query,
    searchResults,
    isOpen,
    selectedIndex,
    handleSearch,
    openSearch,
    closeSearch,
    clearSearch,
    selectNext,
    selectPrevious,
    selectCurrent,
    hasResults: searchResults.length > 0,
    isEmpty: !query.trim(),
    isSearching: query.trim().length >= 2
  };
}

// ============= Search Result Item Component =============
interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

function SearchResultItem({ result, index, isSelected, onSelect, onMouseEnter }: SearchResultItemProps) {
  const { item, matches } = result;
  const itemRef = useRef<HTMLDivElement>(null);
  
  // Scroll to selected item
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [isSelected]);
  
  // Highlight matched text with improved logic for full text search
  const highlightText = (text: string, matches?: SearchResult['matches']) => {
    if (!matches || !matches.length) {
      return text;
    }
    
    // Enhanced highlight logic for full text content
    let highlightedText = text;
    
    matches.forEach(match => {
      if ((match.key === 'title' || match.key === 'fullText' || match.key === 'headings') && match.indices) {
        match.indices.forEach(([start, end]) => {
          if (start < text.length && end < text.length) {
            const before = text.slice(0, start);
            const highlighted = text.slice(start, end + 1);
            const after = text.slice(end + 1);
            highlightedText = `${before}<mark>${highlighted}</mark>${after}`;
          }
        });
      }
    });
    
    return highlightedText;
  };

  // Extract and highlight relevant text snippet from full content
  const getRelevantSnippet = (item: SearchItem, matches?: SearchResult['matches']) => {
    if (!matches || !item.fullText) {
      return item.content;
    }
    
    // Find matches in fullText
    const fullTextMatches = matches.filter(match => match.key === 'fullText');
    if (fullTextMatches.length === 0) {
      return item.content;
    }
    
    const match = fullTextMatches[0];
    if (!match.indices || match.indices.length === 0) {
      return item.content;
    }
    
    const [start, end] = match.indices[0];
    const fullText = item.fullText;
    
    // Extract context around the match (about 100 characters)
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(fullText.length, end + 50);
    
    let snippet = fullText.slice(contextStart, contextEnd);
    
    // Add ellipsis if we truncated
    if (contextStart > 0) snippet = '...' + snippet;
    if (contextEnd < fullText.length) snippet = snippet + '...';
    
    return snippet;
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'doc':
        return '文档';
      case 'blog':
        return '博客';
      case 'page':
        return '页面';
      default:
        return type;
    }
  };
  
  // Get the best content to display (either snippet from fullText or regular content)
  const displayContent = getRelevantSnippet(item, matches);
  
  return (
    <div 
      ref={itemRef}
      className={clsx(
        styles.searchResultItem,
        isSelected && styles.searchResultItemSelected
      )} 
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
    >
      <div className={styles.searchResultHeader}>
        <span 
          className={styles.searchResultTitle}
          dangerouslySetInnerHTML={{
            __html: highlightText(item.title, matches)
          }}
        />
        <span className={clsx(styles.searchResultType, styles[`type-${item.type}`])}>
          {getTypeLabel(item.type)}
        </span>
      </div>
      {displayContent && (
        <div className={styles.searchResultContent}>
          {displayContent.length > 150 
            ? `${displayContent.slice(0, 150)}...` 
            : displayContent
          }
        </div>
      )}
      {item.tags && item.tags.length > 0 && (
        <div className={styles.searchResultTags}>
          {item.tags.map(tag => (
            <span key={tag} className={styles.searchResultTag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= Main Component =============
export default function LocalSearch() {
  const {
    query,
    searchResults,
    isOpen,
    selectedIndex,
    handleSearch,
    openSearch,
    closeSearch,
    clearSearch,
    selectNext,
    selectPrevious,
    selectCurrent,
    hasResults,
    isEmpty,
    isSearching
  } = useLocalSearch();
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        // Open search shortcut
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          openSearch();
        }
        return;
      }
      
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeSearch();
          break;
          
        case 'ArrowDown':
          event.preventDefault();
          selectNext();
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          selectPrevious();
          break;
          
        case 'Enter':
          event.preventDefault();
          const selectedUrl = selectCurrent();
          if (selectedUrl) {
            closeSearch();
            window.location.href = selectedUrl;
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openSearch, closeSearch, selectNext, selectPrevious, selectCurrent]);
  
  // Focus input field
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleResultSelect = (url: string) => {
    closeSearch();
    window.location.href = url;
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSearch();
    }
  };
  
  const handleMouseEnterResult = (index: number) => {
    // Only update selected index on mouse hover to avoid conflicts with keyboard navigation
  };
  
  return (
    <>
      {/* Search trigger button */}
      <button
        type="button"
        className={styles.searchButton}
        onClick={openSearch}
        title={translate({
          id: 'theme.SearchBar.label',
          message: 'Search',
          description: 'The ARIA label for search button'
        })}
        aria-label={translate({
          id: 'theme.SearchBar.label', 
          message: 'Search'
        })}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          className={styles.searchIcon}
        >
          <path
            d="m19 19-3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className={styles.searchButtonText}>Search</span>
        <kbd className={styles.searchShortcut}>⌘K</kbd>
      </button>
      
      {/* Search modal */}
      {isOpen && (
        <div className={styles.searchBackdrop} onClick={handleBackdropClick}>
          <div className={styles.searchModal}>
            <div className={styles.searchInputContainer}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                className={styles.searchInputIcon}
              >
                <path
                  d="m19 19-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search documentation..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className={styles.searchClearButton}
                  onClick={clearSearch}
                  title="Clear"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <path
                      d="m8.746 8 3.1-3.1a.527.527 0 1 0-.746-.746L8 7.254l-3.1-3.1a.527.527 0 1 0-.746.746L7.254 8l-3.1 3.1a.527.527 0 1 0 .746.746L8 8.746l3.1 3.1a.527.527 0 1 0 .746-.746L8.746 8Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className={styles.searchCloseButton}
                onClick={closeSearch}
                title="Close"
              >
                <kbd>ESC</kbd>
              </button>
            </div>
            
            <div className={styles.searchResults}>
              {isEmpty && (
                <div className={styles.searchEmptyState}>
                  <div className={styles.searchEmptyIcon}>🔍</div>
                  <p>Start typing to search documentation</p>
                  <div className={styles.searchTips}>
                    <p>Search tips:</p>
                    <ul>
                      <li>Use spaces to separate multiple keywords</li>
                      <li>Try using relevant technical terms</li>
                      <li>Search titles, content, and tags</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {isSearching && !hasResults && (
                <div className={styles.searchNoResults}>
                  <div className={styles.searchNoResultsIcon}>😕</div>
                  <p>No results found</p>
                  <p className={styles.searchNoResultsHint}>
                    Try using different keywords or check spelling
                  </p>
                </div>
              )}
              
              {hasResults && (
                <div className={styles.searchResultsList}>
                  <div className={styles.searchResultsHeader}>
                    Found {searchResults.length} results
                  </div>
                  {searchResults.map((result, index) => (
                    <SearchResultItem
                      key={`${result.item.id}-${index}`}
                      result={result}
                      index={index}
                      isSelected={selectedIndex === index}
                      onSelect={() => handleResultSelect(result.item.url)}
                      onMouseEnter={() => handleMouseEnterResult(index)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.searchFooter}>
              <div className={styles.searchNavHint}>
                <kbd>↑</kbd><kbd>↓</kbd> Navigate
                <kbd>↵</kbd> Select
                <kbd>ESC</kbd> Close
              </div>
              <div className={styles.searchPoweredBy}>
                Powered by <a href="https://fusejs.io" target="_blank" rel="noopener noreferrer">Fuse.js</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
