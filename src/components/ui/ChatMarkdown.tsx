import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const chatMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 [&:not(:first-child)]:mt-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-on-surface-variant">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-headline-sm text-primary first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-4 font-display text-headline-sm text-primary first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-3 font-display text-[15px] font-semibold text-on-surface first:mt-0">
      {children}
    </h4>
  ),
  code: ({ className, children }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[13px] text-on-surface">
          {children}
        </code>
      );
    }
    return (
      <code className="block overflow-x-auto rounded-lg bg-surface-container-high p-3 font-mono text-[13px] leading-relaxed text-on-surface">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-primary/30 pl-3 text-on-surface-variant last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full min-w-[280px] border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-container-low">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-surface-container-highest px-2.5 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-surface-container-highest px-2.5 py-1.5 align-top">
      {children}
    </td>
  ),
  hr: () => <hr className="my-4 border-surface-container-highest" />,
};

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

export function ChatMarkdown({ content, className = "" }: ChatMarkdownProps) {
  return (
    <div className={`text-body-md leading-relaxed text-on-surface ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
