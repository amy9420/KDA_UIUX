import React, { useEffect, useRef } from "react";
import assets from "./assets.json";

export function Asset({ screen = "225:4719", name, className = "" }) {
  const asset = assets[screen]?.[name];
  if (!asset) return null;
  return (
    <span className={`asset ${className}`} aria-hidden="true">
      <img
        src={`${import.meta.env.BASE_URL}${asset.src.slice(1)}`}
        alt=""
        width={asset.width ? parseFloat(asset.width) : undefined}
        height={asset.height ? parseFloat(asset.height) : undefined}
      />
    </span>
  );
}

export function Button({
  children,
  secondary = false,
  arrow = false,
  busy = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`button ${secondary ? "secondary" : ""} ${className}`}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
      {arrow && !busy && <Asset name="imgContainer" />}
    </button>
  );
}

export function Heading({ children, description, eyebrow }) {
  return (
    <div className="heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{children}</h1>
      {description && <p className="description">{description}</p>}
    </div>
  );
}

export function Notice({ children, className = "" }) {
  return (
    <div className={`notice ${className}`}>
      <Asset name="imgIcon1" />
      <p>{children}</p>
    </div>
  );
}

export function Header({ title, onBack, onChat, onClose, chat = false }) {
  return (
    <header className="app-header">
      <div className="statusbar" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}figma/225-4719-img.png`} alt="" />
      </div>
      <nav className="navbar" aria-label="화면 이동">
        <button
          className="icon-button back"
          aria-label="뒤로가기"
          onClick={onBack}
        >
          <Asset name="imgContainer2" />
        </button>
        <h2>
          {chat && <i />}
          {title}
        </h2>
        <div className="nav-actions">
          <button
            className="icon-button"
            aria-label="하이챗봇 상담"
            onClick={onChat}
          >
            <Asset name="imgContainer3" />
          </button>
          {onClose && (
            <button className="icon-button" aria-label="닫기" onClick={onClose}>
              <Asset screen="225:4625" name="imgContainer4" />
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

export function Checkbox({ checked, onChange, children, id, ...props }) {
  return (
    <label className={`checkbox ${checked ? "is-checked" : ""}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}

export function Modal({ title, children, onClose, actions, compact = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.focus();
    function keydown(e) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = [
        ...dialog.querySelectorAll(
          'button:not(:disabled), input, a[href], [tabindex="0"]',
        ),
      ];
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        e.preventDefault();
        first.focus();
      }
    }
    dialog.addEventListener("keydown", keydown);
    return () => {
      dialog.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-layer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`sheet ${compact ? "compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="sheet-handle" />
        <button
          className="sheet-close icon-button"
          aria-label="팝업 닫기"
          onClick={onClose}
        >
          <Asset screen="225:4625" name="imgContainer4" />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
        {actions && <div className="sheet-actions">{actions}</div>}
      </section>
    </div>
  );
}

export function DocumentPreview({
  upload,
  selectedPage,
  onPageChange,
  large = false,
  onEnlarge,
}) {
  if (!upload) return null;
  const pages = upload.type?.startsWith("image/") ? 1 : 3;
  return (
    <div className={`document-preview ${large ? "large" : ""}`}>
      {upload.url && upload.type === "application/pdf" && large ? (
        <object
          type="application/pdf"
          data={upload.url}
          className="pdf-preview"
          aria-label="등록한 PDF 원문"
        >
          <p>
            PDF 미리보기를 지원하지 않는 브라우저예요.{" "}
            <a href={upload.url} target="_blank" rel="noreferrer">
              파일 열기
            </a>
          </p>
        </object>
      ) : upload.url && upload.type === "application/pdf" ? (
        <button className="actual-pdf-preview" onClick={onEnlarge}>
          <strong>PDF</strong>
          <span>{upload.name}</span>
          <small>원문 미리보기</small>
        </button>
      ) : upload.url && upload.type?.startsWith("image/") ? (
        <button
          className="image-preview-button"
          onClick={onEnlarge}
          aria-label="등록한 이미지 크게 보기"
        >
          <img
            className="uploaded-image"
            src={upload.url}
            alt="등록한 임대차계약서"
          />
        </button>
      ) : (
        <div className={`preview-pages ${large ? "is-large" : ""}`}>
          {Array.from({ length: large ? 1 : pages }, (_, i) => {
            const page = large ? selectedPage : i + 1;
            return (
              <button
                className={`paper-thumb ${selectedPage === page ? "selected" : ""}`}
                key={page}
                onClick={() => (large ? onEnlarge?.() : onPageChange?.(page))}
                aria-label={`${page}페이지 미리보기`}
                aria-pressed={selectedPage === page}
              >
                <span className="paper-content">
                  {large && (
                    <>
                      <strong>부동산 임대차계약서</strong>
                      <span className="document-lines">
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="paper-caption">
                        <b>● 제2조 (임대차 기간)</b>
                        <em>인식 불가</em>
                        <span className="blurred-lines">
                          <i />
                          <i />
                        </span>
                      </span>
                    </>
                  )}
                  <span />
                  <span />
                  <span />
                  {large && (
                    <>
                      <span />
                      <span />
                      <span />
                      <span />
                    </>
                  )}
                </span>
                {!large && (
                  <span className="paper-label">
                    {page}p ({["표지", "계약조항", "특약사항"][page - 1]})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
