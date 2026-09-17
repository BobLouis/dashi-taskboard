import { memo, useEffect, useState, type ClipboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { attachmentContentUrl } from "../api";
import { postEmbeddedHostMessage } from "../embeddedHost.mjs";
import { useTaskboardI18n } from "../i18n";
import type { Attachment, Task, TaskRelationSummary } from "../types";
import { STATUS_DETAILS } from "./BoardColumn";
import {
  createInlineMediaSegmentsFromHtml,
  parseInternalDocumentUrl,
  writeInlineMediaClipboard,
} from "../documentModel";
import { MarkdownDocument } from "./MarkdownDocument";
import { LinearIcon } from "./LinearIcon";
import { StatusIcon } from "./SemanticIcons";

function referencedTask(
  href: string,
  referenceTasks: Task[],
): { identifier: string; task: Task | null } | null {
  const reference = parseInternalDocumentUrl(href, document.baseURI);
  if (reference?.type !== "issue") return null;
  const { projectId, identifier } = reference;
  const task = referenceTasks.find((candidate) => (
    candidate.projectId === projectId && candidate.identifier === identifier
  )) ?? null;
  return { identifier: task?.externalKey ?? identifier, task };
}

function referencedAttachment(href: string, attachments: Attachment[]): Attachment | null {
  const reference = parseInternalDocumentUrl(href, document.baseURI);
  if (reference?.type !== "attachment" || reference.endpoint !== "download") return null;
  return attachments.find((attachment) => attachment.id === reference.attachmentId) ?? null;
}

function fileSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function AttachmentLocalActions({ attachment, onCopy }: {
  attachment: Attachment;
  onCopy: (path: string, announcement: string) => void;
}) {
  const { text } = useTaskboardI18n();
  const [localPath, setLocalPath] = useState<string | null>(null);

  useEffect(() => {
    setLocalPath(null);
    if (new URL(document.baseURI).searchParams.get("host") !== "codex" || window.parent === window) return;
    function receiveLocalPath(event: MessageEvent) {
      if (event.source !== window.parent || event.data?.type !== "taskboard:attachment-local-path") return;
      const payload = event.data.payload;
      if (payload?.attachmentId !== attachment.id || payload?.filename !== attachment.filename) return;
      setLocalPath(typeof payload.localPath === "string" ? payload.localPath : null);
    }
    function locate() {
      postEmbeddedHostMessage({
        type: "taskboard:open-attachment",
        payload: { attachmentId: attachment.id, filename: attachment.filename, operation: "local-path" },
      });
    }
    window.addEventListener("message", receiveLocalPath);
    window.addEventListener("focus", locate);
    locate();
    return () => {
      window.removeEventListener("message", receiveLocalPath);
      window.removeEventListener("focus", locate);
    };
  }, [attachment.id, attachment.filename]);

  if (!localPath) return null;
  return (
    <span className="attachment-local-actions">
      <button
        type="button"
        className="icon-button"
        aria-label={text("复制文件路径", "Copy file path")}
        title={text("复制文件路径", "Copy file path")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCopy(localPath, text("已复制文件路径", "File path copied"));
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="1.5" y="4" width="9" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.5 0.25C13.1233 0.25 15.25 2.37662 15.25 5V9C15.25 10.9015 13.8346 12.4713 12 12.7158V11.1914C13.0017 10.9638 13.75 10.0706 13.75 9V5C13.75 3.20511 12.295 1.75 10.5 1.75H8.5C7.83441 1.75 7.23812 2.04063 6.82617 2.5H5.06348C5.64227 1.17585 6.96247 0.25 8.5 0.25H10.5Z" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={text("打开文件所在位置", "Show file in folder")}
        title={text("打开文件所在位置", "Show file in folder")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          postEmbeddedHostMessage({
            type: "taskboard:open-attachment",
            payload: { attachmentId: attachment.id, filename: attachment.filename, operation: "reveal" },
          });
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4.87109 9.71614H11.2664" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path fillRule="evenodd" clipRule="evenodd" d="M1.66699 5.19899C1.66699 3.57105 2.50033 2.17296 4.08166 1.84851C5.66233 1.52344 6.86366 1.63582 7.86166 2.17423C8.86033 2.71264 8.57433 3.50756 9.60033 4.09105C10.627 4.67518 12.2783 3.79772 13.357 4.96153C14.4863 6.17994 14.4803 8.05042 14.4803 9.2428C14.4803 13.7736 11.9423 14.133 8.07366 14.133C4.20499 14.133 1.66699 13.8193 1.66699 9.2428V5.19899Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </span>
  );
}

export const DescriptionDocument = memo(function DescriptionDocument({
  value,
  referenceTasks,
  onOpenTask,
  attachments = [],
  enableImagePreview = false,
  onOpenAttachment,
  onCopyAttachmentPath,
}: {
  value: string;
  referenceTasks: Task[];
  onOpenTask: (task: TaskRelationSummary) => void;
  attachments?: Attachment[];
  enableImagePreview?: boolean;
  onOpenAttachment?: (event: MouseEvent<HTMLAnchorElement>, attachment: Attachment) => void;
  onCopyAttachmentPath?: (path: string, announcement: string) => void;
}) {
  const [previewImage, setPreviewImage] = useState<{
    src: string; alt: string; attachment: Attachment | null;
  } | null>(null);

  useEffect(() => {
    if (!previewImage) return;
    function closePreview(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setPreviewImage(null);
    }
    window.addEventListener("keydown", closePreview, true);
    return () => window.removeEventListener("keydown", closePreview, true);
  }, [previewImage]);

  return (<>
    <MarkdownDocument
      value={value}
      onImageClick={enableImagePreview ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        const src = event.currentTarget.currentSrc || event.currentTarget.src;
        const reference = parseInternalDocumentUrl(src, document.baseURI);
        setPreviewImage({
          src,
          alt: event.currentTarget.alt,
          attachment: reference?.type === "attachment"
            ? attachments.find((attachment) => attachment.id === reference.attachmentId) ?? null
            : null,
        });
      } : undefined}
      onCopy={(event: ClipboardEvent<HTMLDivElement>) => {
        const selection = event.currentTarget.ownerDocument.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        if (
          !event.currentTarget.contains(range.startContainer)
          || !event.currentTarget.contains(range.endContainer)
        ) return;
        const selectedRange = range.cloneRange();
        const wrapper = event.currentTarget.ownerDocument.createElement("div");
        wrapper.append(selectedRange.cloneContents());
        const segments = createInlineMediaSegmentsFromHtml(wrapper.innerHTML, referenceTasks);
        if (!segments) return;
        event.preventDefault();
        writeInlineMediaClipboard(
          event.clipboardData,
          segments,
        );
      }}
      renderLink={(href) => {
        const attachment = href ? referencedAttachment(href, attachments) : null;
        if (attachment) {
          if (attachment.contentType.startsWith("video/")) {
            return (
              <video
                className="document-inline-video"
                src={attachmentContentUrl(attachment)}
                aria-label={attachment.filename}
                controls
              />
            );
          }
          return (
            <span className="document-attachment-card">
              <span className="attachment-file-icon" aria-hidden="true">
                <LinearIcon name="file" />
              </span>
              <span className="attachment-copy composer-attachment-copy">
                <strong>{attachment.filename}</strong>
                <span>{fileSize(attachment.size)}</span>
              </span>
            </span>
          );
        }
        const reference = href ? referencedTask(href, referenceTasks) : null;
        if (!reference) return null;
        const { task } = reference;
        if (!task) {
          return (
            <span className="issue-reference-inline">
              <span className="issue-reference-identity">
                <span className="issue-reference-id">{reference.identifier}</span>
              </span>
            </span>
          );
        }
        return (
          <span className={`issue-reference-inline issue-reference-status-${task.status}`}>
            <span className="issue-reference-identity">
              <span className={`status-icon issue-reference-status status-icon-${STATUS_DETAILS[task.status].tone}`}>
                <StatusIcon status={task.status} color="var(--column-status-color)" size={15} />
              </span>
              <span className="issue-reference-id">{task.externalKey ?? task.identifier}</span>
            </span>
            <span className="issue-reference-title">{task.title}</span>
          </span>
        );
      }}
      renderLinkActions={onCopyAttachmentPath ? (href) => {
        const attachment = href ? referencedAttachment(href, attachments) : null;
        return attachment
          ? <AttachmentLocalActions key={attachment.id} attachment={attachment} onCopy={onCopyAttachmentPath} />
          : null;
      } : undefined}
      onLinkClick={(event, href) => {
        const attachment = href ? referencedAttachment(href, attachments) : null;
        if (attachment && onOpenAttachment) {
          if (
            event.button === 0
            && !event.metaKey
            && !event.ctrlKey
            && !event.shiftKey
            && !event.altKey
          ) onOpenAttachment(event, attachment);
          return;
        }
        const reference = href ? referencedTask(href, referenceTasks) : null;
        if (
          !reference
          || event.button !== 0
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
        ) return;
        event.preventDefault();
        if (reference.task) onOpenTask(reference.task);
      }}
    />
    {previewImage && createPortal(
      <div
        className="display-settings-backdrop image-preview-backdrop"
        role="presentation"
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) setPreviewImage(null);
        }}
      >
        <div
          className="image-preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={previewImage.alt || "Image preview"}
        >
          <img src={previewImage.src} alt={previewImage.alt} />
          {previewImage.attachment && onCopyAttachmentPath && (
            <AttachmentLocalActions
              key={previewImage.attachment.id}
              attachment={previewImage.attachment}
              onCopy={onCopyAttachmentPath}
            />
          )}
          <button
            className="icon-button display-settings-close image-preview-close"
            type="button"
            aria-label="Close image preview"
            onClick={() => setPreviewImage(null)}
          >
            <LinearIcon name="close" />
          </button>
        </div>
      </div>,
      document.body,
    )}
  </>);
});
