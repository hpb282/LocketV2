const DEFAULT_PROFILE = {
  displayName: "Bạn",
  nickname: "",
  birthday: "",
  bio: "",
  location: "",
  avatarId: null,
};
const TEXT_LIMITS = { displayName: 40, nickname: 30, bio: 160, location: 80 };
const UUID = /^[a-f0-9-]{36}$/;

function validBirthday(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1)
    return false;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function profileOf(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const profile = { ...DEFAULT_PROFILE };
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (typeof source[key] === "string")
      profile[key] = source[key].trim().slice(0, limit);
  }
  if (!profile.displayName) profile.displayName = DEFAULT_PROFILE.displayName;
  if (validBirthday(source.birthday)) profile.birthday = source.birthday;
  if (typeof source.avatarId === "string" && UUID.test(source.avatarId))
    profile.avatarId = source.avatarId;
  return profile;
}

function validateProfilePatch(patch, today = new Date()) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch))
    throw Error("Thông tin hồ sơ không hợp lệ.");
  const result = {};
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (patch[key] === undefined) continue;
    if (typeof patch[key] !== "string" || patch[key].trim().length > limit)
      throw Error(`Thông tin hồ sơ vượt quá ${limit} ký tự.`);
    result[key] = patch[key].trim();
  }
  if (result.displayName === "") throw Error("Hãy nhập tên hiển thị.");
  if (patch.birthday !== undefined) {
    if (patch.birthday !== "" && !validBirthday(patch.birthday))
      throw Error("Ngày sinh không hợp lệ.");
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (patch.birthday > todayKey)
      throw Error("Ngày sinh không thể nằm trong tương lai.");
    result.birthday = patch.birthday;
  }
  return result;
}

module.exports = { DEFAULT_PROFILE, profileOf, validateProfilePatch };
