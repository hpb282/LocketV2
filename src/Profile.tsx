import { useEffect, useState } from "react";
import { Camera, Save, MapPin, Cake, Image, Video, Star } from "lucide-react";
import type { Item, PersonalProfile } from "./types";
import { Avatar } from "./Avatar";
import { invoke } from "./api";
import { dayLabel, localDayKey } from "./calendar";

export function Profile({
  profile,
  items,
  notify,
}: {
  profile: PersonalProfile;
  items: Item[];
  notify: (message: string) => void;
}) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false),
    [changingAvatar, setChangingAvatar] = useState(false);
  useEffect(() => {
    setForm((value) => ({
      ...value,
      displayName: profile.displayName,
      nickname: profile.nickname,
      birthday: profile.birthday,
      bio: profile.bio,
      location: profile.location,
    }));
  }, [
    profile.displayName,
    profile.nickname,
    profile.birthday,
    profile.bio,
    profile.location,
  ]);
  const patch = (value: Partial<PersonalProfile>) =>
    setForm((current) => ({ ...current, ...value }));
  const fields = {
    displayName: form.displayName,
    nickname: form.nickname,
    birthday: form.birthday,
    bio: form.bio,
    location: form.location,
  };
  const changed = Object.entries(fields).some(
    ([key, value]) => profile[key as keyof PersonalProfile] !== value,
  );
  const avatar = async (clear = false) => {
    setChangingAvatar(true);
    try {
      const result = await invoke<PersonalProfile | null>(
        clear ? "profile:avatar:clear" : "profile:avatar",
      );
      if (result)
        notify(clear ? "Đã gỡ ảnh đại diện." : "Đã đổi ảnh đại diện.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setChangingAvatar(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await invoke("profile:update", fields);
      notify("Đã lưu hồ sơ cá nhân.");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="page profile-page" aria-label="Hồ sơ cá nhân">
      <header className="page-header">
        <h1>Hồ sơ cá nhân</h1>
      </header>
      <div className="profile-layout">
        <aside className="profile-summary settings-card">
          <Avatar profile={profile} large />
          <button
            className="btn secondary"
            disabled={changingAvatar}
            onClick={() => void avatar()}
          >
            <Camera size={17} />
            {changingAvatar ? "Đang đổi ảnh…" : "Đổi ảnh đại diện"}
          </button>
          {profile.avatarId && (
            <button
              className="text-button remove-avatar"
              disabled={changingAvatar}
              onClick={() => void avatar(true)}
            >
              Gỡ ảnh đại diện
            </button>
          )}
          <h2>{form.displayName.trim() || "Bạn"}</h2>
          {form.nickname && <p className="profile-nickname">{form.nickname}</p>}
          {form.bio && <p className="profile-bio">{form.bio}</p>}
          {form.birthday && (
            <p className="profile-detail">
              <Cake size={15} />
              {dayLabel(form.birthday)}
            </p>
          )}
          {form.location && (
            <p className="profile-detail">
              <MapPin size={15} />
              {form.location}
            </p>
          )}
          <div className="profile-stats">
            <div>
              <Image size={17} />
              <strong>
                {items.filter((item) => item.kind === "image").length}
              </strong>
              <span>Ảnh</span>
            </div>
            <div>
              <Video size={17} />
              <strong>
                {items.filter((item) => item.kind === "video").length}
              </strong>
              <span>Video</span>
            </div>
            <div>
              <Star size={17} />
              <strong>{items.filter((item) => item.favorite).length}</strong>
              <span>Yêu thích</span>
            </div>
          </div>
          <p className="local-caption">
            <span className="status-dot" />
            Lưu trên máy
          </p>
        </aside>
        <form
          className="profile-form settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="profile-fields">
            <label className="field-label">
              Tên hiển thị
              <input
                value={form.displayName}
                maxLength={40}
                required
                autoComplete="off"
                onChange={(event) => patch({ displayName: event.target.value })}
              />
            </label>
            <label className="field-label">
              Biệt danh
              <input
                value={form.nickname}
                maxLength={30}
                placeholder="Tên bạn thường dùng"
                autoComplete="off"
                onChange={(event) => patch({ nickname: event.target.value })}
              />
            </label>
            <label className="field-label">
              Ngày sinh
              <input
                type="date"
                min="1900-01-01"
                max={localDayKey(new Date())}
                value={form.birthday}
                onChange={(event) => patch({ birthday: event.target.value })}
              />
            </label>
            <label className="field-label">
              Thành phố
              <input
                value={form.location}
                maxLength={80}
                autoComplete="off"
                placeholder="Thành phố hoặc quê quán"
                onChange={(event) => patch({ location: event.target.value })}
              />
            </label>
            <label className="field-label profile-bio-field">
              Giới thiệu
              <textarea
                aria-label="Giới thiệu"
                value={form.bio}
                maxLength={160}
                placeholder="Một vài điều về bạn…"
                onChange={(event) => patch({ bio: event.target.value })}
              />
              <small>{form.bio.length} / 160</small>
            </label>
          </div>
          <div className="profile-save">
            <button
              className="btn primary"
              type="submit"
              disabled={!changed || saving}
            >
              <Save size={17} />
              {saving ? "Đang lưu…" : "Lưu hồ sơ"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
