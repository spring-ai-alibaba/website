import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import projectConfig, { getSearchConfig } from '../../../project.config';
import styles from './styles.module.css';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  score: number;
}

const PineconeFloatingSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const searchConfig = getSearchConfig(projectConfig);
  const isPineconeConfigured = searchConfig.isVectorSearchConfigured;

  // 执行搜索 - 简化版本，返回演示结果
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock 演示搜索结果
    const demoResults: SearchResult[] = [
      {
        id: 'demo-1',
        title: '快速开始指南',
        content: '了解如何快速开始使用我们的项目，包括安装和基本配置步骤。',
        url: '/docs/intro',
        score: 0.95,
      },
      {
        id: 'demo-2',
        title: 'API 概述',
        content: '详细的 API 接口文档，包括认证方法和所有可用的端点。',
        url: '/docs/api/overview',
        score: 0.88,
      },
      {
        id: 'demo-3',
        title: '配置指南',
        content: '如何配置项目以满足您的特定需求和使用场景。',
        url: '/docs/getting-started/configuration',
        score: 0.82,
      }
    ];

    // 根据查询过滤结果
    const filteredResults = demoResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filteredResults.length > 0 ? filteredResults : demoResults);
    setLoading(false);
  };

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleResultSelect = (result: SearchResult) => {
    if (typeof window !== 'undefined') {
      window.location.href = result.url;
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleToggleSearch = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className={styles.floatingSearchContainer}>
      <button
        ref={buttonRef}
        className={clsx(styles.floatingButton, { 
          [styles.floatingButtonActive]: isOpen
        })}
        onClick={handleToggleSearch}
        aria-label="AI 向量搜索"
        title="AI 向量搜索"
      >
        <svg viewBox="0 0 24 24" className={styles.searchIcon}>
          <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
        <div className={styles.aiIndicator}>AI</div>
      </button>

      {isOpen && (
        <div className={styles.searchModal} ref={searchRef}>
          <div className={styles.searchHeader}>
            <div className={styles.searchInputContainer}>
              <input
                ref={inputRef}
                type="text"
                placeholder="使用 AI 进行智能搜索..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchInput}
              />
              {loading && (
                <div className={styles.searchSpinner}>
                  <div className={styles.spinner}></div>
                </div>
              )}
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="关闭搜索"
            >
              ×
            </button>
          </div>

          <div className={styles.searchResults}>
            {results.length > 0 ? (
              <>
                <div className={styles.resultsHeader}>
                  <span className={styles.aiLabel}>🤖 AI</span>
                  找到 {results.length} 个相关结果
                </div>
                {results.map((result) => (
                  <div
                    key={result.id}
                    className={styles.searchResult}
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className={styles.resultHeader}>
                      <h4 className={styles.resultTitle}>{result.title}</h4>
                      <span className={styles.resultScore}>
                        {Math.round(result.score * 100)}%
                      </span>
                    </div>
                    <p className={styles.resultContent}>{result.content}</p>
                  </div>
                ))}
              </>
            ) : query.trim() ? (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <p>没有找到相关结果</p>
                <p className={styles.noResultsHint}>
                  尝试使用不同的关键词
                </p>
              </div>
            ) : (
              <div className={styles.searchTips}>
                <h4>🤖 AI 搜索</h4>
                <ul>
                  <li>输入任何问题或关键词</li>
                  <li>AI 会理解您的意图</li>
                  <li>基于语义相似性查找内容</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PineconeFloatingSearch;