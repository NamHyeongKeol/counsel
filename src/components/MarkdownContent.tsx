"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownContentProps {
    content: string;
    className?: string;
}

/**
 * 공통 마크다운 렌더링 컴포넌트
 * - **볼드** → 키컬러(pink-300) 볼드
 * - *이탤릭* → 회색(gray-400) 이탤릭
 * - 링크 → 파란색 밑줄
 * - 문단 → 적절한 간격
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
    return (
        <div className={`text-sm leading-relaxed ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkBreaks]}
                components={{
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
                        >
                            {children}
                        </a>
                    ),
                    p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="text-pink-300 font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="text-gray-400 italic">{children}</em>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
