import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

interface TypewriterCodeProps {
  code: string;
  language?: string;
  fileName?: string;
  typingSpeed?: number;
  startDelay?: number;
}

interface Token {
  type: 'keyword' | 'annotation' | 'class' | 'method' | 'variable' | 'string' | 'text' | 'space';
  value: string;
}

const TypewriterCode: React.FC<TypewriterCodeProps> = ({
  code,
  language = 'java',
  fileName = 'Example.java',
  typingSpeed = 30,
  startDelay = 500,
}) => {
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const codeContentRef = React.useRef<HTMLDivElement>(null);
  const cursorRef = React.useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!isTyping || currentIndex >= code.length) return;

    const timer = setTimeout(() => {
      setDisplayedCode(code.substring(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [currentIndex, code, isTyping, typingSpeed]);

  // 自动滚动到光标位置
  useEffect(() => {
    if (cursorRef.current && codeContentRef.current) {
      const cursor = cursorRef.current;
      const container = codeContentRef.current;

      // 获取光标相对于容器的位置
      const cursorRect = cursor.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // 如果光标超出可视区域，滚动到光标位置
      if (cursorRect.bottom > containerRect.bottom - 20) {
        cursor.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [displayedCode]);

  // 标记化代码行
  const tokenizeLine = (line: string): Token[] => {
    const tokens: Token[] = [];
    const keywords = ['public', 'private', 'class', 'return', 'new', 'final', 'this'];
    const annotations = ['@RestController', '@RequestMapping', '@SpringBootApplication', '@GetMapping'];
    const types = ['String', 'ChatModel', 'Prompt', 'DashScopeChatOptions', 'DashScopeApi'];

    let remaining = line;

    while (remaining.length > 0) {
      let matched = false;

      // 匹配注解
      for (const annotation of annotations) {
        if (remaining.startsWith(annotation)) {
          tokens.push({ type: 'annotation', value: annotation });
          remaining = remaining.slice(annotation.length);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // 匹配关键字
      for (const keyword of keywords) {
        const regex = new RegExp(`^${keyword}\\b`);
        if (regex.test(remaining)) {
          tokens.push({ type: 'keyword', value: keyword });
          remaining = remaining.slice(keyword.length);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // 匹配类型
      for (const type of types) {
        const regex = new RegExp(`^${type}\\b`);
        if (regex.test(remaining)) {
          tokens.push({ type: 'class', value: type });
          remaining = remaining.slice(type.length);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // 匹配字符串
      if (remaining[0] === '"') {
        const endQuote = remaining.indexOf('"', 1);
        if (endQuote !== -1) {
          const str = remaining.slice(0, endQuote + 1);
          tokens.push({ type: 'string', value: str });
          remaining = remaining.slice(endQuote + 1);
          continue;
        }
      }

      // 匹配方法调用
      const methodMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (methodMatch) {
        tokens.push({ type: 'method', value: methodMatch[1] });
        remaining = remaining.slice(methodMatch[1].length);
        continue;
      }

      // 匹配变量赋值
      const varMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      if (varMatch) {
        tokens.push({ type: 'variable', value: varMatch[1] });
        remaining = remaining.slice(varMatch[1].length);
        continue;
      }

      // 匹配空格
      const spaceMatch = remaining.match(/^\s+/);
      if (spaceMatch) {
        tokens.push({ type: 'space', value: spaceMatch[0] });
        remaining = remaining.slice(spaceMatch[0].length);
        continue;
      }

      // 其他字符
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }

    return tokens;
  };

  // 渲染标记化的行
  const renderTokens = (tokens: Token[], lineIndex: number) => {
    return tokens.map((token, tokenIndex) => {
      const key = `${lineIndex}-${tokenIndex}`;

      if (token.type === 'space') {
        return <span key={key}>{token.value}</span>;
      }

      const className = {
        keyword: styles.codeKeyword,
        annotation: styles.codeAnnotation,
        class: styles.codeClass,
        method: styles.codeMethod,
        variable: styles.codeVariable,
        string: styles.codeString,
        text: '',
      }[token.type];

      return (
        <span key={key} className={className}>
          {token.value}
        </span>
      );
    });
  };

  // 高亮代码的辅助函数
  const highlightCode = (codeString: string) => {
    const lines = codeString.split('\n');
    return lines.map((line, lineIndex) => {
      const tokens = tokenizeLine(line);

      return (
        <div key={lineIndex} className={styles.codeLine}>
          {renderTokens(tokens, lineIndex)}
          {lineIndex === lines.length - 1 && currentIndex < code.length && (
            <span ref={cursorRef} className={styles.cursor}>|</span>
          )}
        </div>
      );
    });
  };  return (
    <div className={styles.codePreview}>
      <div className={styles.codeHeader}>
        <div className={styles.codeDots}>
          <div className={`${styles.dot} ${styles.dotRed}`}></div>
          <div className={`${styles.dot} ${styles.dotYellow}`}></div>
          <div className={`${styles.dot} ${styles.dotGreen}`}></div>
        </div>
        <div className={styles.codeTitle}>{fileName}</div>
        <div className={styles.codeLang}>{language}</div>
      </div>
      <div ref={codeContentRef} className={styles.codeContent}>
        <pre className={styles.codeBlock}>
          <code>{highlightCode(displayedCode)}</code>
        </pre>
      </div>
    </div>
  );
};

export default TypewriterCode;
