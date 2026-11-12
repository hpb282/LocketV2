import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Code2,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import developer from "../electron/developer.json";
import zaloQR from "./assets/developer/zalo.svg";
import instagramQR from "./assets/developer/instagram.svg";
import messengerQR from "./assets/developer/messenger.svg";
import { invoke } from "./api";

const qrImages: Record<string, string> = {
  zalo: zaloQR,
  instagram: instagramQR,
  messenger: messengerQR,
};
type Contact = (typeof developer.socials)[number];

export function Developer({
  version,
  notify,
  onBack,
}: {
  version: string;
  notify: (message: string) => void;
  onBack: () => void;
}) {
  const [expanded, setExpanded] = useState<Contact | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (expanded && !dialog.current?.open) dialog.current?.showModal();
  }, [expanded]);

  async function copy(id: string, label: string) {
    try {
      await invoke("developer:copy", id);
      notify(`Đã sao chép ${label}.`);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function open(id: string) {
    try {
      await invoke("developer:open", id);
    } catch (error) {
      notify((error as Error).message);
    }
  }

  return (
    <section className="page developer-page">
      <header className="page-header">
        <div>
          <button className="text-button developer-back" onClick={onBack}>
            <ArrowLeft size={16} /> Cài đặt
          </button>
          <h1>Người phát triển</h1>
        </div>
        <span className="version-badge">v{version}</span>
      </header>

      <div className="developer-intro">
        <div className="developer-monogram" aria-hidden="true">
          <Code2 size={23} />
          <span>{developer.alias}</span>
        </div>
        <div>
          <p className="developer-app-name">Locket x HPB</p>
          <h2>{developer.name}</h2>
          <p className="developer-alias">@{developer.alias}</p>
        </div>
      </div>

      <div className="developer-contacts">
        <div className="developer-contact">
          <Mail size={21} aria-hidden="true" />
          <div className="developer-contact-value">
            <span>Email</span>
            <p>{developer.email}</p>
          </div>
          <button
            className="icon-btn"
            aria-label="Sao chép email"
            title="Sao chép email"
            onClick={() => void copy("email", "email")}
          >
            <Copy size={17} />
          </button>
          <button
            className="icon-btn"
            aria-label="Viết email cho người phát triển"
            title="Viết email"
            onClick={() => void open("email")}
          >
            <ExternalLink size={17} />
          </button>
        </div>
        <div className="developer-contact">
          <Phone size={21} aria-hidden="true" />
          <div className="developer-contact-value">
            <span>Điện thoại</span>
            <p>{developer.phone}</p>
          </div>
          <button
            className="icon-btn"
            aria-label="Sao chép số điện thoại"
            title="Sao chép số điện thoại"
            onClick={() => void copy("phone", "số điện thoại")}
          >
            <Copy size={17} />
          </button>
        </div>
      </div>

      <div className="developer-section-heading">
        <h2>Kết nối</h2>
        <span>Bấm vào mã QR để phóng lớn</span>
      </div>
      <div className="developer-socials">
        {developer.socials.map((contact) => (
          <article className="developer-social-card" key={contact.id}>
            <h3>
              <span className={`developer-social-icon ${contact.id}`}>
                {contact.id === "instagram" ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                ) : contact.id === "zalo" ? (
                  <span aria-hidden="true">Z</span>
                ) : (
                  <MessageCircle size={20} />
                )}
              </span>
              {contact.label}
            </h3>
            <button
              className="developer-qr-button"
              aria-label={`Phóng lớn mã QR ${contact.label}`}
              onClick={() => setExpanded(contact)}
            >
              <img
                className="developer-qr"
                src={qrImages[contact.id]}
                alt={`Mã QR ${contact.label} của ${developer.name}`}
                width="640"
                height="640"
                draggable={false}
              />
            </button>
            <p className="developer-social-handle">{contact.handle}</p>
            <div className="developer-social-actions">
              <button
                className="btn secondary"
                onClick={() => void open(contact.id)}
              >
                Mở {contact.label} <ExternalLink size={15} />
              </button>
              <button
                className="icon-btn"
                aria-label={`Sao chép liên kết ${contact.label}`}
                title="Sao chép liên kết"
                onClick={() =>
                  void copy(contact.id, `liên kết ${contact.label}`)
                }
              >
                <Copy size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <dialog
        ref={dialog}
        className="developer-qr-dialog"
        aria-labelledby="developer-qr-title"
        onClose={() => setExpanded(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        {expanded && (
          <div className="developer-qr-dialog-content">
            <header>
              <h2 id="developer-qr-title">{expanded.label}</h2>
              <button
                className="icon-btn"
                aria-label="Đóng mã QR"
                onClick={() => dialog.current?.close()}
              >
                <X size={20} />
              </button>
            </header>
            <img
              className="developer-qr"
              src={qrImages[expanded.id]}
              alt={`Mã QR ${expanded.label} phóng lớn`}
              width="640"
              height="640"
              draggable={false}
            />
            <h3>{developer.name}</h3>
            <p className="developer-social-handle">{expanded.handle}</p>
            <button
              className="btn primary"
              onClick={() => void open(expanded.id)}
            >
              Mở {expanded.label} <ExternalLink size={16} />
            </button>
          </div>
        )}
      </dialog>
    </section>
  );
}
